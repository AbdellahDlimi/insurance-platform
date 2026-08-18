"""
Logique métier du module claims.
Orchestre les appels au repository, à Kafka (events.py), et aux autres modules.
"""
from uuid import UUID

from sqlalchemy.orm import Session

import os
from app.modules.claims import repository, events
from app.modules.claims.schemas import ClaimCreate, ClaimValidate, ClaimReject
from app.modules.claims.models import Sinistre


def declare_sinistre(
    session: Session,
    data: ClaimCreate,
    utilisateur_id: UUID,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    content_type: str | None = None,
) -> Sinistre:
    """
    Déclare un nouveau sinistre :
    1. Insère en base (statut = en_attente)
    2. Si un justificatif est fourni, exécute l'analyseur IA (OCR + Détection de fraude)
    3. Crée une alerte de fraude si nécessaire
    4. Crée une notification in-app pour l'utilisateur
    5. Émet l'event Kafka 'claim.created'
    """
    sinistre = repository.create_sinistre(
        session,
        adhesion_id=data.adhesion_id,
        groupe_id=data.groupe_id,
        description=data.description,
        montant_declare=data.montant_declare,
    )

    # Analyse IA et stockage de la pièce justificative si fournie
    if file_bytes and filename:
        try:
            from app.core import storage
            object_key = f"sinistres/{sinistre.id}/{filename}"
            saved_path = storage.upload_bytes(file_bytes, object_key, content_type=content_type)

            from app.ai.rag_analyseur_preuves.engine import analyser_preuve
            analysis = analyser_preuve(
                file_bytes=file_bytes,
                filename=filename,
                description=data.description,
                montant_declare=float(data.montant_declare),
            )

            # Enregistrer la pièce justificative avec la référence de stockage et le texte OCR extrait
            repository.create_piece_justificative(
                session,
                sinistre_id=sinistre.id,
                hdfs_url=saved_path,
                type_fichier=content_type or "application/pdf",
                texte_ocr=analysis.texte_extrait,
            )

            # Mettre à jour le sinistre avec le score IA et le résumé
            sinistre = repository.update_sinistre(
                session,
                sinistre,
                score_fraude=analysis.score_fraude,
                resume_ia=analysis.resume_ia,
            )

            # Déclencher une alerte fraude si suspect
            if analysis.is_fraud_suspected or analysis.score_fraude >= 0.25 or analysis.anomalies:
                repository.create_alerte_fraude(
                    session,
                    sinistre_id=sinistre.id,
                    score=analysis.score_fraude,
                    niveau_severite=analysis.niveau_severite,
                    explication_ia=analysis.explication_ia,
                )
        except Exception as e:
            print(f"[Claims AI Analysis Error] {e}")
    else:
        # Résumé par défaut pour déclaration sans fichier
        sinistre = repository.update_sinistre(
            session,
            sinistre,
            score_fraude=0.05,
            resume_ia=f"Sinistre déclaré de {data.montant_declare:.2f} €. Description: {data.description[:150]}.",
        )

    try:
        from app.modules.notifications.repository import create_notification
        create_notification(
            session,
            utilisateur_id=utilisateur_id,
            n_type="claim_submitted",
            contenu=f"Votre sinistre d'un montant de {sinistre.montant_declare} € a bien été enregistré et analysé par l'IA.",
        )
    except Exception as e:
        print(f"[Claims Notification Warning] {e}")

    events.emit_claim_created(
        sinistre_id=sinistre.id,
        adhesion_id=sinistre.adhesion_id,
        groupe_id=sinistre.groupe_id,
        utilisateur_id=utilisateur_id,
        montant_declare=sinistre.montant_declare,
        description=sinistre.description,
    )

    return sinistre



def get_sinistre(session: Session, sinistre_id: UUID) -> Sinistre | None:
    """Récupère un sinistre par son ID."""
    return repository.get_sinistre_by_id(session, sinistre_id)


def list_sinistres_groupe(session: Session, groupe_id: UUID) -> list[Sinistre]:
    """Liste les sinistres d'un groupe."""
    return repository.list_sinistres_by_groupe(session, groupe_id)


