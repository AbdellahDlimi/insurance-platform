"""
Accès aux données du module audit (SQLAlchemy).
Aucune logique métier ici, uniquement des requêtes.
"""
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.audit.models import JournalAudit, DemandeLeveeAnonymat


# ── Journal d'audit ──────────────────────────────────────────────────────────

def create_audit_log(session: Session, **kwargs) -> JournalAudit:
    """Insère une nouvelle entrée dans le journal d'audit."""
    entry = JournalAudit(**kwargs)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def list_audit_logs(
    session: Session,
    cible_type: Optional[str] = None,
    cible_id: Optional[UUID] = None,
    limit: int = 50,
) -> list[JournalAudit]:
    """Liste les entrées d'audit avec filtres optionnels."""
    query = session.query(JournalAudit)
    if cible_type:
        query = query.filter(JournalAudit.cible_type == cible_type)
    if cible_id:
        query = query.filter(JournalAudit.cible_id == cible_id)
    return query.order_by(JournalAudit.created_at.desc()).limit(limit).all()


# ── Demandes de levée d'anonymat ─────────────────────────────────────────────

def create_demande_levee(session: Session, **kwargs) -> DemandeLeveeAnonymat:
    """Insère une nouvelle demande de levée d'anonymat."""
    demande = DemandeLeveeAnonymat(**kwargs)
    session.add(demande)
    session.commit()
    session.refresh(demande)
    return demande


def get_demande_levee_by_id(
    session: Session, demande_id: UUID
) -> Optional[DemandeLeveeAnonymat]:
    """Récupère une demande par son ID."""
    return (
        session.query(DemandeLeveeAnonymat)
        .filter(DemandeLeveeAnonymat.id == demande_id)
        .first()
    )


def update_demande_levee(
    session: Session, demande: DemandeLeveeAnonymat, **kwargs
) -> DemandeLeveeAnonymat:
    """Met à jour une demande de levée d'anonymat."""
    for key, value in kwargs.items():
        setattr(demande, key, value)
    session.commit()
    session.refresh(demande)
    return demande
