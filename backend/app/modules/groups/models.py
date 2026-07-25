import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Numeric, Boolean, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class Groupe(Base):
    __tablename__ = "groupe"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String(150), nullable=False)
    specialite = Column(String(100), nullable=False)
    est_ouvert = Column(Boolean, nullable=False, default=True)
    capacite_max = Column(Integer, nullable=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False)
    cotisation_de_base = Column(Numeric(12, 2), nullable=False)
    buffer_pool_cible = Column(Numeric(12, 2), nullable=True)
    reglement_pdf_url = Column(String, nullable=True)


class DemandeAdhesion(Base):
    __tablename__ = "demande_adhesion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False)
    groupe_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    score_compatibilite = Column(Numeric(5, 4), nullable=True)
    statut = Column(String(50), nullable=False, default="en_attente")  # en_attente / acceptee / refusee
    date_demande = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class Adhesion(Base):
    __tablename__ = "adhesion"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False)
    groupe_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    statut = Column(String(50), nullable=False, default="active")
    coefficient_actuel = Column(Numeric(5, 4), nullable=False, default=1.0)
    nb_sinistres_periode = Column(Integer, nullable=False, default=0)
    date_adhesion = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("utilisateur_id", "groupe_id", name="adhesion_utilisateur_id_groupe_id_key"),
    )
