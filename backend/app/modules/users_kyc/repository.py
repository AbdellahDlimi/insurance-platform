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


def create_profil_onboarding(
    db: Session, user_id: uuid.UUID, data: dict
) -> "ProfilOnboarding":
    from app.modules.users_kyc.models import ProfilOnboarding
    # Delete existing if any
    db.query(ProfilOnboarding).filter(ProfilOnboarding.utilisateur_id == user_id).delete()
    
    profil = ProfilOnboarding(
        utilisateur_id=user_id,
        tranche_age=data["tranche_age"],
        situation_pro=data["situation_pro"],
        interets_assurance=data["interets_assurance"],
        budget_max_mensuel=data["budget_max_mensuel"],
        niveau_risque=data["niveau_risque"],
        region=data.get("region")
    )
    db.add(profil)
    db.commit()
    db.refresh(profil)
    return profil

def get_profil_onboarding(db: Session, user_id: uuid.UUID) -> "ProfilOnboarding | None":
    from app.modules.users_kyc.models import ProfilOnboarding
    return db.query(ProfilOnboarding).filter(ProfilOnboarding.utilisateur_id == user_id).first()

def update_user_onboarding_status(db: Session, user_id: uuid.UUID, complete: bool = True):
    user = get_user_by_id(db, user_id)
    if user:
        user.onboarding_complete = complete
        db.commit()
        db.refresh(user)
    return user


def update_user_profile(db: Session, user_id: uuid.UUID, data: dict) -> Utilisateur:
    """Met à jour les champs modifiables du profil utilisateur."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    if data.get('pseudonyme') and data['pseudonyme'] != user.pseudonyme:
        # Vérifier l'unicité du pseudonyme
        existing = db.query(Utilisateur).filter(
            Utilisateur.pseudonyme == data['pseudonyme'],
            Utilisateur.id != user_id,
        ).first()
        if existing:
            return 'taken'  # signal d'erreur
        user.pseudonyme = data['pseudonyme']
    db.commit()
    db.refresh(user)
    return user