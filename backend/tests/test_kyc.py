def test_submit_kyc(auth_client):
    client = auth_client["client"]
    
    response = client.post(
        "/users_kyc/kyc/submit",
        json={
            "nom_complet": "Jean Dupont",
            "date_naissance": "1990-01-01",
            "numero_document": "AB123456",
            "type_document": "passeport"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["statut_verification"] == "pending"

def test_get_kyc_status(auth_client):
    client = auth_client["client"]
    
    # Sans KYC, ça devrait renvoyer 404
    response = client.get("/users_kyc/kyc/status")
    assert response.status_code == 404
    
    # On soumet le KYC
    client.post(
        "/users_kyc/kyc/submit",
        json={
            "nom_complet": "Jean Dupont",
            "date_naissance": "1990-01-01",
            "numero_document": "AB123456",
            "type_document": "passeport"
        }
    )
    
    import time
    time.sleep(1)
    # Maintenant ça devrait marcher
    response = client.get("/users_kyc/kyc/status")
    assert response.status_code == 200
    data = response.json()
    assert data["statut_verification"] == "verified"

def test_submit_onboarding(auth_client):
    client = auth_client["client"]
    
    response = client.post(
        "/users_kyc/onboarding",
        json={
            "tranche_age": "25-34",
            "situation_pro": "CDI",
            "interets_assurance": ["santé", "auto"],
            "budget_max_mensuel": 150.0,
            "niveau_risque": "moyen",
            "region": "Ile-de-France"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["onboarding_complete"] is True
    assert data["tranche_age"] == "25-34"

def test_get_onboarding(auth_client):
    client = auth_client["client"]
    
    # Sans onboarding, 404
    res1 = client.get("/users_kyc/onboarding")
    assert res1.status_code == 404
    
    # Avec onboarding
    client.post(
        "/users_kyc/onboarding",
        json={
            "tranche_age": "18-24",
            "situation_pro": "Etudiant",
            "interets_assurance": ["logement"],
            "budget_max_mensuel": 30.0,
            "niveau_risque": "faible",
            "region": "Bretagne"
        }
    )
    
    res2 = client.get("/users_kyc/onboarding")
    assert res2.status_code == 200
    assert res2.json()["onboarding_complete"] is True
