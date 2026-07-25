"""
Accès aux données du module users_kyc (SQLAlchemy).
Aucune logique métier ici — uniquement des opérations CRUD.
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.modules.users_kyc.models import Utilisateur, CoffreKYC


def get_user_by_email(db: Session, email: str) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.email == email).first()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()


def create_user(
    db: Session, email: str, mot_de_passe_hash: str, pseudonyme: str
) -> Utilisateur:
    user = Utilisateur(
        email=email,
        mot_de_passe_hash=mot_de_passe_hash,
        pseudonyme=pseudonyme,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_coffre_kyc(
    db: Session,
    utilisateur_id: uuid.UUID,
    donnees_chiffrees: bytes,
    ref_cle_kms: str,
    fournisseur_api: str,
    statut_verification: str = "pending"
) -> CoffreKYC:
    # Delete existing KYC record if any to maintain 1-1 relationship
    db.query(CoffreKYC).filter(CoffreKYC.utilisateur_id == utilisateur_id).delete()
    
    coffre = CoffreKYC(
        utilisateur_id=utilisateur_id,
        donnees_chiffrees=donnees_chiffrees,
        ref_cle_kms=ref_cle_kms,
        fournisseur_api=fournisseur_api,
        statut_verification=statut_verification,
    )
    db.add(coffre)
    db.commit()
    db.refresh(coffre)
    return coffre


def get_kyc_by_user_id(db: Session, utilisateur_id: uuid.UUID) -> CoffreKYC | None:
    return db.query(CoffreKYC).filter(CoffreKYC.utilisateur_id == utilisateur_id).first()


def get_kyc_by_id(db: Session, kyc_id: uuid.UUID) -> CoffreKYC | None:
    return db.query(CoffreKYC).filter(CoffreKYC.id == kyc_id).first()


def update_kyc_status(
    db: Session,
    utilisateur_id: uuid.UUID,
    statut_verification: str,
    verifie_le: datetime | None = None,
    verifie_par_agent_id: uuid.UUID | None = None
) -> CoffreKYC | None:
    coffre = get_kyc_by_user_id(db, utilisateur_id)
    if coffre:
        coffre.statut_verification = statut_verification
        coffre.verifie_le = verifie_le
        coffre.verifie_par_agent_id = verifie_par_agent_id
        db.commit()
        db.refresh(coffre)
    return coffre