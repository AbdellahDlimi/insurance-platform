from pydantic import BaseModel, ConfigDict
from typing import List
from app.modules.groups.schemas import GroupOut

class ScoreDetail(BaseModel):
    interet: float
    budget: float
    profil: float
    popularite: float

class RecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    groupe: GroupOut
    score_compatibilite: float
    scores_detail: ScoreDetail
    raisons: List[str]
