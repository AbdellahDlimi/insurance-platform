import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.users_kyc.repository import get_profil_onboarding
from app.modules.groups.repository import get_open_groups
from app.modules.groups.models import Groupe


def calculate_compatibility_score(profil: dict, groupe: Groupe) -> float:
    """
    Calcule un score de compatibilité (0 à 1) entre un profil utilisateur et un groupe.
    """
    score = 0.0
    
    # 1. Match spécialité ↔ intérêts (40%)
    # On suppose que la spécialité du groupe est une string simple 
    # et que les intérêts sont une liste de strings. 
    # On va normaliser pour comparer (lower, strip).
    interets_normalises = [i.lower().strip() for i in profil.get("interets_assurance", [])]
    specialite_groupe = (groupe.specialite or "").lower().strip()
    
    if specialite_groupe in interets_normalises:
        score += 0.40
    else:
        # Partial match si un mot de la spécialité est dans les intérêts
        for interet in interets_normalises:
            if interet in specialite_groupe or specialite_groupe in interet:
                score += 0.20
                break
                
    # 2. Match budget (30%)
    budget_max = float(profil.get("budget_max_mensuel", 0))
    cotisation = float(groupe.cotisation_de_base or 0)
    
    if cotisation <= budget_max:
        score += 0.30
    elif cotisation <= budget_max * 1.2:
        # Si on dépasse de 20% max, on donne la moitié des points
        score += 0.15
        
    # 3. Match risque (15%)
    # Logique simplifiée : si le profil est prudent, on privilégie les groupes avec un buffer pool élevé
    niveau_risque = profil.get("niveau_risque", "").lower()
    buffer_cible = float(groupe.buffer_pool_cible or 0)
    if niveau_risque == "prudent" and buffer_cible > 0:
        score += 0.15
    elif niveau_risque == "modere":
        score += 0.10
    elif niveau_risque == "ouvert":
        score += 0.15
    
    # 4. Bonus attractivité globale (15%)
    # On pourrait utiliser le nombre de membres ou l'ancienneté. 
    # Pour l'instant, on donne un score fixe ou aléatoire pour simuler l'attractivité
    # Si le groupe a de la capacité
    if groupe.capacite_max is None or groupe.capacite_max > 0:
        score += 0.15

    return round(min(score, 1.0), 4)


def recommend_groups(db: Session, user_id: uuid.UUID) -> list[dict]:
    """
    Retourne la liste des groupes recommandés pour un utilisateur, triée par score décroissant.
    """
    # 1. Récupérer le profil onboarding
    profil = get_profil_onboarding(db, user_id)
    if not profil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil d'onboarding introuvable. Veuillez compléter votre profil."
        )
        
    profil_dict = {
        "interets_assurance": profil.interets_assurance,
        "budget_max_mensuel": float(profil.budget_max_mensuel),
        "niveau_risque": profil.niveau_risque
    }

    # 2. Récupérer les groupes ouverts
    groupes = get_open_groups(db)
    
    recommendations = []
    for groupe in groupes:
        score = calculate_compatibility_score(profil_dict, groupe)
        if score > 0.1:  # Filtrer les groupes avec un score trop bas
            recommendations.append({
                "groupe": {
                    "id": groupe.id,
                    "nom": groupe.nom,
                    "specialite": groupe.specialite,
                    "est_ouvert": groupe.est_ouvert,
                    "capacite_max": groupe.capacite_max,
                    "admin_id": groupe.admin_id,
                    "cotisation_de_base": float(groupe.cotisation_de_base),
                    "buffer_pool_cible": float(groupe.buffer_pool_cible) if groupe.buffer_pool_cible else None,
                    "reglement_pdf_url": groupe.reglement_pdf_url
                },
                "score_compatibilite": score
            })
            
    # 3. Trier par score décroissant
    recommendations.sort(key=lambda x: x["score_compatibilite"], reverse=True)
    
    # Retourner les top 5
    return recommendations[:5]
