"""
Logique métier du module audit.
Orchestre les appels au repository, à Kafka (events.py), et au KMS.
"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.modules.audit import repository, events
from app.modules.audit.schemas import LeveeAnonymatCreate
from app.modules.audit.models import JournalAudit, DemandeLeveeAnonymat


def log_action(
    session: Session,
    acteur_id: UUID,
    action: str,
    cible_type: str,
    cible_id: UUID,
    details: Optional[dict[str, Any]] = None,
) -> JournalAudit:
    """Enregistre une action dans le journal d'audit."""
    return repository.create_audit_log(
        session,
        acteur_id=acteur_id,
        action=action,
        cible_type=cible_type,
        cible_id=cible_id,
        details=details,
    )


def get_audit_logs(
    session: Session,
    cible_type: Optional[str] = None,
    cible_id: Optional[UUID] = None,
    limit: int = 50,
) -> list[JournalAudit]:
    """Récupère les entrées du journal d'audit avec filtres."""
    return repository.list_audit_logs(session, cible_type, cible_id, limit)


def demander_levee_anonymat(
    session: Session,
    data: LeveeAnonymatCreate,
    admin_id: UUID,
) -> DemandeLeveeAnonymat:
    """
    Crée une demande de levée d'anonymat :
    1. Insère en base (statut = en_attente)
    2. Émet l'event Kafka 'anonymity.lift.requested'
    3. Enregistre l'action dans le journal d'audit
    """
    demande = repository.create_demande_levee(
        session,
        sinistre_id=data.sinistre_id,
        utilisateur_cible_id=data.utilisateur_cible_id,
        groupe_id=data.groupe_id,
        demande_par_admin_id=admin_id,
        justification_legale=data.justification_legale,
    )

    events.emit_anonymity_lift_requested(
        demande_levee_id=demande.id,
        sinistre_id=demande.sinistre_id,
        utilisateur_cible_id=demande.utilisateur_cible_id,
        groupe_id=demande.groupe_id,
        demande_par_admin_id=admin_id,
        justification_legale=demande.justification_legale,
    )

    log_action(
        session,
        acteur_id=admin_id,
        action="demande_levee_anonymat",
        cible_type="DemandeLeveeAnonymat",
        cible_id=demande.id,
    )

    return demande


def approuver_levee_anonymat(
    session: Session,
    demande: DemandeLeveeAnonymat,
    agent_id: UUID,
) -> DemandeLeveeAnonymat:
    """
    Approuve une demande de levée d'anonymat (équipe conformité) :
    1. Met à jour le statut
    2. Émet l'event 'anonymity.lift.approved'
    3. Trace dans le journal d'audit
    """
    now = datetime.now(timezone.utc)

    demande = repository.update_demande_levee(
        session,
        demande,
        statut="approuvee",
        valide_par_agent_id=agent_id,
        date_execution=now,
    )

    events.emit_anonymity_lift_approved(
        demande_levee_id=demande.id,
        valide_par_agent_id=agent_id,
        date_execution=now.isoformat(),
    )

    log_action(
        session,
        acteur_id=agent_id,
        action="approbation_levee_anonymat",
        cible_type="DemandeLeveeAnonymat",
        cible_id=demande.id,
    )

    return demande
