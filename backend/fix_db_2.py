import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from sqlalchemy import text

def fix_db():
    db = SessionLocal()
    
    query = text("""
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'demande_levee_anonymat'::regclass 
    AND confrelid = 'equipe_conformite'::regclass;
    """)
    result = db.execute(query).fetchall()
    
    for row in result:
        conname = row[0]
        print(f"Dropping constraint: {conname}")
        db.execute(text(f"ALTER TABLE demande_levee_anonymat DROP CONSTRAINT {conname}"))
        db.execute(text(f"ALTER TABLE demande_levee_anonymat ADD CONSTRAINT {conname}_fk FOREIGN KEY (valide_par_agent_id) REFERENCES utilisateur(id)"))
    
    db.commit()
    print("Database fixed 2!")

if __name__ == "__main__":
    fix_db()
