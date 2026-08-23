import uuid
from datetime import datetime, timezone
import pytest
from passlib.context import CryptContext
from app.modules.users_kyc import repository as kyc_repo
from app.modules.groups import repository as groups_repo
from app.modules.groups.schemas import GroupCreate

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def test_kyc_lock_blocks_unverified_users_on_sensitive_endpoints(client, db_session):
    """
    Vérifie qu'un utilisateur sans KYC validé reçoit une erreur HTTP 403
    sur les endpoints sensibles : adhésion groupe, sinistre, paiement cotisation.
    """
    # 1. Création d'un utilisateur confirmé par email mais sans KYC vérifié
    user = kyc_repo.create_user(
        db=db_session,
        email="unverified_kyc@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("password123"),
        pseudonyme="UnverifiedKYCUser",
        email_confirme=True,
    )
    user_id = str(user.id)

    login_res = client.post(
        "/users_kyc/login",
        json={
            "email": "unverified_kyc@gmail.com",
            "mot_de_passe": "password123"
        }
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Création d'un groupe pour tester
    group = groups_repo.create_group(
        db_session,
        admin_id=uuid.UUID(user_id),
        data=GroupCreate(nom="Test Group KYC", specialite="Auto", cotisation_de_base=50.0)
    )

    # A. Test Adhésion (POST /groups/{id}/join-request) -> 403
    res_join = client.post(f"/groups/{group.id}/join-request", headers=headers)
    assert res_join.status_code == 403
    assert "vérification d'identité (KYC)" in res_join.json()["detail"]

    # B. Test Déclaration de sinistre (POST /claims) -> 403
    claim_payload = {
        "adhesion_id": str(uuid.uuid4()),
        "groupe_id": str(group.id),
        "description": "Accident de voiture",
        "montant_declare": 300.0,
    }
    res_claim = client.post("/claims/", json=claim_payload, headers=headers)
    assert res_claim.status_code == 403
    assert "vérification d'identité (KYC)" in res_claim.json()["detail"]

    # C. Test Paiement / Cotisation (POST /payments/create-checkout-session/{id}) -> 403
    res_payment = client.post(f"/payments/create-checkout-session/{uuid.uuid4()}", headers=headers)
    assert res_payment.status_code == 403
    assert "vérification d'identité (KYC)" in res_payment.json()["detail"]


def test_kyc_lock_allows_verified_users(client, db_session):
    """
    Vérifie qu'un utilisateur avec KYC validé ('verified') franchit le verrou KYC.
    """
    # 1. Création de l'utilisateur
    user = kyc_repo.create_user(
        db=db_session,
        email="verified_kyc@gmail.com",
        mot_de_passe_hash=pwd_ctx.hash("password123"),
        pseudonyme="VerifiedKYCUser",
        email_confirme=True,
    )
    user_id = str(user.id)

    # 2. Validation de son KYC dans le coffre
    kyc_repo.create_coffre_kyc(
        db_session,
        utilisateur_id=uuid.UUID(user_id),
        donnees_chiffrees=b"encrypted_data",
        ref_cle_kms="key-123",
        fournisseur_api="synaps",
        statut_verification="verified"
    )

    login_res = client.post(
        "/users_kyc/login",
        json={
            "email": "verified_kyc@gmail.com",
            "mot_de_passe": "password123"
        }
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Création d'un groupe
    group = groups_repo.create_group(
        db_session,
        admin_id=uuid.UUID(user_id),
        data=GroupCreate(nom="Test Verified Group", specialite="Tech", cotisation_de_base=40.0)
    )

    # A. Test Adhésion (POST /groups/{id}/join-request) -> franchit le verrou KYC
    res_join = client.post(f"/groups/{group.id}/join-request", headers=headers)
    # Ne doit pas lever l'erreur 403 KYC
    if res_join.status_code == 403:
        assert "vérification d'identité (KYC)" not in res_join.json()["detail"]
