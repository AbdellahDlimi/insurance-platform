import pytest
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext

from app.modules.users_kyc.models import Utilisateur, PendingRegistration
from app.modules.users_kyc import repository as kyc_repo

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def test_register_creates_pending_only(client, db_session):
    """
    Test 1 : L'inscription NE DOIT PAS créer d'utilisateur dans la table 'utilisateur'.
    Elle doit UNIQUEMENT créer une entrée dans 'pending_registrations' avec le code et mot de passe hashés.
    """
    response = client.post(
        "/users_kyc/register",
        json={
            "email": "test_pending@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "PendingTester"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["email"] == "test_pending@gmail.com"
    assert "dev_code" not in data  # Sécurité : aucun code renvoyé

    # 1. Vérifier qu'AUCUNE entrée n'existe dans la table 'utilisateur'
    user_in_db = db_session.query(Utilisateur).filter(Utilisateur.email == "test_pending@gmail.com").first()
    assert user_in_db is None

    # 2. Vérifier que l'entrée existe dans 'pending_registrations'
    pending = db_session.query(PendingRegistration).filter(PendingRegistration.email == "test_pending@gmail.com").first()
    assert pending is not None
    assert pending.email == "test_pending@gmail.com"
    # Vérifier que le mot de passe est bien hashé
    assert pending.mot_de_passe_hash.startswith("$2b$")
    assert pwd_context.verify("password123", pending.mot_de_passe_hash)
    # Vérifier que le code OTP est bien hashé (non lisible en clair)
    assert pending.code_verification_hash.startswith("$2b$")
    # Vérifier que la date d'expiration est fixée dans le futur (~15 min)
    assert pending.date_expiration > datetime.now(timezone.utc)


def test_register_invalid_domain_email(client):
    response = client.post(
        "/users_kyc/register",
        json={
            "email": "test@ceci-nexiste-pas-du-tout-12345.com",
            "mot_de_passe": "password123",
            "pseudonyme": "InvalidDomainUser"
        }
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Cette adresse email semble invalide. Vérifiez qu'elle est correctement orthographiée."


def test_register_malformed_email(client):
    response = client.post(
        "/users_kyc/register",
        json={
            "email": "pasunemail",
            "mot_de_passe": "password123",
            "pseudonyme": "MalformedUser"
        }
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Cette adresse email semble invalide. Vérifiez qu'elle est correctement orthographiée."


def test_login_unconfirmed_pending_fails(client, db_session):
    """
    Test 2 : Tentative de connexion alors que le code n'a pas été validé -> 403 Forbidden.
    """
    client.post(
        "/users_kyc/register",
        json={
            "email": "unconfirmed@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "UnconfirmedUser"
        }
    )
    
    # Tentative de connexion
    response = client.post(
        "/users_kyc/login",
        json={
            "email": "unconfirmed@gmail.com",
            "mot_de_passe": "password123"
        }
    )
    assert response.status_code == 403
    assert "pas encore activé" in response.json()["detail"]


def test_verify_code_invalid(client, db_session):
    """
    Test 3 : Validation avec un code incorrect -> échec 400 et aucune création en table 'utilisateur'.
    """
    client.post(
        "/users_kyc/register",
        json={
            "email": "wrongcode@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "WrongCodeUser"
        }
    )
    
    # Envoi d'un mauvais code
    bad_res = client.post(
        "/users_kyc/verify-code",
        json={"email": "wrongcode@gmail.com", "code": "000000"}
    )
    assert bad_res.status_code == 400
    assert "incorrect" in bad_res.json()["detail"].lower()

    # Vérification qu'aucun utilisateur n'a été créé
    assert db_session.query(Utilisateur).filter(Utilisateur.email == "wrongcode@gmail.com").first() is None
    # L'entrée en attente existe toujours
    assert db_session.query(PendingRegistration).filter(PendingRegistration.email == "wrongcode@gmail.com").first() is not None


def test_verify_code_expired(client, db_session):
    """
    Test 5 : Tentative de validation avec un code expiré (+15 min) -> 400 Bad Request.
    """
    client.post(
        "/users_kyc/register",
        json={
            "email": "expired@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "ExpiredUser"
        }
    )
    
    # Simuler l'expiration de l'inscription en attente
    pending = db_session.query(PendingRegistration).filter(PendingRegistration.email == "expired@gmail.com").first()
    assert pending is not None
    pending.date_expiration = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    # Tentative de validation
    res = client.post(
        "/users_kyc/verify-code",
        json={"email": "expired@gmail.com", "code": "123456"}
    )
    assert res.status_code == 400
    assert "expiré" in res.json()["detail"].lower()
    assert db_session.query(Utilisateur).filter(Utilisateur.email == "expired@gmail.com").first() is None


def test_verify_code_success_creates_user(client, db_session):
    """
    Test 4 : Validation avec le bon code -> création dans 'utilisateur', suppression de 'pending_registrations' et connexion.
    """
    known_code = "654321"
    code_hash = pwd_context.hash(known_code)
    pwd_hash = pwd_context.hash("Secret123!")
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Inscription en attente
    kyc_repo.create_or_update_pending_registration(
        db=db_session,
        email="success_valid@gmail.com",
        mot_de_passe_hash=pwd_hash,
        pseudonyme="SuccessUser#5555",
        code_hash=code_hash,
        expires_at=expires
    )

    # Validation avec le code exact
    verify_res = client.post(
        "/users_kyc/verify-code",
        json={"email": "success_valid@gmail.com", "code": known_code}
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert "access_token" in data
    token = data["access_token"]

    # 1. Vérifier que l'utilisateur existe maintenant dans 'utilisateur'
    user = db_session.query(Utilisateur).filter(Utilisateur.email == "success_valid@gmail.com").first()
    assert user is not None
    assert user.email_confirme is True
    assert user.pseudonyme == "SuccessUser#5555"

    # 2. Vérifier que l'entrée a été supprimée de 'pending_registrations'
    pending = db_session.query(PendingRegistration).filter(PendingRegistration.email == "success_valid@gmail.com").first()
    assert pending is None

    # 3. Vérifier que le token permet d'accéder aux endpoints protégés
    me_res = client.get(
        "/users_kyc/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "success_valid@gmail.com"
    assert me_res.json()["email_confirme"] is True


def test_resend_verification_code(client, db_session):
    """
    Test 6 : Renvoi de code régénère le code hashé et prolonge l'expiration sans dupliquer l'entrée.
    """
    client.post(
        "/users_kyc/register",
        json={
            "email": "resend_test@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "ResendUser"
        }
    )
    pending_before = db_session.query(PendingRegistration).filter(PendingRegistration.email == "resend_test@gmail.com").first()
    old_hash = pending_before.code_verification_hash
    old_exp = pending_before.date_expiration

    resend_res = client.post(
        "/users_kyc/resend-code",
        json={"email": "resend_test@gmail.com"}
    )
    assert resend_res.status_code == 200
    assert resend_res.json()["status"] == "success"

    db_session.refresh(pending_before)
    # Le hash du code a été renouvelé
    assert pending_before.code_verification_hash != old_hash
    # L'expiration a été renouvelée
    assert pending_before.date_expiration >= old_exp
    # Il n'y a toujours qu'une seule entrée pour cet email
    count = db_session.query(PendingRegistration).filter(PendingRegistration.email == "resend_test@gmail.com").count()
    assert count == 1


def test_debug_test_email_endpoint(client):
    """
    Test 7 : Endpoint de debug d'envoi d'email.
    """
    res = client.post(
        "/users_kyc/debug/test-email",
        json={"email": "test_debug@gmail.com"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
