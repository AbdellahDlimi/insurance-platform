import os
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from apscheduler.schedulers.background import BackgroundScheduler

from app.modules.cagnotte import repository
from app.modules.cagnotte.models import Cagnotte, Cotisation
from app.modules.cagnotte.events import produce_cotisation_recalculated
from app.modules.groups.models import Groupe, Adhesion
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

# Configuration du Bonus-Malus (depuis les variables d'env, avec valeurs par défaut pour le MVP)
MALUS_PAR_SINISTRE = float(os.environ.get("MALUS_PAR_SINISTRE", 0.20))
BONUS_PAR_PERIODE = float(os.environ.get("BONUS_PAR_PERIODE", 0.05))
COEFFICIENT_MIN = float(os.environ.get("COEFFICIENT_MIN", 0.50))
COEFFICIENT_MAX = float(os.environ.get("COEFFICIENT_MAX", 2.00))


def _obtenir_periode_actuelle() -> str:
    """Renvoie la période courante sous format YYYY-MM."""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def incrementer_periode(periode: str) -> str:
    """Incrémente une période au format YYYY-MM de un mois."""
    try:
        year, month = map(int, periode.split("-"))
        month += 1
        if month > 12:
            month = 1
            year += 1
        return f"{year:04d}-{month:02d}"
    except Exception:
        return _obtenir_periode_actuelle()


def creer_cagnotte_initiale(db: Session, groupe_id: uuid.UUID) -> Cagnotte:
    """
    Initialise la cagnotte pour un nouveau groupe avec un solde à 0.
    """
    periode = _obtenir_periode_actuelle()
    return repository.create_cagnotte(db, groupe_id, periode)


def process_claim_validated(db: Session, payload: dict) -> None:
    """
    Consomme claim.validated:
    1. Incrémente nb_sinistres_periode pour l'adhésion concernée.
    2. (Option A) Calcule immédiatement le malus (+0.20 par sinistre), met à jour le coefficient.
    3. Déduit le montant approuvé du solde de la cagnotte du groupe.
    4. Crée ou met à jour la cotisation pour la période en cours et publie cotisation.recalculated.
    """
    adhesion_id_str = payload.get("adhesion_id")
    groupe_id_str = payload.get("groupe_id")
    utilisateur_id_str = payload.get("utilisateur_id")
    montant_approuve = float(payload.get("montant_approuve", 0.00))

    if not (adhesion_id_str and groupe_id_str and utilisateur_id_str):
        logger.error(f"[Cagnotte] Payload claim.validated invalide : {payload}")
        return

    adhesion_id = uuid.UUID(adhesion_id_str)
    groupe_id = uuid.UUID(groupe_id_str)
    utilisateur_id = uuid.UUID(utilisateur_id_str)

    # 1. Charger l'adhésion et le groupe
    adhesion = db.query(Adhesion).filter(Adhesion.id == adhesion_id).first()
    groupe = db.query(Groupe).filter(Groupe.id == groupe_id).first()
    cagnotte = repository.get_cagnotte_by_group_id(db, groupe_id)

    if not (adhesion and groupe and cagnotte):
        logger.error(f"[Cagnotte] Entités manquantes pour le traitement : Adhesion={adhesion}, Groupe={groupe}, Cagnotte={cagnotte}")
        return

    # 2. Mettre à jour la cagnotte (déduction du sinistre approuvé)
    ancien_solde = float(cagnotte.solde_actuel)
    cagnotte.solde_actuel = max(0.00, float(cagnotte.solde_actuel) - montant_approuve)
    
    # Si le solde ne suffit pas, on tape dans le buffer pool (c'est le rôle du fonds mutuel)
    reste_a_payer = montant_approuve - (ancien_solde - float(cagnotte.solde_actuel))
    if reste_a_payer > 0:
        cagnotte.solde_buffer_pool = max(0.00, float(cagnotte.solde_buffer_pool) - reste_a_payer)

    # 3. Incrémenter le nombre de sinistres et calculer le malus immédiat
    ancien_coeff = float(adhesion.coefficient_actuel)
    adhesion.nb_sinistres_periode += 1
    
    # Application du Malus immédiat
    nouveau_coeff = min(COEFFICIENT_MAX, ancien_coeff + MALUS_PAR_SINISTRE)
    adhesion.coefficient_actuel = nouveau_coeff

    # 4. Mettre à jour ou créer la cotisation pour la période en cours
    montant_final = float(groupe.cotisation_de_base) * nouveau_coeff
    
    # Rechercher si une cotisation existe déjà pour cette adhésion dans cette cagnotte
    cotisation = db.query(Cotisation).filter(
        Cotisation.adhesion_id == adhesion.id,
        Cotisation.cagnotte_id == cagnotte.id
    ).first()

    if cotisation:
        cotisation.coefficient_applique = nouveau_coeff
        cotisation.montant_final = montant_final
    else:
        cotisation = repository.create_cotisation(
            db=db,
            adhesion_id=adhesion.id,
            cagnotte_id=cagnotte.id,
            montant_base=float(groupe.cotisation_de_base),
            coefficient_applique=nouveau_coeff,
            montant_final=montant_final,
        )

    db.commit()
    logger.info(f"[Cagnotte] Sinistre traité pour l'adhésion {adhesion.id}. Coefficient passe de {ancien_coeff} à {nouveau_coeff}.")

    # 5. Publier l'événement cotisation.recalculated
    produce_cotisation_recalculated(
        adhesion_id=adhesion.id,
        utilisateur_id=utilisateur_id,
        groupe_id=groupe.id,
        ancien_coefficient=ancien_coeff,
        nouveau_coefficient=nouveau_coeff,
        montant_final=montant_final,
        periode=cagnotte.periode_courante,
    )


