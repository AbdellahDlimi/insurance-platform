import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from app.modules.users_kyc.models import EquipeConformite, Utilisateur
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

# Delete old user if exists
old_admin = db.query(Utilisateur).filter(Utilisateur.email == "admin@conformite.com").first()
if old_admin:
    db.delete(old_admin)
    db.commit()
    print("Deleted old admin from utilisateur")

# Create in equipe_conformite
agent = db.query(EquipeConformite).filter(EquipeConformite.email == "admin@conformite.com").first()
if not agent:
    agent = EquipeConformite(
        nom="AdminConformite",
        email="admin@conformite.com",
        mot_de_passe_hash=pwd_context.hash("Admin123!")
    )
    db.add(agent)
    db.commit()
    print("Agent created in equipe_conformite!")
else:
    print("Agent already exists in equipe_conformite.")
