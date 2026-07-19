"""
Logique métier du module claims.
Orchestre les appels au repository, à Kafka (events.py), et aux autres modules.
"""
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.claims import repository, events
from app.modules.claims.schemas import ClaimCreate, ClaimValidate, ClaimReject
from app.modules.claims.models import Sinistre


def declare_sinistre(
    session: Session,
    data: ClaimCreate,
    utilisateur_id: UUID,
) -> Sinistre:
    """
    Déclare un nouveau sinistre :
    1. Insère en base (statut = en_attente)
    2. Émet l'event Kafka 'claim.created'
    """
    sinistre = repository.create_sinistre(
        session,
        adhesion_id=data.adhesion_id,
        groupe_id=data.groupe_id,
        description=data.description,
        montant_declare=data.montant_declare,
    )

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
    2. Émet l'event Kafka 'claim.validated' (critique : déclenche le malus côté A)
    """
    sinistre = repository.update_sinistre(
        session,
        sinistre,
        statut="validee",
        montant_approuve=data.montant_approuve,
        traite_par_admin_id=admin_id,
    )

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
    2. Émet l'event Kafka 'claim.rejected'
    """
    sinistre = repository.update_sinistre(
        session,
        sinistre,
        statut="rejetee",
        traite_par_admin_id=admin_id,
    )

    events.emit_claim_rejected(
        sinistre_id=sinistre.id,
        adhesion_id=sinistre.adhesion_id,
        groupe_id=sinistre.groupe_id,
        utilisateur_id=utilisateur_id,
        rejete_par_admin_id=admin_id,
        motif=data.motif,
    )

    return sinistre