def recalculer_fin_de_periode(db: Session) -> dict:
    """
    Exécute le traitement de fin de période pour tous les groupes :
    - Si l'adhérent n'a eu AUCUN sinistre dans la période échue, on lui applique le bonus (-0.05).
    - Si l'adhérent a eu des sinistres, son malus a déjà été appliqué immédiatement.
    - Réinitialise le compteur de sinistres de la période.
    - Transitionne la cagnotte vers la période suivante.
    - Crée la nouvelle cotisation 'en_attente' pour la nouvelle période.
    """
    cagnottes = db.query(Cagnotte).all()
    groupes_traites = 0
    membres_traites = 0

    for cagnotte in cagnottes:
        groupe = db.query(Groupe).filter(Groupe.id == cagnotte.groupe_id).first()
        if not groupe:
            continue
            
        periode_echue = cagnotte.periode_courante
        nouvelle_periode = incrementer_periode(periode_echue)
        
        # Mettre à jour la période courante de la cagnotte
        cagnotte.periode_courante = nouvelle_periode
        db.commit()

        # Récupérer tous les membres actifs du groupe
        adhesions = db.query(Adhesion).filter(
            Adhesion.groupe_id == cagnotte.groupe_id,
            Adhesion.statut == "active"
        ).all()

        for adhesion in adhesions:
            ancien_coeff = float(adhesion.coefficient_actuel)
            
            # Application du Bonus si 0 sinistres dans la période
            if adhesion.nb_sinistres_periode == 0:
                nouveau_coeff = max(COEFFICIENT_MIN, ancien_coeff - BONUS_PAR_PERIODE)
                adhesion.coefficient_actuel = nouveau_coeff
            else:
                nouveau_coeff = ancien_coeff  # Déjà pénalisé en temps réel
            
            # Réinitialisation du compteur pour la nouvelle période
            adhesion.nb_sinistres_periode = 0
            
            # Calcul du montant pour la nouvelle période
            montant_final = float(groupe.cotisation_de_base) * nouveau_coeff
            
            # Création de la cotisation pour la nouvelle période
            repository.create_cotisation(
                db=db,
                adhesion_id=adhesion.id,
                cagnotte_id=cagnotte.id,
                montant_base=float(groupe.cotisation_de_base),
                coefficient_applique=nouveau_coeff,
                montant_final=montant_final,
                statut_paiement="en_attente"
            )

            db.commit()

            # Publier cotisation.recalculated
            produce_cotisation_recalculated(
                adhesion_id=adhesion.id,
                utilisateur_id=adhesion.utilisateur_id,
                groupe_id=groupe.id,
                ancien_coefficient=ancien_coeff,
                nouveau_coefficient=nouveau_coeff,
                montant_final=montant_final,
                periode=nouvelle_periode,
            )
            membres_traites += 1
        
        groupes_traites += 1

    return {"groupes_traites": groupes_traites, "membres_traites": membres_traites}


def payer_cotisation(db: Session, cotisation_id: uuid.UUID, user_id: uuid.UUID) -> Cotisation:
    """
    Permet à un adhérent de régler sa cotisation en attente.
    Bascule le statut à 'paye', renseigne la date et crédite la cagnotte du groupe.
    """
    cotisation = repository.get_cotisation_by_id(db, cotisation_id)
    if not cotisation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La cotisation spécifiée est introuvable.",
        )

    # Vérifier le propriétaire de l'adhésion associée à la cotisation
    adhesion = db.query(Adhesion).filter(Adhesion.id == cotisation.adhesion_id).first()
    if not adhesion or adhesion.utilisateur_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le titulaire de cette cotisation.",
        )

    if cotisation.statut_paiement == "paye":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette cotisation a déjà été réglée.",
        )

    now = datetime.now(timezone.utc)
    updated_cotisation = repository.update_cotisation_paiement(db, cotisation_id, now)
    
    # Créditer la cagnotte du groupe
    repository.crediter_cagnotte(db, cotisation.cagnotte_id, float(cotisation.montant_final))
    
    return updated_cotisation



# Initialisation du planificateur APScheduler pour exécuter le job de fin de période automatiquement
def _job_recalcul_automatique():
    """Wrapper pour exécuter le recalcul avec une session DB propre."""
    logger.info("[Scheduler] Lancement du recalcul automatique des cotisations...")
    db = SessionLocal()
    try:
        resultat = recalculer_fin_de_periode(db)
        logger.info(f"[Scheduler] Recalcul terminé : {resultat}")
    except Exception as e:
        logger.error(f"[Scheduler] Erreur pendant le recalcul automatique : {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()
# On planifie le job pour s'exécuter par exemple toutes les 24 heures (ou au début de chaque mois en production)
# Pour les besoins du MVP et des tests, on peut le laisser disponible à la configuration ou déclenchable manuellement.
# Ici on ajoute une exécution quotidienne par défaut (ex: tous les jours à minuit).
scheduler.add_job(_job_recalcul_automatique, 'interval', days=1, id='recalcul_cotisations_daily')
scheduler.start()
