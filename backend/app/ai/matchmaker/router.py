import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session
from app.ai.matchmaker.engine import recommend_groups
from app.modules.groups.schemas import GroupOut

router = APIRouter(prefix="/ai/matchmaker", tags=["matchmaker"])

class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    groupe: GroupOut
    score_compatibilite: float

@router.get("/recommendations", response_model=List[RecommendationOut])
def get_recommendations(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Retourne les groupes recommandés pour l'utilisateur connecté basés sur son profil d'onboarding.
    """
    return recommend_groups(db, uuid.UUID(current_user.user_id))
