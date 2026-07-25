import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, LargeBinary, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base

class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pseudonyme = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="membre")
    statut_compte = Column(String(50), nullable=False, default="actif")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class CoffreKYC(Base):
    __tablename__ = "coffre_kyc"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), unique=True, nullable=False)
    donnees_chiffrees = Column(LargeBinary, nullable=False)
    ref_cle_kms = Column(String(255), nullable=False)
    statut_verification = Column(String(50), nullable=False, default="pending")
    fournisseur_api = Column(String(50), nullable=True)
    verifie_par_agent_id = Column(UUID(as_uuid=True), nullable=True)  # FK to equipe_conformite
    verifie_le = Column(DateTime(timezone=True), nullable=True)