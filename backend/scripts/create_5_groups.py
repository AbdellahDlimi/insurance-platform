import sys
import os
from datetime import datetime
import uuid
import random

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.modules.users_kyc.models import Utilisateur
from app.modules.groups.models import Groupe, Adhesion
from app.modules.cagnotte.models import Cagnotte, Cotisation

def create_5_groups_for_admin(admin_email="abdellah@gmail.com"):
    db = SessionLocal()
    try:
        # 1. Récupérer ou promouvoir l'administrateur
        admin = db.query(Utilisateur).filter(Utilisateur.email == admin_email).first()
        if not admin:
            # Si pas trouvé, prendre le premier admin_groupe ou premier utilisateur
            admin = db.query(Utilisateur).filter(Utilisateur.role == "admin_groupe").first()
            if not admin:
                admin = db.query(Utilisateur).first()
        
        if not admin:
            print("[ERREUR] Aucun utilisateur trouvé dans la base de données pour être admin.")
            return

        # S'assurer qu'il a le rôle admin_groupe
        admin.role = "admin_groupe"
        db.commit()
        db.refresh(admin)
        print(f"[OK] Administrateur cible : {admin.pseudonyme} ({admin.email}) [ID: {admin.id}]")

        # 2. Définition des 5 nouveaux groupes
        new_groups_data = [
            {
                "nom": "Tech Nomads & Freelances",
                "specialite": "Électronique & Matériel Pro",
                "cotisation_de_base": 35.00,
                "buffer_pool_cible": 2500.00,
                "capacite_max": 50,
                "solde_initial": 18450.00,
                "buffer_initial": 2500.00,
            },
            {
                "nom": "Cyclistes & Mobilité Douce",
                "specialite": "Mobilité Douce",
                "cotisation_de_base": 20.00,
                "buffer_pool_cible": 1200.00,
                "capacite_max": 100,
                "solde_initial": 9600.00,
                "buffer_initial": 1200.00,
            },
            {
                "nom": "Santé & Soins Holistiques",
                "specialite": "Santé & Bien-être",
                "cotisation_de_base": 45.00,
                "buffer_pool_cible": 3500.00,
                "capacite_max": 75,
                "solde_initial": 24800.00,
                "buffer_initial": 3500.00,
            },
            {
                "nom": "Propriétaires & Co-living Solidaire",
                "specialite": "Habitation",
                "cotisation_de_base": 30.00,
                "buffer_pool_cible": 2000.00,
                "capacite_max": 60,
                "solde_initial": 15300.00,
                "buffer_initial": 2000.00,
            },
            {
                "nom": "Voyageurs & Éco-Aventure",
                "specialite": "Voyage & Équipement",
                "cotisation_de_base": 25.00,
                "buffer_pool_cible": 1800.00,
                "capacite_max": 80,
                "solde_initial": 12250.00,
                "buffer_initial": 1800.00,
            },
        ]

        current_period = datetime.utcnow().strftime("%Y-%m")
        other_users = db.query(Utilisateur).filter(Utilisateur.id != admin.id).all()

        created_groups = []
        for g_data in new_groups_data:
            # Vérifier si un groupe avec le même nom existe déjà
            existing = db.query(Groupe).filter(Groupe.nom == g_data["nom"]).first()
            if existing:
                print(f"[INFO] Le groupe '{g_data['nom']}' existe déjà. Mise à jour de l'admin...")
                existing.admin_id = admin.id
                db.commit()
                created_groups.append(existing)
                continue

            # Créer le groupe
            groupe = Groupe(
                id=uuid.uuid4(),
                nom=g_data["nom"],
                specialite=g_data["specialite"],
                est_ouvert=True,
                capacite_max=g_data["capacite_max"],
                admin_id=admin.id,
                cotisation_de_base=g_data["cotisation_de_base"],
                buffer_pool_cible=g_data["buffer_pool_cible"],
            )
            db.add(groupe)
            db.commit()
            db.refresh(groupe)

            # Créer l'adhésion de l'admin
            adhesion_admin = Adhesion(
                id=uuid.uuid4(),
                utilisateur_id=admin.id,
                groupe_id=groupe.id,
                statut="active",
                coefficient_actuel=1.0,
                nb_sinistres_periode=0,
                date_adhesion=datetime.utcnow()
            )
            db.add(adhesion_admin)

            # Créer la cagnotte associée
            cagnotte = Cagnotte(
                id=uuid.uuid4(),
                groupe_id=groupe.id,
                solde_actuel=g_data["solde_initial"],
                solde_buffer_pool=g_data["buffer_initial"],
                periode_courante=current_period,
            )
            db.add(cagnotte)
            db.commit()

            # Ajouter quelques autres membres existants pour rendre le groupe vivant
            if other_users:
                sample_members = random.sample(other_users, min(len(other_users), random.randint(3, 7)))
                for m in sample_members:
                    adh_member = Adhesion(
                        id=uuid.uuid4(),
                        utilisateur_id=m.id,
                        groupe_id=groupe.id,
                        statut="active",
                        coefficient_actuel=round(random.choice([0.9, 1.0, 1.0, 1.1, 1.2]), 2),
                        nb_sinistres_periode=random.choice([0, 0, 0, 1]),
                        date_adhesion=datetime.utcnow()
                    )
                    db.add(adh_member)
                db.commit()

            created_groups.append(groupe)
            print(f"[SUCCÈS] Groupe créé : '{groupe.nom}' (Admin: {admin.pseudonyme}, Solde: {g_data['solde_initial']} €)")

        print(f"\n[TOTAL] {len(created_groups)} groupes sont désormais administrés par {admin.pseudonyme} ({admin.email}) !")

    except Exception as e:
        db.rollback()
        print(f"[ERREUR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    target_email = sys.argv[1] if len(sys.argv) > 1 else "abdellah@gmail.com"
    create_5_groups_for_admin(target_email)
