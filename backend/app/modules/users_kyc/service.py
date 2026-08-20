"""
Logique métier du module users_kyc.
Orchestre le repository (accès DB), core/auth.py et core/kms.py.
"""
import json
import secrets
import string
import threading
import uuid
import os
import shutil
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status, BackgroundTasks, UploadFile
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text
from email_validator import validate_email, EmailNotValidError

from app.core.auth import TokenPayload, create_access_token, create_refresh_token
from app.core.kms import encrypt, decrypt
from app.modules.users_kyc import repository
from app.modules.users_kyc.models import Utilisateur, CoffreKYC
from app.modules.users_kyc.schemas import UserCreate, UserLogin, TokenResponse, KYCSubmit, KYCStatusOut, RegisterResponse
from app.modules.users_kyc.events import produce_kyc_verified
from app.modules.notifications.service import NotificationService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _generer_pseudonyme(base_name: str) -> str:
    """
    Génère un pseudonyme en ajoutant un suffixe aléatoire pour éviter
    les doublons tout en gardant le nom choisi par l'utilisateur.
    """
    suffixe = "".join(secrets.choice(string.digits) for _ in range(4))
    clean_name = base_name.strip().replace(" ", "")
    return f"{clean_name}#{suffixe}"


def register_user(
    db: Session, 
    data: UserCreate, 
    notification_service: NotificationService,
    background_tasks: BackgroundTasks
) -> RegisterResponse:
    """
    Approche A — Inscription en attente :
    1. Valide l'email (format et deliverability).
    2. Vérifie qu'aucun compte n'existe déjà avec cet email.
    3. NE CRÉE PAS d'entrée dans la table 'utilisateur'.
    4. Stocke l'inscription dans 'pending_registrations' avec le code OTP hashé et expiration 15 min.
    5. Envoie l'email contenant le code à 6 chiffres en clair au destinataire.
    """
    # 1. Validation de l'email
    try:
        valid = validate_email(data.email, check_deliverability=True)
        normalized_email = valid.normalized
    except EmailNotValidError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cette adresse email semble invalide. Vérifiez qu'elle est correctement orthographiée.",
        )

    # 2. Vérification d'unicité
    if repository.get_user_by_email(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )
    if repository.get_agent_by_email(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    # 3. Nettoyage des inscriptions expirées
    now = datetime.now(timezone.utc)
    repository.cleanup_expired_pending_registrations(db, now)

    # 4. Préparation des données & hachage sécurisé
    mot_de_passe_hash = pwd_context.hash(data.mot_de_passe)
    pseudonyme = _generer_pseudonyme(data.pseudonyme)
    code_otp = f"{secrets.randbelow(900000) + 100000}"
    code_hash = pwd_context.hash(code_otp)
    expires_at = now + timedelta(minutes=15)

    # 5. Enregistrement en attente
    repository.create_or_update_pending_registration(
        db=db,
        email=normalized_email,
        mot_de_passe_hash=mot_de_passe_hash,
        pseudonyme=pseudonyme,
        code_hash=code_hash,
        expires_at=expires_at,
    )

    print(f"\n=======================================================")
    print(f"[CONFIRMATION EMAIL DISPATCH] Pour: {normalized_email}")
    print(f"=======================================================\n")

    # 6. Envoi de l'email de confirmation réel
    if hasattr(notification_service, "email_service") and notification_service.email_service:
        notification_service.email_service.send_confirmation_email(
            to=normalized_email,
            pseudonyme=pseudonyme,
            token=code_otp,
            background_tasks=background_tasks,
        )

    return RegisterResponse(
        status="pending",
        email=normalized_email,
        message="Un code de confirmation à 6 chiffres a été envoyé par email.",
    )


def verify_email_code(
    db: Session,
    email: str,
    code: str,
    notification_service: NotificationService | None = None,
) -> TokenResponse:
    """
    Approche A — Vérification du code OTP :
    1. Recherche l'inscription en attente dans 'pending_registrations'.
    2. Vérifie que le code n'est pas expiré (délai de 15 minutes).
    3. Vérifie la correspondance du hash du code.
    4. Crée le compte réel dans la table 'utilisateur' avec email_confirme=True.
    5. Supprime l'entrée 'pending_registrations'.
    6. Retourne le token JWT de session pour connecter immédiatement l'utilisateur.
    """
    clean_email = email.strip().lower()
    clean_code = code.strip().replace(" ", "")

    # Vérifier si l'utilisateur est déjà enregistré et validé
    existing_user = repository.get_user_by_email(db, clean_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte a déjà été validé. Vous pouvez vous connecter directement.",
        )

    pending = repository.get_pending_registration(db, clean_email)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune inscription en attente trouvée pour cette adresse email. Veuillez vous inscrire.",
        )

    now = datetime.now(timezone.utc)
    if pending.date_expiration < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code de confirmation a expiré (délai de 15 minutes dépassé). Veuillez cliquer sur 'Renvoyer le code'.",
        )

    if not pwd_context.verify(clean_code, pending.code_verification_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code de vérification incorrect. Veuillez vérifier le code reçu par email.",
        )

    # Création du compte utilisateur réel
    user = repository.create_user(
        db=db,
        email=pending.email,
        mot_de_passe_hash=pending.mot_de_passe_hash,
        pseudonyme=pending.pseudonyme,
        email_confirme=True,
    )

    # Suppression de l'inscription en attente
    repository.delete_pending_registration(db, clean_email)

    # Notification in-app de bienvenue
    if notification_service and hasattr(notification_service, "_persist_in_app"):
        try:
            notification_service._persist_in_app(
                session=db,
                user_id=user.id,
                n_type="welcome",
                content="Bienvenue sur TrustPool 🎉 ! Votre adresse email a été confirmée avec succès.",
            )
        except Exception:
            pass

    # Connexion immédiate
    payload = TokenPayload(user_id=str(user.id), role=user.role, group_ids=[])
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def resend_verification_code(
    db: Session,
    email: str,
    notification_service: NotificationService,
    background_tasks: BackgroundTasks | None = None,
) -> dict:
    """
    Régénère un code OTP à 6 chiffres, met à jour le hash et réinitialise
    l'expiration à +15 minutes sur la même entrée 'pending_registrations'.
    """
    clean_email = email.strip().lower()

    if repository.get_user_by_email(db, clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte a déjà été validé. Vous pouvez vous connecter directement.",
        )

    pending = repository.get_pending_registration(db, clean_email)
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune inscription en attente trouvée avec cet email.",
        )

    now = datetime.now(timezone.utc)
    new_code = f"{secrets.randbelow(900000) + 100000}"
    new_code_hash = pwd_context.hash(new_code)
    new_expires_at = now + timedelta(minutes=15)

    pending.code_verification_hash = new_code_hash
    pending.date_expiration = new_expires_at
    db.commit()

    if hasattr(notification_service, "email_service") and notification_service.email_service:
        notification_service.email_service.send_confirmation_email(
            to=pending.email,
            pseudonyme=pending.pseudonyme,
            token=new_code,
            background_tasks=background_tasks,
        )

    return {"status": "success", "message": "Nouveau code envoyé par email."}


