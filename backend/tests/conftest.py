import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_session

# Importation de tous les modèles ORM pour s'assurer que Base.metadata les connait
from app.modules.audit.models import JournalAudit, DemandeLeveeAnonymat
from app.modules.users_kyc.models import Utilisateur, CoffreKYC, ProfilOnboarding
from app.modules.notifications.models import Notification
from app.modules.groups.models import Groupe, DemandeAdhesion, Adhesion
from app.modules.claims.models import Sinistre, PieceJustificative, AlerteFraude
from app.modules.cagnotte.models import Cagnotte, Cotisation
from app.modules.notifications.dependencies import get_notification_service
from app.modules.users_kyc import service as kyc_service
import uuid
from datetime import datetime, timezone

class MockNotificationService:
    def notify_welcome(self, *args, **kwargs): pass
    def notify_claim_submitted(self, *args, **kwargs): pass
    def notify_claim_status_changed(self, *args, **kwargs): pass

# Configuration de la base de données PostgreSQL de test
SQLALCHEMY_DATABASE_URL = "postgresql://admin:password@localhost:5432/test_insurance_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def mock_valider_kyc_mock(db_session_factory, user_id):
    db = TestingSessionLocal()
    try:
        from app.modules.users_kyc import repository
        repository.update_kyc_status(db, user_id, "verified", datetime.now(timezone.utc))
        db.commit()
    finally:
        db.close()

kyc_service._valider_kyc_mock = mock_valider_kyc_mock

from sqlalchemy import text

@pytest.fixture(scope="function")
def db_session():
    # Initialiser les tables pour chaque test
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
        except Exception:
            pass
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="function")
def client(db_session):
    """
    TestClient configuré pour utiliser la DB de test au lieu de la DB de prod.
    """
    def override_get_session():
        yield db_session

    def override_get_notification_service():
        return MockNotificationService()

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_notification_service] = override_get_notification_service
    
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_client(client):
    """
    Crée un utilisateur, se connecte, et retourne le client configuré avec le token,
    ainsi que les données de l'utilisateur.
    """
    client.post(
        "/users_kyc/register",
        json={
            "email": "auth@trustpool.io",
            "mot_de_passe": "password123",
            "pseudonyme": "AuthUser"
        }
    )
    login_res = client.post(
        "/users_kyc/login",
        json={"email": "auth@trustpool.io", "mot_de_passe": "password123"}
    )
    token = login_res.json()["access_token"]
    
    client.headers.update({"Authorization": f"Bearer {token}"})
    me_res = client.get("/users_kyc/me")
    
    return {"client": client, "user": me_res.json()}

@pytest.fixture(scope="function")
def verified_client(auth_client):
    """
    Retourne un client authentifié avec le KYC déjà vérifié.
    """
    client = auth_client["client"]
    client.post(
        "/users_kyc/kyc/submit",
        data={
            "nom_complet": "User KYC",
            "date_naissance": "1990-01-01",
            "type_document": "cni"
        },
        files={"file": ("test.pdf", b"pdf content", "application/pdf")}
    )
    import time
    time.sleep(6)  # Attendre que le mock asynchrone passe le statut à 'verified'
    return auth_client
