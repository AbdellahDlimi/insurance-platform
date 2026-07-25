"""
Consommateur Kafka global du module notifications.
Écoute TOUS les topics pertinents et crée les notifications en base.
Le format exact de chaque event est défini dans infra/kafka/events.md.

Ce consommateur sera lancé dans un thread séparé ou un worker dédié
(pas dans le process FastAPI principal).
"""
import json
import logging
from typing import Callable

from kafka import KafkaConsumer

from app.core.database import SessionLocal
from app.modules.notifications.models import Notification
from app.modules.notifications.pdf_generator import generate_sinistre_pdf
from app.modules.notifications.email_service import (
    send_email_with_pdf,
    build_claim_email_body,
)

logger = logging.getLogger(__name__)

# Topics que le module notifications écoute
SUBSCRIBED_TOPICS = [
    "user.kyc_verified",
    "adhesion.requested",
    "adhesion.validated",
    "cotisation.recalculated",
    "claim.created",
    "claim.validated",
    "claim.rejected",
    "fraud.alert.raised",
    "anonymity.lift.requested",
    "anonymity.lift.approved",
]

# Mapping event_type → (type_notification, template_contenu)
# Le template utilise les clés du payload de l'event
EVENT_TEMPLATES: dict[str, tuple[str, str]] = {
    "user.kyc_verified": (
        "kyc",
        "Votre vérification d'identité a été validée.",
    ),
    "adhesion.requested": (
        "adhesion",
        "Nouvelle demande d'adhésion à votre groupe.",
    ),
    "adhesion.validated": (
        "adhesion",
        "Votre demande d'adhésion a été traitée (statut : {statut}).",
    ),
    "cotisation.recalculated": (
        "cotisation",
        "Votre cotisation a été recalculée : {montant_final} € (période {periode}).",
    ),
    "claim.created": (
        "sinistre",
        "Nouveau sinistre déclaré (montant : {montant_declare} €).",
    ),
    "claim.validated": (
        "sinistre",
        "Sinistre validé — montant approuvé : {montant_approuve} €.",
    ),
    "claim.rejected": (
        "sinistre",
        "Sinistre rejeté — motif : {motif}.",
    ),
    "fraud.alert.raised": (
        "fraude",
        "Alerte fraude détectée (sévérité : {niveau_severite}, score : {score}).",
    ),
    "anonymity.lift.requested": (
        "anonymat",
        "Demande de levée d'anonymat en cours de traitement.",
    ),
    "anonymity.lift.approved": (
        "anonymat",
        "Levée d'anonymat approuvée.",
    ),
}


def _resolve_target_user(event_type: str, payload: dict) -> str | None:
    """
    Détermine l'utilisateur cible de la notification à partir du payload.
    Retourne l'utilisateur_id (str) ou None si non applicable.
    """
    return payload.get("utilisateur_id") or payload.get("utilisateur_cible_id")


def _create_notification(utilisateur_id: str, type_: str, contenu: str) -> None:
    """Crée une notification en base via une session dédiée."""
    session = SessionLocal()
    try:
        notif = Notification(
            utilisateur_id=utilisateur_id,
            type=type_,
            contenu=contenu,
        )
        session.add(notif)
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Erreur lors de la création de la notification")
    finally:
        session.close()


def _enrich_payload(payload: dict) -> dict:
    """
    Enrichit le payload Kafka avec des informations lisibles (noms au lieu des UUIDs).
    Interroge la base de données pour résoudre :
      - nom_groupe  (depuis la table 'groupe')
      - nom_emetteur (depuis la table 'utilisateur')

    ⚠️ À adapter si les colonnes de vos tables diffèrent.
    """
    enriched = dict(payload)  # copie pour ne pas modifier l'original

    groupe_id = payload.get("groupe_id")
    utilisateur_id = payload.get("utilisateur_id")

    session = SessionLocal()
    try:
        # ── Nom du groupe ──
        if groupe_id:
            try:
                result = session.execute(
                    text("SELECT nom FROM groupe WHERE id = :id"),
                    {"id": groupe_id},
                )
                row = result.fetchone()
                enriched["nom_groupe"] = row[0] if row else f"Groupe ({str(groupe_id)[:8]}...)"
            except Exception:
                logger.warning("Table 'groupe' non accessible — utilisation de l'ID comme fallback")
                enriched["nom_groupe"] = f"Groupe ({str(groupe_id)[:8]}...)"

        # ── Nom de l'émetteur ──
        if utilisateur_id:
            try:
                result = session.execute(
                    text("SELECT nom, prenom FROM utilisateur WHERE id = :id"),
                    {"id": utilisateur_id},
                )
                row = result.fetchone()
                if row:
                    enriched["nom_emetteur"] = f"{row[1]} {row[0]}"  # Prénom Nom
                else:
                    enriched["nom_emetteur"] = f"Membre ({str(utilisateur_id)[:8]}...)"
            except Exception:
                logger.warning("Table 'utilisateur' non accessible — utilisation de l'ID comme fallback")
                enriched["nom_emetteur"] = f"Membre ({str(utilisateur_id)[:8]}...)"

    finally:
        session.close()

    return enriched


