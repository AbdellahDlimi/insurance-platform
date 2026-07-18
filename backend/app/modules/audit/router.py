"""
Router FastAPI du module audit.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])

# TODO: définir les endpoints (voir le PDF de répartition des tâches)
