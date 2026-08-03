"""
Modèles ORM (SQLAlchemy) du module audit.
Correspond aux tables 'journal_audit' et 'demande_levee_anonymat'
définies dans infra/init.sql.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.core.database import Base


class JournalAudit(Base):
    __tablename__ = "journal_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # acteur_id et cible_id sont volontairement SANS FK stricte
    # car ils sont polymorphiques (cf. init.sql commentaire)
    acteur_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(100), nullable=False)
    cible_type = Column(String(50), nullable=False)
    cible_id = Column(UUID(as_uuid=True), nullable=False)
    details = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False,
        server_default=text("now()")
    )


class DemandeLeveeAnonymat(Base):
    __tablename__ = "demande_levee_anonymat"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sinistre_id = Column(UUID(as_uuid=True), ForeignKey("sinistre.id"), nullable=False)
    utilisateur_cible_id = Column(
        UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False
    )
    groupe_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    demande_par_admin_id = Column(
        UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False
    )
    justification_legale = Column(Text, nullable=False)
    statut = Column(String(50), nullable=False, default="en_attente")
    valide_par_agent_id = Column(
        UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=True
    )
    date_execution = Column(DateTime(timezone=True), nullable=True)