def confirm_user_email(db: Session, token: str) -> Utilisateur:
    """
    Compatibilité lien direct : valide le token, active email_confirme et supprime le token.
    """
    user = repository.get_user_by_confirmation_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le lien de confirmation est invalide ou a déjà été utilisé.",
        )
    return repository.confirm_user_email(db, user)


def login_user(db: Session, data: UserLogin) -> TokenResponse:
    clean_email = data.email.strip().lower()
    user = repository.get_user_by_email(db, clean_email)
    if user:
        if not pwd_context.verify(data.mot_de_passe, user.mot_de_passe_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )
        if not user.email_confirme:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Veuillez confirmer votre adresse email pour vous connecter.",
            )
        payload = TokenPayload(user_id=str(user.id), role=user.role, group_ids=[])
    else:
        # Vérifier si l'utilisateur a une inscription en attente
        pending = repository.get_pending_registration(db, clean_email)
        if pending:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Votre compte n'est pas encore activé. Veuillez saisir le code de confirmation reçu par email.",
            )

        agent = repository.get_agent_by_email(db, clean_email)
        if agent and pwd_context.verify(data.mot_de_passe, agent.mot_de_passe_hash):
            payload = TokenPayload(user_id=str(agent.id), role="admin_plateforme", group_ids=[])
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )

    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


