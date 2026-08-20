import uuid
from datetime import datetime, timezone
import pytest
from app.modules.users_kyc import repository as kyc_repo
from app.modules.groups import repository as groups_repo
from app.modules.groups.schemas import GroupCreate
from app.modules.cagnotte import repository as cag_repo

def test_kyc_lock_blocks_unverified_users_on_sensitive_endpoints(client, db_session):
    # 1. Inscription d'un utilisateur non vérifié (sans KYC vérifié)
    register_res = client.post(
        "/users_kyc/register",
        json={
            "email": "unverified@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "UnverifiedUser"
        }
    )
    assert register_res.status_code == 201
    user_id = register_res.json()["id"]

    login_res = client.post(
        "/users_kyc/login",
        json={
            "email": "unverified@gmail.com",
            "mot_de_passe": "password123"
        }
    )
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
    # 1. Inscription d'un utilisateur
    register_res = client.post(
        "/users_kyc/register",
        json={
            "email": "verified@gmail.com",
            "mot_de_passe": "password123",
            "pseudonyme": "VerifiedUser"
        }
    )
    assert register_res.status_code == 201
    user_id = register_res.json()["id"]

    # 2. On valide le KYC de l'utilisateur
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
            "email": "verified@gmail.com",
            "mot_de_passe": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Création d'un groupe
    group = groups_repo.create_group(
        db_session,
        admin_id=uuid.UUID(user_id),
        data=GroupCreate(nom="Test Verified Group", specialite="Tech", cotisation_de_base=40.0)
    )

    # A. Test Adhésion (POST /groups/{id}/join-request) -> passe le verrou KYC (ne renvoie pas 403 KYC)
    res_join = client.post(f"/groups/{group.id}/join-request", headers=headers)
    assert res_join.status_code != 403 or "vérification d'identité (KYC)" not in str(res_join.json())
