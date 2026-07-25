"""
Production d'events Kafka du module audit.
Le format exact de chaque event est défini dans infra/kafka/events.md —
ne jamais modifier un schéma ici sans mettre à jour ce fichier de référence.
"""
from uuid import UUID

from app.core.kafka_client import publish_event


def emit_anonymity_lift_requested(
    demande_levee_id: UUID,
    sinistre_id: UUID,
    utilisateur_cible_id: UUID,
    groupe_id: UUID,
    demande_par_admin_id: UUID,
    justification_legale: str,
) -> None:
    """
    Produit l'event 'anonymity.lift.requested' (cf. infra/kafka/events.md §9).
    Consommateurs : Audit (trace), Utilisateurs/KYC (déchiffrement via KMS).
    """
    publish_event("anonymity.lift.requested", {
        "demande_levee_id": str(demande_levee_id),
        "sinistre_id": str(sinistre_id),
        "utilisateur_cible_id": str(utilisateur_cible_id),
        "groupe_id": str(groupe_id),
        "demande_par_admin_id": str(demande_par_admin_id),
        "justification_legale": justification_legale,
    })


def emit_anonymity_lift_approved(
    demande_levee_id: UUID,
    valide_par_agent_id: UUID,
    date_execution: str,
) -> None:
    """
    Produit l'event 'anonymity.lift.approved' (cf. infra/kafka/events.md §9).
    Consommateurs : Utilisateurs/KYC (Personne A), Audit (trace).
    """
    publish_event("anonymity.lift.approved", {
        "demande_levee_id": str(demande_levee_id),
        "valide_par_agent_id": str(valide_par_agent_id),
        "date_execution": date_execution,
    })
