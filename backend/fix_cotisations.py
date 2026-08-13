import uuid
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.modules.groups.models import Adhesion, Groupe
from app.modules.cagnotte.models import Cagnotte, Cotisation
from app.modules.cagnotte.repository import create_cotisation

db = SessionLocal()
groups = db.query(Groupe).all()
count = 0

for group in groups:
    cagnotte = db.query(Cagnotte).filter(Cagnotte.groupe_id == group.id).first()
    if not cagnotte: continue
    
    # Check if a cotisation has been called for this period
    already_called = db.query(Cotisation).filter(
        Cotisation.cagnotte_id == cagnotte.id,
        Cotisation.periode == cagnotte.periode_courante
    ).first() is not None
    
    if already_called:
        adhesions = db.query(Adhesion).filter(Adhesion.groupe_id == group.id, Adhesion.statut == "active").all()
        for adhesion in adhesions:
            exists = db.query(Cotisation).filter(
                Cotisation.adhesion_id == adhesion.id,
                Cotisation.cagnotte_id == cagnotte.id,
                Cotisation.periode == cagnotte.periode_courante
            ).first() is not None
            
            if not exists:
                print(f"Creating missing cotisation for adhesion {adhesion.id} in group {group.nom}")
                create_cotisation(
                    db=db,
                    adhesion_id=adhesion.id,
                    cagnotte_id=cagnotte.id,
                    montant_base=float(group.cotisation_de_base),
                    coefficient_applique=float(adhesion.coefficient_actuel),
                    montant_final=float(group.cotisation_de_base) * float(adhesion.coefficient_actuel),
                    periode=cagnotte.periode_courante,
                    statut_paiement="en_attente"
                )
                count += 1

print(f"Created {count} missing cotisations.")
