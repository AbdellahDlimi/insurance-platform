import uuid
import math
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.modules.users_kyc.repository import get_profil_onboarding
from app.modules.groups.repository import get_open_groups, get_members_by_group
from app.modules.groups.models import Groupe
from app.modules.claims.models import Sinistre

def _compute_interest_score(profil_interests: list[str], group_specialty: str) -> float:
    if not profil_interests or not group_specialty:
        return 0.0
    
    # Simple TF-IDF cosine similarity
    corpus = [
        " ".join(profil_interests),
        group_specialty
    ]
    try:
        vectorizer = TfidfVectorizer(lowercase=True)
        tfidf_matrix = vectorizer.fit_transform(corpus)
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(sim)
    except ValueError:
        # Fallback if empty vocabulary
        return 0.0

def _compute_budget_score(budget_max: float, cotisation: float) -> float:
    if cotisation <= budget_max:
        return 1.0
    if budget_max <= 0:
        return 0.0
    
    # Gaussian decay
    sigma = budget_max * 0.2  # 20% of budget as standard deviation
    if sigma == 0:
        return 0.0
    score = math.exp(-((cotisation - budget_max)**2) / (2 * sigma**2))
    return float(score)

def _compute_profile_score(profil: dict, groupe: Groupe) -> tuple[float, list[str]]:
    score = 0.0
    raisons = []
    
    # 1. Risque vs Buffer Pool
    niveau_risque = profil.get("niveau_risque", "").lower()
    buffer_cible = float(groupe.buffer_pool_cible or 0)
    cotisation = float(groupe.cotisation_de_base or 0)
    
    if niveau_risque == "prudent":
        if buffer_cible >= cotisation * 10:
            score += 0.3
            raisons.append("Forte réserve de sécurité adaptée à votre profil prudent.")
    elif niveau_risque == "modere":
        if cotisation * 3 <= buffer_cible < cotisation * 10:
            score += 0.2
    elif niveau_risque == "ouvert":
        if buffer_cible < cotisation * 3:
            score += 0.2
            raisons.append("Cotisation optimisée avec un risque partagé (profil ouvert).")
            
    # 2. Situation familiale & personnes à charge
    situation = (profil.get("situation_familiale") or "").lower()
    a_charge = profil.get("nombre_personnes_a_charge") or 0
    specialite = (groupe.specialite or "").lower()
    
    if a_charge > 0 or situation in ["marie", "marié"]:
        if "santé" in specialite or "sante" in specialite or "habitation" in specialite:
            score += 0.3
            raisons.append("Couverture adaptée aux besoins familiaux.")
    
    # 3. Couvertures existantes (anti-redondance)
    existantes = [c.lower() for c in profil.get("couverture_existante") or []]
    redondant = False
    for e in existantes:
        if e in specialite or specialite in e:
            redondant = True
            break
            
    if redondant:
        score -= 0.4
        raisons.append("Attention : risque de doublon avec vos couvertures existantes.")
    else:
        score += 0.2
        
    # 4. Priorité assurance
    priorite = (profil.get("priorite_assurance") or "").lower()
    if priorite == "prix_bas" and cotisation < 30:
        score += 0.2
        raisons.append("Cotisation attractive répondant à votre priorité de prix bas.")
    elif priorite == "couverture_max" and buffer_cible > 1000:
        score += 0.2
        raisons.append("Groupe très capitalisé, idéal pour une couverture maximale.")
        
    return max(0.0, min(1.0, score)), raisons

def _compute_popularity_score(db: Session, groupe: Groupe) -> float:
    # This should idealistically use historical data
    # For now, base it on member count and capacity
    members = get_members_by_group(db, groupe.id)
    nb_members = len(members)
    
    score = 0.0
    if nb_members > 0:
        score += 0.5
        if nb_members > 10:
            score += 0.3
    
    if groupe.capacite_max:
        ratio = nb_members / groupe.capacite_max
        if 0.2 <= ratio <= 0.8:
            score += 0.2  # Optimal filling
    else:
        score += 0.1
        
    return min(1.0, score)


def calculate_compatibility(db: Session, profil: dict, groupe: Groupe) -> tuple[float, dict, list[str]]:
    """Returns (total_score, score_detail, raisons)"""
    # 1. Interest Score (35%)
    interet_score = _compute_interest_score(profil.get("interets_assurance", []), groupe.specialite)
    
    # 2. Budget Score (25%)
    budget_score = _compute_budget_score(
        float(profil.get("budget_max_mensuel", 0)), 
        float(groupe.cotisation_de_base or 0)
    )
    
    # 3. Profile Score (25%)
    profil_score, raisons = _compute_profile_score(profil, groupe)
    
    # 4. Popularity Score (15%)
    popularite_score = _compute_popularity_score(db, groupe)
    
    # Add reason for good interest/budget match
    if interet_score > 0.7:
        raisons.insert(0, f"Correspondance forte avec vos intérêts ({groupe.specialite}).")
    if budget_score > 0.9:
        raisons.append("Parfaitement dans votre budget.")
        
    total_score = (
        interet_score * 0.35 +
        budget_score * 0.25 +
        profil_score * 0.25 +
        popularite_score * 0.15
    )
    
    scores_detail = {
        "interet": interet_score,
        "budget": budget_score,
        "profil": profil_score,
        "popularite": popularite_score
    }
    
    return round(total_score, 4), scores_detail, list(set(raisons))


def recommend_groups(db: Session, user_id: uuid.UUID) -> list[dict]:
    profil = get_profil_onboarding(db, user_id)
    if not profil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil d'onboarding introuvable. Veuillez compléter votre profil."
        )
        
    profil_dict = {
        "interets_assurance": profil.interets_assurance,
        "budget_max_mensuel": float(profil.budget_max_mensuel),
        "niveau_risque": profil.niveau_risque,
        "situation_familiale": profil.situation_familiale,
        "nombre_personnes_a_charge": profil.nombre_personnes_a_charge,
        "couverture_existante": profil.couverture_existante,
        "priorite_assurance": profil.priorite_assurance
    }

    groupes = get_open_groups(db)
    
    recommendations = []
    for groupe in groupes:
        total_score, detail, raisons = calculate_compatibility(db, profil_dict, groupe)
        if total_score > 0.1:
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
                "score_compatibilite": total_score,
                "scores_detail": detail,
                "raisons": raisons
            })
            
    recommendations.sort(key=lambda x: x["score_compatibilite"], reverse=True)
    return recommendations[:5]

def get_recommendation_explanation(db: Session, user_id: uuid.UUID, groupe_id: uuid.UUID) -> dict:
    from app.modules.groups.repository import get_group_by_id
    
    profil = get_profil_onboarding(db, user_id)
    if not profil:
        raise HTTPException(status_code=404, detail="Profil introuvable")
        
    groupe = get_group_by_id(db, groupe_id)
    if not groupe:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
        
    profil_dict = {
        "interets_assurance": profil.interets_assurance,
        "budget_max_mensuel": float(profil.budget_max_mensuel),
        "niveau_risque": profil.niveau_risque,
        "situation_familiale": profil.situation_familiale,
        "nombre_personnes_a_charge": profil.nombre_personnes_a_charge,
        "couverture_existante": profil.couverture_existante,
        "priorite_assurance": profil.priorite_assurance
    }
    
    total_score, detail, raisons = calculate_compatibility(db, profil_dict, groupe)
    
    return {
        "groupe_id": groupe.id,
        "score_compatibilite": total_score,
        "scores_detail": detail,
        "raisons": raisons
    }
