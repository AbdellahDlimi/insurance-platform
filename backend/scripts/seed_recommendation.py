import uuid
import random
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.modules.users_kyc.models import Utilisateur, ProfilOnboarding
from app.modules.groups.models import Groupe, Adhesion

def generate_seeds():
    db = SessionLocal()
    
    print("Seeding data...")
    
    # 1. Create a few admins
    admins = []
    for i in range(3):
        admin = Utilisateur(
            email=f"admin_seed_{i}@example.com",
            mot_de_passe_hash="hash",
            pseudonyme=f"Admin_{i}",
            role="admin_groupe",
            onboarding_complete=True
        )
        db.add(admin)
        admins.append(admin)
    db.commit()
    for a in admins: db.refresh(a)

    # 2. Create Groups
    specialties = ["Santé", "Habitation", "Mobilité Douce", "Animaux", "Voyage", "Électronique"]
    groupes = []
    for i in range(15):
        spec = random.choice(specialties)
        groupe = Groupe(
            nom=f"Groupe {spec} {i}",
            specialite=spec,
            est_ouvert=True,
            capacite_max=random.choice([None, 50, 100]),
            admin_id=random.choice(admins).id,
            cotisation_de_base=random.randint(10, 100),
            buffer_pool_cible=random.randint(500, 5000)
        )
        db.add(groupe)
        groupes.append(groupe)
    db.commit()
    for g in groupes: db.refresh(g)

    # 3. Create Users & Onboarding Profiles
    situations = ["célibataire", "marié", "divorcé", "veuf"]
    priorites = ["prix_bas", "couverture_max", "rapidite"]
    risques = ["prudent", "modere", "ouvert"]
    
    users = []
    for i in range(100):
        user = Utilisateur(
            email=f"user_seed_{i}@example.com",
            mot_de_passe_hash="hash",
            pseudonyme=f"User_{i}",
            role="membre",
            onboarding_complete=True
        )
        db.add(user)
        users.append(user)
    db.commit()
    for u in users: db.refresh(u)
        
    for user in users:
        ints = random.sample([s.lower() for s in specialties], k=random.randint(1, 3))
        profil = ProfilOnboarding(
            utilisateur_id=user.id,
            tranche_age=random.choice(["18-25", "26-35", "36-50", "51+"]),
            situation_pro=random.choice(["etudiant", "salarie", "independant", "retraite"]),
            interets_assurance=ints,
            budget_max_mensuel=random.randint(20, 150),
            niveau_risque=random.choice(risques),
            region="Île-de-France",
            situation_familiale=random.choice(situations),
            nombre_personnes_a_charge=random.randint(0, 3),
            couverture_existante=random.sample([s.lower() for s in specialties], k=random.randint(0, 2)),
            priorite_assurance=random.choice(priorites)
        )
        db.add(profil)
    
    # 4. Create some active adhesions to build popularity score
    for user in users[:50]:
        for _ in range(random.randint(1, 3)):
            g = random.choice(groupes)
            adhesion = Adhesion(
                utilisateur_id=user.id,
                groupe_id=g.id,
                statut="active"
            )
            # ignore duplicates
            try:
                db.add(adhesion)
                db.commit()
            except:
                db.rollback()

    db.commit()
    db.close()
    print("Seed complete!")

if __name__ == "__main__":
    generate_seeds()
