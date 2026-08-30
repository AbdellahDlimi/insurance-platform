"""
Authentification et autorisation partagées par TOUS les modules.
Personne A (Utilisateurs/KYC) émet les tokens (login/refresh).
Tout le monde (A et B) importe get_current_user() et require_role() ici —
personne ne réécrit sa propre vérification de token.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_session


# --- Configuration (lue depuis les variables d'environnement) ---
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY manquante dans les variables d'environnement. "
        "Ajoutez-la dans votre fichier .env"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

oauth2_scheme = HTTPBearer()


class TokenPayload(BaseModel):
    """
    Contenu du JWT — décidé ensemble, ne pas modifier sans en discuter,
    car tous les modules des deux côtés en dépendent.
    """
    user_id: str
    role: str                  # "membre" | "admin_groupe" | "equipe_conformite"
    group_ids: list[str] = []  # groupes dont l'utilisateur est membre/admin


def create_access_token(payload: TokenPayload) -> str:
    to_encode = payload.model_dump()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(payload: TokenPayload) -> str:
    to_encode = payload.model_dump()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    """Décode et valide un token JWT (access ou refresh)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**decoded)
    except jwt.PyJWTError:
        raise credentials_exception


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)) -> TokenPayload:
    """
    Dépendance FastAPI à utiliser dans TOUS les routers (A et B) :

        @router.get("/xxx")
        def my_endpoint(current_user: TokenPayload = Depends(get_current_user)):
            ...
    """
    return decode_token(credentials.credentials)


def require_role(required_role: str):
    """
    Dépendance paramétrable pour restreindre un endpoint à un rôle donné.
    Accepte soit un rôle unique soit plusieurs rôles séparés par une virgule.
    """
    def role_checker(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        allowed = [r.strip() for r in required_role.split(",") if r.strip()]
        if current_user.role not in allowed and not (current_user.role == "admin_plateforme" and "equipe_conformite" in allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès réservé aux rôles: {allowed}",
            )
        return current_user
    return role_checker


def require_roles(*required_roles: str):
    """Permet de spécifier plusieurs rôles autorisés."""
    def role_checker(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        allowed = list(required_roles)
        if current_user.role not in allowed and not (current_user.role == "admin_plateforme" and "equipe_conformite" in allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès réservé aux rôles: {allowed}",
            )
        return current_user
    return role_checker


def require_verified_kyc(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> TokenPayload:
    """
    Vérifie que l'utilisateur connecté dispose d'un dossier KYC validé ('verified').
    Si ce n'est pas le cas, retourne une erreur HTTP 403 avec un message explicite.
    """
    if current_user.role in ["admin_plateforme", "equipe_conformite"]:
        return current_user

    import uuid
    from app.modules.users_kyc.models import CoffreKYC

    kyc = db.query(CoffreKYC).filter(CoffreKYC.utilisateur_id == uuid.UUID(current_user.user_id)).first()
    if not kyc or kyc.statut_verification != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez compléter la vérification d'identité (KYC) avant de pouvoir effectuer cette action.",
        )
    return current_user




