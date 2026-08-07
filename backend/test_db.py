from app.database import get_db, SessionLocal
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from app.modules.users_kyc.models import CoffreKYC

db = SessionLocal()
coffre = db.query(CoffreKYC).first()
if coffre:
    print(f"Coffre: {coffre.id}, user: {coffre.utilisateur_id}")
else:
    print("No coffre")