def _valider_kyc_mock(db_session_factory, user_id):
    pass


from app.core import storage

def submit_kyc(db: Session, user_id: uuid.UUID, data: dict, file: UploadFile) -> CoffreKYC:
    """
    Chiffre les données KYC en utilisant Fernet (KMS) et stocke le document justificatif
    (CIN, passeport) de manière sécurisée sur MinIO / S3 Object Storage.
    """
    # Enregistrement du fichier sur MinIO / S3
    object_key = f"kyc/{user_id}/{file.filename}"
    document_path = storage.upload_file(file, object_key)

    kyc_data = {
        "nom_complet": data.get("nom_complet"),
        "date_naissance": data.get("date_naissance"),
        "type_document": data.get("type_document"),
    }
    
    # Sérialisation et chiffrement
    raw_bytes = json.dumps(kyc_data).encode("utf-8")
    donnees_chiffrees = encrypt(raw_bytes)
    
    # Enregistrement en base de données
    coffre = repository.create_coffre_kyc(
        db=db,
        utilisateur_id=user_id,
        donnees_chiffrees=donnees_chiffrees,
        ref_cle_kms="fernet_key",
        fournisseur_api="Manual",
        statut_verification="pending",
        document_url=document_path
    )
    
    # Instant KYC validation mock for tests (asynchronous)
    if _valider_kyc_mock:
        t = threading.Thread(target=_valider_kyc_mock, args=(None, user_id))
        t.start()
        
    return coffre


def review_kyc(
    db: Session,
    kyc_id: uuid.UUID,
    statut: str,
    commentaire: str | None,
    admin_id: uuid.UUID,
    notification_service: NotificationService | None = None,
    background_tasks: BackgroundTasks | None = None
) -> CoffreKYC:
    """
    Validation manuelle du KYC par un agent de conformité.
    """
    coffre = repository.get_kyc_by_id(db, kyc_id)
    if not coffre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC non trouvé",
        )
    
    now = datetime.now(timezone.utc)
    updated_coffre = repository.update_kyc_status(
        db,
        utilisateur_id=coffre.utilisateur_id,
        statut_verification=statut,
        verifie_le=now,
        verifie_par_agent_id=admin_id,
        commentaire_review=commentaire
    )
    
    user = repository.get_user_by_id(db, coffre.utilisateur_id)

    if statut == "verified":
        produce_kyc_verified(coffre.utilisateur_id, "verified", now)
        if notification_service and user:
            notification_service.notify_kyc_approved(
                session=db,
                user_id=user.id,
                email=user.email,
                pseudonyme=user.pseudonyme,
                background_tasks=background_tasks
            )
    elif statut == "failed":
        if notification_service and user:
            notification_service.notify_kyc_rejected(
                session=db,
                user_id=user.id,
                email=user.email,
                pseudonyme=user.pseudonyme,
                reason=commentaire or "Non spécifié",
                background_tasks=background_tasks
            )
        
    return updated_coffre


def get_kyc_status(db: Session, user_id: uuid.UUID) -> CoffreKYC:
    """
    Récupère le statut KYC de l'utilisateur. S'il n'y a pas de KYC soumis,
    lève une exception 404.
    """
    coffre = repository.get_kyc_by_user_id(db, user_id)
    if not coffre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun dossier KYC n'a été soumis pour cet utilisateur",
        )
    return coffre