def _handle_claim_created_email(payload: dict) -> None:
    """
    Génère un PDF de déclaration de sinistre et l'envoie par email
    à l'administrateur du groupe.

    Étapes :
    1. Enrichir le payload avec les noms (groupe, émetteur)
    2. Résoudre l'email de l'admin du groupe
    3. Générer le PDF
    4. Envoyer l'email avec le PDF en pièce jointe
    """
    # 1. Enrichir le payload avec les noms lisibles
    enriched = _enrich_payload(payload)

    # 2. Résoudre l'email de l'admin du groupe
    admin_email = _resolve_admin_email(payload.get("groupe_id"))
    if not admin_email:
        logger.warning(
            "Impossible de résoudre l'email de l'admin pour le groupe %s — "
            "email non envoyé.",
            payload.get("groupe_id"),
        )
        return

    # 3. Générer le PDF avec les données enrichies
    try:
        pdf_bytes = generate_sinistre_pdf(enriched)
    except Exception:
        logger.exception("Erreur lors de la génération du PDF pour le sinistre %s",
                         payload.get("sinistre_id"))
        return

    # 4. Construire et envoyer l'email
    sinistre_id = payload.get("sinistre_id", "N/A")
    subject = f"Nouveau sinistre declare - Ref. SIN-{sinistre_id[:8].upper()}"
    body_html = build_claim_email_body(enriched)

    send_email_with_pdf(
        to_email=admin_email,
        subject=subject,
        body_html=body_html,
        pdf_bytes=pdf_bytes,
        pdf_filename=f"sinistre_SIN-{sinistre_id[:8].upper()}.pdf",
    )


def _resolve_admin_email(groupe_id: str | None) -> str | None:
    """
    Récupère l'email de l'administrateur du groupe depuis la base de données.

    TODO: Adapter cette requête à votre modèle de données exact.
    Pour l'instant, on cherche dans la table 'utilisateur' via 'adhesion'
    l'utilisateur qui a le rôle 'admin_groupe' dans ce groupe.
    """
    if not groupe_id:
        return None

    session = SessionLocal()
    try:
        # Requête pour trouver l'admin du groupe
        # ⚠️ À adapter selon votre schéma exact de tables
        result = session.execute(
            text("""
            SELECT u.email
            FROM utilisateur u
            JOIN adhesion a ON a.utilisateur_id = u.id
            WHERE a.groupe_id = :groupe_id
              AND a.role = 'admin_groupe'
              AND a.statut = 'active'
            LIMIT 1
            """),
            {"groupe_id": groupe_id},
        )
        row = result.fetchone()
        return row[0] if row else None
    except Exception:
        logger.exception("Erreur lors de la résolution de l'email admin pour le groupe %s",
                         groupe_id)
        return None
    finally:
        session.close()


def handle_event(event_type: str, payload: dict) -> None:
    """
    Traite un event Kafka entrant : résout l'utilisateur cible,
    formate le contenu, et crée la notification en base.
    Si l'event est 'claim.created', génère aussi un PDF et l'envoie par email.
    """
    template = EVENT_TEMPLATES.get(event_type)
    if not template:
        logger.warning("Event type inconnu pour les notifications : %s", event_type)
        return

    user_id = _resolve_target_user(event_type, payload)
    if not user_id:
        logger.warning("Pas d'utilisateur cible pour l'event : %s", event_type)
        return

    type_notif, contenu_template = template
    try:
        contenu = contenu_template.format(**payload)
    except KeyError:
        contenu = contenu_template  # fallback si le template ne matche pas

    _create_notification(user_id, type_notif, contenu)
    logger.info("Notification créée : type=%s, user=%s", type_notif, user_id)

    # ── Email + PDF pour les sinistres créés ─────────────────────────────
    if event_type == "claim.created":
        try:
            _handle_claim_created_email(payload)
        except Exception:
            logger.exception(
                "Erreur lors de l'envoi de l'email pour le sinistre %s",
                payload.get("sinistre_id"),
            )


def start_consumer(
    bootstrap_servers: str = "localhost:9094",
    group_id: str = "notifications-consumer",
) -> None:
    """
    Lance le consommateur Kafka qui écoute tous les topics.
    ⚠️ Bloquant — à exécuter dans un thread séparé ou un worker dédié.
    """
    consumer = KafkaConsumer(
        *SUBSCRIBED_TOPICS,
        bootstrap_servers=bootstrap_servers,
        group_id=group_id,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="latest",
        enable_auto_commit=True,
    )

    logger.info("Consommateur Notifications démarré sur %s topics", len(SUBSCRIBED_TOPICS))

    for message in consumer:
        try:
            envelope = message.value
            event_type = envelope.get("event_type", "")
            payload = envelope.get("payload", {})
            handle_event(event_type, payload)
        except Exception:
            logger.exception("Erreur lors du traitement du message Kafka")
