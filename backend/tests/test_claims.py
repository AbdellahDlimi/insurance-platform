def test_submit_claim_and_validate(verified_client, client):
    admin_client = verified_client["client"]
    admin_id = verified_client["user"]["id"]
    
    # 1. Création d'un groupe par l'admin
    group_res = admin_client.post(
        "/groups",
        json={
            "nom": "Groupe Sinistres",
            "description": "Test",
            "specialite": "Auto",
            "cotisation_de_base": 50.0,
            "est_ouvert": True
        }
    )
    group_id = group_res.json()["id"]
    
    # L'admin doit se reconnecter pour mettre à jour son token
    login_admin_res = admin_client.post("/users_kyc/login", json={"email": "auth@trustpool.io", "mot_de_passe": "password123"})
    admin_client.headers.update({"Authorization": f"Bearer {login_admin_res.json()['access_token']}"})
    
    # 2. Création et adhésion d'un membre
    client.post("/users_kyc/register", json={"email": "member2@trustpool.io", "mot_de_passe": "pass", "pseudonyme": "M2"})
    member_token = client.post("/users_kyc/login", json={"email": "member2@trustpool.io", "mot_de_passe": "pass"}).json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}
    
    member_id = client.get("/users_kyc/me", headers=member_headers).json()["id"]
    
    # KYC du membre
    kyc_res = client.post("/users_kyc/kyc/submit", json={"nom_complet": "X", "date_naissance": "2000-01-01", "numero_document": "1", "type_document": "cni"}, headers=member_headers)
    assert kyc_res.status_code == 201, kyc_res.json()
    import time
    time.sleep(6)
    
    # Adhésion
    join_res = client.post(f"/groups/{group_id}/join-request", headers=member_headers)
    assert join_res.status_code == 201, join_res.json()
    admin_client.post(f"/groups/{group_id}/members/{member_id}/validate", json={"statut": "acceptee"})
    
    adhesions = client.get("/groups/me/adhesions", headers=member_headers).json()
    adhesion_id = adhesions[0]["id"]
    
    # 3. Le membre déclare un sinistre
    claim_res = client.post(
        "/claims",
        json={
            "adhesion_id": adhesion_id,
            "groupe_id": group_id,
            "description": "Accident de voiture",
            "montant_declare": 500.0
        },
        headers=member_headers
    )
    assert claim_res.status_code == 201
    claim_id = claim_res.json()["id"]
    
    # 4. L'admin voit le sinistre
    admin_claims_res = admin_client.get(f"/claims/groupe/{group_id}")
    assert admin_claims_res.status_code == 200
    assert len(admin_claims_res.json()) == 1
    
    # 5. L'admin valide le sinistre
    val_claim_res = admin_client.post(
        f"/claims/{claim_id}/validate",
        json={"montant_approuve": 450.0}
    )
    assert val_claim_res.status_code == 200
    assert val_claim_res.json()["statut"] == "validee"