def process_anonymity_lift_approved(db: Session, payload: dict) -> None:
    """
    Traite la levée d'anonymat approuvée par l'agent de conformité :
    - Récupère la demande depuis la DB via requête brute.
    - Met à jour son statut à 'approuvee'.
    - Déchiffre en mémoire les données KYC correspondantes de l'utilisateur cible.
    - Écrit une entrée dans journal_audit traçant l'opération sans stocker le contenu clair.
    """
    demande_levee_id_str = payload.get("demande_levee_id")
    valide_par_agent_id_str = payload.get("valide_par_agent_id")
    date_execution_str = payload.get("date_execution")
    
    if not demande_levee_id_str:
        return
        
    demande_levee_id = uuid.UUID(demande_levee_id_str)
    
    # Lecture brute dans la table demande_levee_anonymat
    query = text(
        "SELECT utilisateur_cible_id, justification_legale, sinistre_id FROM demande_levee_anonymat WHERE id = :id"
    )
    result = db.execute(query, {"id": demande_levee_id}).fetchone()
    if not result:
        print(f"[KYC-KMS] Demande de levée d'anonymat {demande_levee_id} introuvable.")
        return
        
    utilisateur_cible_id, justification, sinistre_id = result
    
    # Mise à jour de la demande
    update_query = text(
        "UPDATE demande_levee_anonymat SET statut = 'approuvee', valide_par_agent_id = :agent_id, date_execution = :date_exec WHERE id = :id"
    )
    db.execute(
        update_query,
        {
            "id": demande_levee_id,
            "agent_id": uuid.UUID(valide_par_agent_id_str) if valide_par_agent_id_str else None,
            "date_exec": datetime.fromisoformat(date_execution_str) if date_execution_str else datetime.now(timezone.utc),
        }
    )
    
    # Récupération et déchiffrement du KYC
    coffre = repository.get_kyc_by_user_id(db, utilisateur_cible_id)
    if not coffre:
        print(f"[KYC-KMS] Coffre KYC introuvable pour l'utilisateur {utilisateur_cible_id}.")
        return
        
    # Déchiffrement réel en mémoire
    donnees_claires_bytes = decrypt(coffre.donnees_chiffrees)
    donnees_claires = json.loads(donnees_claires_bytes.decode("utf-8"))
    
    # Journalisation de l'audit
    audit_query = text(
        "INSERT INTO journal_audit (acteur_id, action, cible_type, cible_id, details) "
        "VALUES (:acteur_id, :action, :cible_type, :cible_id, :details)"
    )
    acteur_id = uuid.UUID(valide_par_agent_id_str) if valide_par_agent_id_str else uuid.uuid4()
    details_json = json.dumps({
        "demande_levee_id": str(demande_levee_id),
        "justification": justification,
        "sinistre_id": str(sinistre_id),
    })
    db.execute(
        audit_query,
        {
            "acteur_id": acteur_id,
            "action": "anonymity_lift_executed",
            "cible_type": "Utilisateur",
            "cible_id": utilisateur_cible_id,
            "details": details_json,
        }
    )
    db.commit()
    print(f"[KYC-KMS] Anonymity lifted for user {utilisateur_cible_id}. Nom complet en mémoire: {donnees_claires.get('nom_complet')}")

def submit_onboarding(db: Session, user_id: uuid.UUID, data: dict):
    """Soumet le profil onboarding et marque l'utilisateur comme onboardé."""
    profil = repository.create_profil_onboarding(db, user_id, data)
    repository.update_user_onboarding_status(db, user_id, complete=True)
    return profil

def get_onboarding_status(db: Session, user_id: uuid.UUID):
    profil = repository.get_profil_onboarding(db, user_id)
    if not profil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le profil d'onboarding n'a pas encore été complété."
        )
    return profil