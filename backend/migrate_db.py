import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    db.execute(text("ALTER TABLE equipe_conformite ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;"))
    db.execute(text("ALTER TABLE equipe_conformite ADD COLUMN IF NOT EXISTS mot_de_passe_hash VARCHAR(255);"))
    db.execute(text("ALTER TABLE equipe_conformite ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();"))
    print("Columns added to equipe_conformite.")
except Exception as e:
    print(f"Error adding columns: {e}")

try:
    db.execute(text("ALTER TABLE coffre_kyc DROP CONSTRAINT IF EXISTS coffre_kyc_verifie_par_agent_id_fkey;"))
    db.execute(text("ALTER TABLE coffre_kyc DROP CONSTRAINT IF EXISTS coffre_kyc_verifie_par_agent_id_fkey_fk;"))
    db.execute(text("ALTER TABLE coffre_kyc ADD CONSTRAINT coffre_kyc_verifie_par_agent_id_fkey FOREIGN KEY (verifie_par_agent_id) REFERENCES equipe_conformite(id);"))
    
    db.execute(text("ALTER TABLE demande_levee_anonymat DROP CONSTRAINT IF EXISTS demande_levee_anonymat_valide_par_agent_id_fkey;"))
    db.execute(text("ALTER TABLE demande_levee_anonymat DROP CONSTRAINT IF EXISTS demande_levee_anonymat_valide_par_agent_id_fkey_fk;"))
    db.execute(text("ALTER TABLE demande_levee_anonymat ADD CONSTRAINT demande_levee_anonymat_valide_par_agent_id_fkey FOREIGN KEY (valide_par_agent_id) REFERENCES equipe_conformite(id);"))
    
    db.commit()
    print("Database altered successfully!")
except Exception as e:
    db.rollback()
    print(f"Error executing DB update: {e}")
