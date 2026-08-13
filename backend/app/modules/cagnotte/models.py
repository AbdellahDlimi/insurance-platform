import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class Cagnotte(Base):
    __tablename__ = "cagnotte"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    groupe_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), unique=True, nullable=False)
    solde_actuel = Column(Numeric(14, 2), nullable=False, default=0.00)
    solde_buffer_pool = Column(Numeric(14, 2), nullable=False, default=0.00)
    periode_courante = Column(String(20), nullable=False)  # ex: "2026-07"


class Cotisation(Base):
    __tablename__ = "cotisation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    adhesion_id = Column(UUID(as_uuid=True), ForeignKey("adhesion.id"), nullable=False)
    cagnotte_id = Column(UUID(as_uuid=True), ForeignKey("cagnotte.id"), nullable=False)
    montant_base = Column(Numeric(12, 2), nullable=False)
    coefficient_applique = Column(Numeric(5, 4), nullable=False)
    montant_final = Column(Numeric(12, 2), nullable=False)
    statut_paiement = Column(String(50), nullable=False, default="en_attente")  # en_attente / paye
    paye_le = Column(DateTime(timezone=True), nullable=True)
    periode = Column(String(20), nullable=True)
