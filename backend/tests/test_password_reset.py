import uuid
from datetime import datetime, timezone, timedelta
import pytest
from passlib.context import CryptContext
from app.modules.users_kyc import repository as kyc_repo
from app.modules.users_kyc.models import PasswordResetToken

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def test_forgot_password_generic_response_existing_user(client, db_session):
    """Vérifie qu'un email existant génère un token et retourne une réponse générique."""
    user = kyc_repo.create_user(
        db=db_session,
        email="reset_user@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("oldpassword123"),
        pseudonyme="ResetUser",
        email_confirme=True,
    )

    res = client.post(
        "/users_kyc/forgot-password",
        json={"email": "reset_user@gmail.com"}
    )
    assert res.status_code == 200
    assert "Si un compte existe" in res.json()["message"]

    # Vérifier que le token a bien été créé en base
    tokens = db_session.query(PasswordResetToken).filter(
        PasswordResetToken.utilisateur_id == user.id,
        PasswordResetToken.utilise == False,
    ).all()
    assert len(tokens) == 1


def test_forgot_password_generic_response_non_existing_user(client, db_session):
    """Vérifie qu'un email inexistant retourne la même réponse générique sans rien créer."""
    res = client.post(
        "/users_kyc/forgot-password",
        json={"email": "nonexistent_reset@gmail.com"}
    )
    assert res.status_code == 200
    assert "Si un compte existe" in res.json()["message"]


def test_reset_password_success(client, db_session):
    """Vérifie la réinitialisation complète du mot de passe avec un token valide."""
    user = kyc_repo.create_user(
        db=db_session,
        email="successful_reset@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("oldpassword123"),
        pseudonyme="SuccessfulResetUser",
        email_confirme=True,
    )

    raw_token = "secret_reset_token_1234567890_abcdef"
    token_hash = pwd_ctx.hash(raw_token)
    kyc_repo.create_password_reset_token(
        db=db_session,
        utilisateur_id=user.id,
        token_hash=token_hash,
        date_expiration=datetime.now(timezone.utc) + timedelta(minutes=30),
    )

    # Réinitialisation
    reset_res = client.post(
        "/users_kyc/reset-password",
        json={
            "token": raw_token,
            "nouveau_mot_de_passe": "NewSecurePassword456!",
        }
    )
    assert reset_res.status_code == 200
    assert "réinitialisé avec succès" in reset_res.json()["message"]

    # Tentative de connexion avec l'ancien mot de passe -> 401
    old_login = client.post(
        "/users_kyc/login",
        json={"email": "successful_reset@gmail.com", "mot_de_passe": "oldpassword123"}
    )
    assert old_login.status_code == 401

    # Connexion avec le nouveau mot de passe -> 200
    new_login = client.post(
        "/users_kyc/login",
        json={"email": "successful_reset@gmail.com", "mot_de_passe": "NewSecurePassword456!"}
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


def test_reset_password_invalid_or_expired_token(client, db_session):
    """Vérifie le rejet pour token invalide ou expiré."""
    user = kyc_repo.create_user(
        db=db_session,
        email="expired_token_user@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("oldpassword123"),
        pseudonyme="ExpiredTokenUser",
        email_confirme=True,
    )

    raw_token = "expired_token_value_1234567890"
    token_hash = pwd_ctx.hash(raw_token)
    kyc_repo.create_password_reset_token(
        db=db_session,
        utilisateur_id=user.id,
        token_hash=token_hash,
        date_expiration=datetime.now(timezone.utc) - timedelta(minutes=10), # expiré
    )

    res = client.post(
        "/users_kyc/reset-password",
        json={
            "token": raw_token,
            "nouveau_mot_de_passe": "NewSecurePassword456!",
        }
    )
    assert res.status_code == 400
    assert "expiré" in res.json()["detail"] or "invalide" in res.json()["detail"]


def test_multiple_requests_invalidates_previous_tokens(client, db_session):
    """Vérifie que seule la dernière demande reste valide."""
    user = kyc_repo.create_user(
        db=db_session,
        email="multi_req_user@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("oldpassword123"),
        pseudonyme="MultiReqUser",
        email_confirme=True,
    )

    token1 = "first_token_123456789012345"
    token2 = "second_token_123456789012345"

    kyc_repo.create_password_reset_token(
        db=db_session,
        utilisateur_id=user.id,
        token_hash=pwd_ctx.hash(token1),
        date_expiration=datetime.now(timezone.utc) + timedelta(minutes=30),
    )

    kyc_repo.create_password_reset_token(
        db=db_session,
        utilisateur_id=user.id,
        token_hash=pwd_ctx.hash(token2),
        date_expiration=datetime.now(timezone.utc) + timedelta(minutes=30),
    )

    # Token 1 doit échouer
    res1 = client.post(
        "/users_kyc/reset-password",
        json={"token": token1, "nouveau_mot_de_passe": "NewPass123"}
    )
    assert res1.status_code == 400

    # Token 2 doit réussir
    res2 = client.post(
        "/users_kyc/reset-password",
        json={"token": token2, "nouveau_mot_de_passe": "NewPass123"}
    )
    assert res2.status_code == 200
