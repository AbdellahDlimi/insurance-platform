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


def handle_event(event_type: str, payload: dict) -> None:
    """
    Traite un event Kafka entrant : résout l'utilisateur cible,
    formate le contenu, et crée la notification en base.
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
