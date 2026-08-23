"""
Accès aux données du module users_kyc (SQLAlchemy).
Aucune logique métier ici — uniquement des opérations CRUD.
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.modules.users_kyc.models import (
    Utilisateur,
    CoffreKYC,
    EquipeConformite,
    PendingRegistration,
    PasswordResetToken,
)


def get_user_by_email(db: Session, email: str) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()


def get_agent_by_email(db: Session, email: str) -> EquipeConformite | None:
    return db.query(EquipeConformite).filter(EquipeConformite.email == email.strip().lower()).first()


def get_agent_by_id(db: Session, agent_id: uuid.UUID) -> EquipeConformite | None:
    return db.query(EquipeConformite).filter(EquipeConformite.id == agent_id).first()


def get_pending_registration(db: Session, email: str) -> PendingRegistration | None:
    return db.query(PendingRegistration).filter(PendingRegistration.email == email.strip().lower()).first()


def create_or_update_pending_registration(
    db: Session, email: str, mot_de_passe_hash: str, pseudonyme: str, code_hash: str, expires_at: datetime
) -> PendingRegistration:
    clean_email = email.strip().lower()
    pending = get_pending_registration(db, clean_email)
    if pending:
        pending.mot_de_passe_hash = mot_de_passe_hash
        pending.pseudonyme = pseudonyme
        pending.code_verification_hash = code_hash
        pending.date_expiration = expires_at
    else:
        pending = PendingRegistration(
            email=clean_email,
            mot_de_passe_hash=mot_de_passe_hash,
            pseudonyme=pseudonyme,
            code_verification_hash=code_hash,
            date_expiration=expires_at,
        )
        db.add(pending)
    db.commit()
    db.refresh(pending)
    return pending


def delete_pending_registration(db: Session, email: str) -> None:
    clean_email = email.strip().lower()
    db.query(PendingRegistration).filter(PendingRegistration.email == clean_email).delete()
    db.commit()


def cleanup_expired_pending_registrations(db: Session, now: datetime) -> int:
    deleted = db.query(PendingRegistration).filter(PendingRegistration.date_expiration < now).delete()
    db.commit()
    return deleted


def create_user(
    db: Session, email: str, mot_de_passe_hash: str, pseudonyme: str, email_confirme: bool = True
) -> Utilisateur:
    user = Utilisateur(
        email=email.strip().lower(),
        mot_de_passe_hash=mot_de_passe_hash,
        pseudonyme=pseudonyme,
        email_confirme=email_confirme,
        statut_compte="actif",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_user_confirmation_code(db: Session, user: Utilisateur, code: str) -> Utilisateur:
    user.token_confirmation_email = code
    db.commit()
    db.refresh(user)
    return user


def get_user_by_confirmation_token(db: Session, token: str) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.token_confirmation_email == token).first()


def confirm_user_email(db: Session, user: Utilisateur) -> Utilisateur:
    user.email_confirme = True
    user.token_confirmation_email = None
    db.commit()
    db.refresh(user)
    return user




def create_coffre_kyc(
    db: Session,
    utilisateur_id: uuid.UUID,
    donnees_chiffrees: bytes,
    ref_cle_kms: str,
    fournisseur_api: str,
    statut_verification: str = "pending",
    document_url: str = None
) -> CoffreKYC:
    # Delete existing KYC record if any to maintain 1-1 relationship
    db.query(CoffreKYC).filter(CoffreKYC.utilisateur_id == utilisateur_id).delete()
    
    coffre = CoffreKYC(
        utilisateur_id=utilisateur_id,
        donnees_chiffrees=donnees_chiffrees,
        ref_cle_kms=ref_cle_kms,
        fournisseur_api=fournisseur_api,
        statut_verification=statut_verification,
        document_url=document_url
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
    verifie_par_agent_id: uuid.UUID | None = None,
    commentaire_review: str | None = None
) -> CoffreKYC | None:
    coffre = get_kyc_by_user_id(db, utilisateur_id)
    if coffre:
        coffre.statut_verification = statut_verification
        coffre.verifie_le = verifie_le
        coffre.verifie_par_agent_id = verifie_par_agent_id
        coffre.commentaire_review = commentaire_review
        db.commit()
        db.refresh(coffre)
    return coffre


def get_all_pending_kyc(db: Session) -> list[CoffreKYC]:
    return db.query(CoffreKYC).filter(CoffreKYC.statut_verification == "pending").all()


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
        region=data.get("region"),
        situation_familiale=data.get("situation_familiale"),
        nombre_personnes_a_charge=data.get("nombre_personnes_a_charge"),
        couverture_existante=data.get("couverture_existante", []),
        priorite_assurance=data.get("priorite_assurance")
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


def create_password_reset_token(
    db: Session,
    utilisateur_id: uuid.UUID,
    token_hash: str,
    date_expiration: datetime,
) -> PasswordResetToken:
    from app.modules.users_kyc.models import PasswordResetToken
    # Invalider d'abord tous les tokens actifs existants pour cet utilisateur
    db.query(PasswordResetToken).filter(
        PasswordResetToken.utilisateur_id == utilisateur_id,
        PasswordResetToken.utilise == False,
    ).update({"utilise": True})
    
    reset_entry = PasswordResetToken(
        utilisateur_id=utilisateur_id,
        token_hash=token_hash,
        date_expiration=date_expiration,
        utilise=False,
    )
    db.add(reset_entry)
    db.commit()
    db.refresh(reset_entry)
    return reset_entry


def get_active_reset_tokens(db: Session) -> list[PasswordResetToken]:
    from app.modules.users_kyc.models import PasswordResetToken
    return db.query(PasswordResetToken).filter(
        PasswordResetToken.utilise == False,
    ).all()


def mark_reset_token_as_used(db: Session, token_id: uuid.UUID) -> None:
    from app.modules.users_kyc.models import PasswordResetToken
    token_record = db.query(PasswordResetToken).filter(PasswordResetToken.id == token_id).first()
    if token_record:
        token_record.utilise = True
        db.commit()


def update_user_password(db: Session, user_id: uuid.UUID, new_password_hash: str) -> Utilisateur | None:
    user = get_user_by_id(db, user_id)
    if user:
        user.mot_de_passe_hash = new_password_hash
        db.commit()
        db.refresh(user)
    return user