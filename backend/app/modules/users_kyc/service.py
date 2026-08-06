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
from datetime import datetime, timezone

from fastapi import HTTPException, status, BackgroundTasks, UploadFile
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.auth import TokenPayload, create_access_token, create_refresh_token
from app.core.kms import encrypt, decrypt
from app.modules.users_kyc import repository
from app.modules.users_kyc.models import Utilisateur, CoffreKYC
from app.modules.users_kyc.schemas import UserCreate, UserLogin, TokenResponse, KYCSubmit, KYCStatusOut
from app.modules.users_kyc.events import produce_kyc_verified
from app.modules.notifications.service import NotificationService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _generer_pseudonyme(base_name: str) -> str:
    """
    Génère un pseudonyme en ajoutant un suffixe aléatoire pour éviter
    les doublons tout en gardant le nom choisi par l'utilisateur.
    """
    suffixe = "".join(secrets.choice(string.digits) for _ in range(4))
    # Nettoyer les espaces ou caractères bizarres du nom de base si nécessaire
    clean_name = base_name.strip().replace(" ", "")
    return f"{clean_name}#{suffixe}"


def register_user(
    db: Session, 
    data: UserCreate, 
    notification_service: NotificationService,
    background_tasks: BackgroundTasks
) -> Utilisateur:
    if repository.get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    mot_de_passe_hash = pwd_context.hash(data.mot_de_passe)
    pseudonyme = _generer_pseudonyme(data.pseudonyme)

    user = repository.create_user(
        db, email=data.email, mot_de_passe_hash=mot_de_passe_hash, pseudonyme=pseudonyme
    )
    
    notification_service.notify_welcome(
        session=db,
        user_id=user.id,
        email=user.email,
        pseudonyme=user.pseudonyme,
        background_tasks=background_tasks
    )
    
    return user


def login_user(db: Session, data: UserLogin) -> TokenResponse:
    user = repository.get_user_by_email(db, data.email)
    if not user or not pwd_context.verify(data.mot_de_passe, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    payload = TokenPayload(user_id=str(user.id), role=user.role, group_ids=[])
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
    )


def submit_kyc(db: Session, user_id: uuid.UUID, data: dict, file: UploadFile) -> CoffreKYC:
    """
    Chiffre les données KYC en utilisant Fernet (KMS) et enregistre le fichier.
    """
    # Enregistrement du fichier
    upload_dir = f"uploads/kyc/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

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
        document_url=file_path
    )
    
    return coffre


def review_kyc(db: Session, kyc_id: uuid.UUID, statut: str, commentaire: str | None, admin_id: uuid.UUID) -> CoffreKYC:
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
    
    if statut == "verified":
        produce_kyc_verified(coffre.utilisateur_id, "verified", now)
        
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