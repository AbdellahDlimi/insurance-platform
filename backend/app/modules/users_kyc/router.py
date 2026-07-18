"""
Router FastAPI du module users_kyc.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(prefix="/users_kyc", tags=["users_kyc"])

# TODO: définir les endpoints (voir le PDF de répartition des tâches)
