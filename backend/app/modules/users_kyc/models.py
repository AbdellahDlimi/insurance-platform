import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, LargeBinary, ForeignKey, Boolean, Numeric

from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base

class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pseudonyme = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="membre")
    statut_compte = Column(String(50), nullable=False, default="actif")
    onboarding_complete = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    profil_onboarding = relationship("ProfilOnboarding", back_populates="utilisateur", uselist=False)


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


class ProfilOnboarding(Base):
    __tablename__ = "profil_onboarding"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), unique=True, nullable=False)
    tranche_age = Column(String(20), nullable=False)
    situation_pro = Column(String(50), nullable=False)
    interets_assurance = Column(ARRAY(String), nullable=False)
    budget_max_mensuel = Column(Numeric(8, 2), nullable=False)
    niveau_risque = Column(String(20), nullable=False)
    region = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    utilisateur = relationship("Utilisateur", back_populates="profil_onboarding")