def test_register_user(client):
    response = client.post(
        "/users_kyc/register",
        json={
            "email": "test@trustpool.io",
            "mot_de_passe": "password123",
            "pseudonyme": "Tester"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@trustpool.io"
    assert "Tester#" in data["pseudonyme"]
    assert data["onboarding_complete"] is False

def test_login_user(client):
    # D'abord on s'inscrit
    client.post(
        "/users_kyc/register",
        json={
            "email": "login@trustpool.io",
            "mot_de_passe": "password123",
            "pseudonyme": "LoginUser"
        }
    )
    
    # Puis on se connecte
    response = client.post(
        "/users_kyc/login",
        json={
            "email": "login@trustpool.io",
            "mot_de_passe": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_me_endpoint(client):
    client.post(
        "/users_kyc/register",
        json={
            "email": "me@trustpool.io",
            "mot_de_passe": "password123",
            "pseudonyme": "MeUser"
        }
    )
    
    login_res = client.post(
        "/users_kyc/login",
        json={
            "email": "me@trustpool.io",
            "mot_de_passe": "password123"
        }
    )
    token = login_res.json()["access_token"]
    
    response = client.get(
        "/users_kyc/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@trustpool.io"
