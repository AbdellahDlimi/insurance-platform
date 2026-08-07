import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from sqlalchemy import text

def fix_db():
    db = SessionLocal()
    
    # Find constraint name for verifie_par_agent_id
    query = text("""
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'coffre_kyc'::regclass 
    AND confrelid = 'equipe_conformite'::regclass;
    """)
    result = db.execute(query).fetchall()
    
    for row in result:
        conname = row[0]
        print(f"Dropping constraint: {conname}")
        db.execute(text(f"ALTER TABLE coffre_kyc DROP CONSTRAINT {conname}"))
        # Add new constraint referencing utilisateur(id)
        db.execute(text(f"ALTER TABLE coffre_kyc ADD CONSTRAINT {conname}_fk FOREIGN KEY (verifie_par_agent_id) REFERENCES utilisateur(id)"))
    
    db.commit()
    print("Database fixed!")

if __name__ == "__main__":
    fix_db()
