import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session
from app.ai.matchmaker.engine import recommend_groups, get_recommendation_explanation
from app.ai.matchmaker.schemas import RecommendationOut

router = APIRouter(prefix="/ai/matchmaker", tags=["matchmaker"])

@router.get("/recommendations", response_model=List[RecommendationOut])
def get_recommendations_endpoint(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Retourne les groupes recommandés pour l'utilisateur connecté basés sur son profil d'onboarding.
    """
    return recommend_groups(db, uuid.UUID(current_user.user_id))

@router.get("/recommendations/{groupe_id}/explain")
def explain_recommendation_endpoint(
    groupe_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Retourne le détail du scoring pour un groupe donné.
    """
    return get_recommendation_explanation(db, uuid.UUID(current_user.user_id), groupe_id)
