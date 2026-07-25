"""
Logique métier du module users_kyc.
Orchestre le repository (accès DB), core/auth.py et core/kms.py.
"""
import json
import secrets
import string
import threading
import uuid
import time
from datetime import datetime, timezone

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.auth import TokenPayload, create_access_token, create_refresh_token
from app.core.kms import encrypt, decrypt
from app.modules.users_kyc import repository
from app.modules.users_kyc.models import Utilisateur, CoffreKYC
from app.modules.users_kyc.schemas import UserCreate, UserLogin, TokenResponse, KYCSubmit, KYCStatusOut
from app.modules.users_kyc.events import produce_kyc_verified

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _generer_pseudonyme() -> str:
    """
    Génère un pseudonyme aléatoire non réversible — c'est ce pseudonyme,
    pas le vrai nom, qui est visible par les autres membres du groupe.
    """
    suffixe = "".join(secrets.choice(string.digits) for _ in range(6))
    return f"membre_{suffixe}"


def register_user(db: Session, data: UserCreate) -> Utilisateur:
    if repository.get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    mot_de_passe_hash = pwd_context.hash(data.mot_de_passe)
    pseudonyme = _generer_pseudonyme()

    return repository.create_user(
        db, email=data.email, mot_de_passe_hash=mot_de_passe_hash, pseudonyme=pseudonyme
    )


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


def _valider_kyc_mock(db_session_factory, user_id: uuid.UUID) -> None:
    """
    Simule la validation du KYC après un délai de 5 secondes.
    Met à jour la base de données et publie l'événement Kafka.
    """
    time.sleep(5)
    db = db_session_factory()
    try:
        now = datetime.now(timezone.utc)
        repository.update_kyc_status(
            db,
            utilisateur_id=user_id,
            statut_verification="verified",
            verifie_le=now,
        )
        produce_kyc_verified(user_id, "verified", now)
    except Exception as e:
        print(f"Erreur lors de la validation KYC mockée: {e}")
    finally:
        db.close()


def submit_kyc(db: Session, db_session_factory, user_id: uuid.UUID, data: KYCSubmit) -> CoffreKYC:
    """
    Chiffre les données KYC en utilisant Fernet (KMS) et les enregistre.
    Déclenche ensuite une validation mockée asynchrone.
    """
    kyc_data = {
        "nom_complet": data.nom_complet,
        "date_naissance": data.date_naissance,
        "numero_document": data.numero_document,
        "type_document": data.type_document,
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
        fournisseur_api=data.fournisseur_api,
        statut_verification="pending"
    )
    
    # Simulation d'une vérification asynchrone externe
    thread = threading.Thread(target=_valider_kyc_mock, args=(db_session_factory, user_id))
    thread.start()
    
    return coffre


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