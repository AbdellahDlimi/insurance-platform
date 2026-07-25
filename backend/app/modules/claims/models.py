"""
Modèles ORM (SQLAlchemy) du module claims.
Correspond aux tables 'sinistre', 'piece_justificative' et 'alerte_fraude'
définies dans infra/init.sql.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Numeric, Integer, ForeignKey, DateTime, text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Sinistre(Base):
    __tablename__ = "sinistre"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    adhesion_id = Column(UUID(as_uuid=True), ForeignKey("adhesion.id"), nullable=False)
    groupe_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    description = Column(Text, nullable=False)
    montant_declare = Column(Numeric(12, 2), nullable=False)
    montant_approuve = Column(Numeric(12, 2), nullable=True)
    statut = Column(String(50), nullable=False, default="en_attente")
    score_fraude = Column(Numeric(5, 4), nullable=True)
    resume_ia = Column(Text, nullable=True)
    date_declaration = Column(
        DateTime(timezone=True), nullable=False,
        server_default=text("now()")
    )
    traite_par_admin_id = Column(
        UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=True
    )

    # Relations
    pieces_justificatives = relationship("PieceJustificative", back_populates="sinistre")
    alertes_fraude = relationship("AlerteFraude", back_populates="sinistre")


class PieceJustificative(Base):
    __tablename__ = "piece_justificative"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sinistre_id = Column(UUID(as_uuid=True), ForeignKey("sinistre.id"), nullable=False)
    s3_url = Column(Text, nullable=False)
    type_fichier = Column(String(50), nullable=True)
    texte_ocr = Column(Text, nullable=True)

    # Relations
    sinistre = relationship("Sinistre", back_populates="pieces_justificatives")


class AlerteFraude(Base):
    __tablename__ = "alerte_fraude"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sinistre_id = Column(UUID(as_uuid=True), ForeignKey("sinistre.id"), nullable=False)
    score = Column(Numeric(5, 4), nullable=False)
    niveau_severite = Column(String(20), nullable=False)
    explication_ia = Column(Text, nullable=True)
    statut_traitement = Column(String(50), nullable=False, default="ouverte")
    created_at = Column(
        DateTime(timezone=True), nullable=False,
        server_default=text("now()")
    )

    # Relations
    sinistre = relationship("Sinistre", back_populates="alertes_fraude")
