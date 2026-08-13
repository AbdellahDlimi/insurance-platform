def test_create_group(verified_client):
    client = verified_client["client"]
    
    response = client.post(
        "/groups",
        json={
            "nom": "Groupe Test",
            "description": "Un groupe pour tester",
            "specialite": "Multirisque habitation",
            "cotisation_de_base": 10.5,
            "est_ouvert": True
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nom"] == "Groupe Test"
    
    # Vérifier que le créateur est devenu admin et membre
    members_res = client.get(f"/groups/{data['id']}/members")
    assert members_res.status_code == 200
    members = members_res.json()
    assert len(members) == 1
    assert members[0]["utilisateur_id"] == verified_client["user"]["id"]

def test_join_group_workflow(verified_client, client):
    admin_client = verified_client["client"]
    admin_user_id = verified_client["user"]["id"]
    
    # 1. L'admin crée un groupe
    group_res = admin_client.post(
        "/groups",
        json={
            "nom": "Groupe Workflow",
            "description": "Test complet",
            "specialite": "Auto",
            "cotisation_de_base": 50.0,
            "est_ouvert": True
        }
    )
    group_id = group_res.json()["id"]
    
    # L'admin doit se reconnecter pour mettre à jour son token avec le nouveau rôle
    login_admin_res = admin_client.post("/users_kyc/login", json={"email": "auth@trustpool.io", "mot_de_passe": "password123"})
    admin_client.headers.update({"Authorization": f"Bearer {login_admin_res.json()['access_token']}"})
    
    # 2. Création d'un 2ème utilisateur (non-admin)
    client.post(
        "/users_kyc/register",
        json={"email": "member@trustpool.io", "mot_de_passe": "pass123", "pseudonyme": "Member"}
    )
    login_res = client.post("/users_kyc/login", json={"email": "member@trustpool.io", "mot_de_passe": "pass123"})
    member_token = login_res.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}
    
    member_user_id = client.get("/users_kyc/me", headers=member_headers).json()["id"]
    
    kyc_res = client.post(
        "/users_kyc/kyc/submit",
        data={
            "nom_complet": "M",
            "date_naissance": "2000-01-01",
            "type_document": "cni"
        },
        files={"file": ("test.pdf", b"pdf content", "application/pdf")},
        headers=member_headers
    )
    assert kyc_res.status_code == 201, kyc_res.json()
    
    import time
    time.sleep(6)
    
    # 3. Le membre demande à rejoindre le groupe
    join_res = client.post(f"/groups/{group_id}/join-request", headers=member_headers)
    assert join_res.status_code == 201, join_res.json()
    
    # 4. Un non-membre ne peut pas voir les membres
    members_enriched_res = client.get(f"/groups/{group_id}/members/enriched", headers=member_headers)
    assert members_enriched_res.status_code == 403
    
    # 5. L'admin récupère les demandes
    requests_res = admin_client.get(f"/groups/{group_id}/join-requests")
    assert requests_res.status_code == 200
    requests = requests_res.json()
    assert len(requests) == 1
    req_id = requests[0]["id"]
    
    # 6. L'admin valide la demande
    val_res = admin_client.post(
        f"/groups/{group_id}/members/{member_user_id}/validate",
        json={"statut": "acceptee"}
    )
    assert val_res.status_code == 200
    
    # 7. Maintenant le membre peut voir les membres
    members_enriched_res2 = client.get(f"/groups/{group_id}/members/enriched", headers=member_headers)
    assert members_enriched_res2.status_code == 200
    assert len(members_enriched_res2.json()) == 2