def list_sinistres_utilisateur(session: Session, utilisateur_id: UUID) -> list[Sinistre]:
    """Liste tous les sinistres d'un utilisateur (via ses adhésions)."""
    # On importe localement pour éviter les imports circulaires
    from app.modules.groups.repository import get_adhesions_by_user
    
    adhesions = get_adhesions_by_user(session, utilisateur_id)
    sinistres = []
    for adhesion in adhesions:
        sinistres.extend(repository.list_sinistres_by_adhesion(session, adhesion.id))
    
    # Trier par date de déclaration décroissante
    sinistres.sort(key=lambda s: s.date_declaration, reverse=True)
    return sinistres


def valider_sinistre(
    session: Session,
    sinistre: Sinistre,
    data: ClaimValidate,
    admin_id: UUID,
    utilisateur_id: UUID,
) -> Sinistre:
    """
    Valide un sinistre (décision admin) :
    1. Met à jour le statut et le montant approuvé
    2. Crée la notification in-app pour l'utilisateur
    3. Émet l'event Kafka 'claim.validated'
    """
    sinistre = repository.update_sinistre(
        session,
        sinistre,
        statut="validee",
        montant_approuve=data.montant_approuve,
        commentaire_validation=data.commentaire_validation,
        traite_par_admin_id=admin_id,
    )

    # Appliquer le malus (+0.20), incrémenter nb_sinistres et débiter la cagnotte
    try:
        from app.modules.cagnotte.service import process_claim_validated
        process_claim_validated(session, {
            "adhesion_id": str(sinistre.adhesion_id),
            "groupe_id": str(sinistre.groupe_id),
            "utilisateur_id": str(utilisateur_id),
            "montant_approuve": float(data.montant_approuve),
        })
    except Exception as e:
        print(f"[Claims Warning] Impossible d'appliquer le malus / cagnotte : {e}")

    try:
        from app.modules.notifications.repository import create_notification
        msg = f"Votre sinistre a été approuvé ! Montant accordé : {sinistre.montant_approuve} €."
        if data.commentaire_validation:
            msg += f" Note : {data.commentaire_validation}"
        create_notification(
            session,
            utilisateur_id=utilisateur_id,
            n_type="sinistre",
            contenu=msg,
        )
    except Exception as e:
        print(f"[Claims Notification Warning] {e}")

    events.emit_claim_validated(
        sinistre_id=sinistre.id,
        adhesion_id=sinistre.adhesion_id,
        groupe_id=sinistre.groupe_id,
        utilisateur_id=utilisateur_id,
        valide_par_admin_id=admin_id,
        montant_declare=sinistre.montant_declare,
        montant_approuve=sinistre.montant_approuve,
        score_fraude=sinistre.score_fraude,
    )

    return sinistre


def rejeter_sinistre(
    session: Session,
    sinistre: Sinistre,
    data: ClaimReject,
    admin_id: UUID,
    utilisateur_id: UUID,
) -> Sinistre:
    """
    Rejette un sinistre (décision admin) :
    1. Met à jour le statut
    2. Crée la notification in-app pour l'utilisateur
    3. Émet l'event Kafka 'claim.rejected'
    """
    sinistre = repository.update_sinistre(
        session,
        sinistre,
        statut="rejetee",
        motif_rejet=data.motif,
        traite_par_admin_id=admin_id,
    )

    try:
        from app.modules.notifications.repository import create_notification
        create_notification(
            session,
            utilisateur_id=utilisateur_id,
            n_type="sinistre",
            contenu=f"Votre sinistre a été refusé. Motif : {data.motif}",
        )
    except Exception as e:
        print(f"[Claims Notification Warning] {e}")

    events.emit_claim_rejected(
        sinistre_id=sinistre.id,
        adhesion_id=sinistre.adhesion_id,
        groupe_id=sinistre.groupe_id,
        utilisateur_id=utilisateur_id,
        rejete_par_admin_id=admin_id,
        motif=data.motif,
    )

    return sinistre
