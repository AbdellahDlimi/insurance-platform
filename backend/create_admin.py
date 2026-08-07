import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.modules.users_kyc.models import Utilisateur
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_admin():
    db = SessionLocal()
    email = "admin@conformite.com"
    existing = db.query(Utilisateur).filter(Utilisateur.email == email).first()
    if existing:
        print("Admin already exists")
        return
    
    admin = Utilisateur(
        pseudonyme="AdminConformite",
        email=email,
        mot_de_passe_hash=get_password_hash("Admin123!"),
        role="admin_plateforme",
        statut_compte="actif"
    )
    db.add(admin)
    db.commit()
    print("Created admin account: admin@conformite.com / Admin123!")

if __name__ == "__main__":
    create_admin()
