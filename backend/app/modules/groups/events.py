import uuid
import logging
from app.core.kafka_client import publish_event

logger = logging.getLogger(__name__)

def produce_adhesion_requested(
    demande_adhesion_id: uuid.UUID,
    utilisateur_id: uuid.UUID,
    groupe_id: uuid.UUID,
    score_compatibilite: float
) -> None:
    """
    Publie l'événement adhesion.requested.
    """
    payload = {
        "demande_adhesion_id": str(demande_adhesion_id),
        "utilisateur_id": str(utilisateur_id),
        "groupe_id": str(groupe_id),
        "score_compatibilite": float(score_compatibilite),
    }
    publish_event("adhesion.requested", payload)
    logger.info(f"Événement adhesion.requested publié pour la demande {demande_adhesion_id}")


def produce_adhesion_validated(
    adhesion_id: uuid.UUID | None,
    utilisateur_id: uuid.UUID,
    groupe_id: uuid.UUID,
    valide_par_admin_id: uuid.UUID,
    statut: str
) -> None:
    """
    Publie l'événement adhesion.validated.
    Si le statut est "refusee", adhesion_id est None (ou absent/vide), mais l'enveloppe doit être respectée.
    """
    payload = {
        "adhesion_id": str(adhesion_id) if adhesion_id else "",
        "utilisateur_id": str(utilisateur_id),
        "groupe_id": str(groupe_id),
        "valide_par_admin_id": str(valide_par_admin_id),
        "statut": statut,  # acceptee | refusee
    }
    publish_event("adhesion.validated", payload)
    logger.info(f"Événement adhesion.validated publié pour l'utilisateur {utilisateur_id} (statut: {statut})")
