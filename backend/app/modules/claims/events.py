"""
Production d'events Kafka du module claims.
Le format exact de chaque event est défini dans infra/kafka/events.md —
ne jamais modifier un schéma ici sans mettre à jour ce fichier de référence.
"""
from decimal import Decimal
from uuid import UUID

from app.core.kafka_client import publish_event


def emit_claim_created(
    sinistre_id: UUID,
    adhesion_id: UUID,
    groupe_id: UUID,
    utilisateur_id: UUID,
    montant_declare: Decimal,
    description: str,
) -> None:
    """
    Produit l'event 'claim.created' (cf. infra/kafka/events.md §5).
    Consommateurs : Chien de Garde, Analyseur de preuves, Analyse réseau.
    """
    publish_event("claim.created", {
        "sinistre_id": str(sinistre_id),
        "adhesion_id": str(adhesion_id),
        "groupe_id": str(groupe_id),
        "utilisateur_id": str(utilisateur_id),
        "montant_declare": float(montant_declare),
        "description": description,
    })


def emit_claim_validated(
    sinistre_id: UUID,
    adhesion_id: UUID,
    groupe_id: UUID,
    utilisateur_id: UUID,
    valide_par_admin_id: UUID,
    montant_declare: Decimal,
    montant_approuve: Decimal,
    score_fraude: Decimal | None,
) -> None:
    """
    Produit l'event 'claim.validated' (cf. infra/kafka/events.md §7).
    ⚠️ Event le plus critique : point d'intégration A ↔ B.
    Consommateurs : Cagnotte/Bonus-Malus (Personne A), Notifications.
    """
    publish_event("claim.validated", {
        "sinistre_id": str(sinistre_id),
        "adhesion_id": str(adhesion_id),
        "groupe_id": str(groupe_id),
        "utilisateur_id": str(utilisateur_id),
        "valide_par_admin_id": str(valide_par_admin_id),
        "montant_declare": float(montant_declare),
        "montant_approuve": float(montant_approuve),
        "score_fraude_a_la_decision": float(score_fraude) if score_fraude else None,
    })


def emit_claim_rejected(
    sinistre_id: UUID,
    adhesion_id: UUID,
    groupe_id: UUID,
    utilisateur_id: UUID,
    rejete_par_admin_id: UUID,
    motif: str,
) -> None:
    """
    Produit l'event 'claim.rejected' (cf. infra/kafka/events.md §8).
    Consommateurs : Notifications.
    """
    publish_event("claim.rejected", {
        "sinistre_id": str(sinistre_id),
        "adhesion_id": str(adhesion_id),
        "groupe_id": str(groupe_id),
        "utilisateur_id": str(utilisateur_id),
        "rejete_par_admin_id": str(rejete_par_admin_id),
        "motif": motif,
    })
