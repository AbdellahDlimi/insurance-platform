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

# --- Configuration (lue depuis les variables d'environnement) ---
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY manquante dans les variables d'environnement. "
        "Ajoutez-la dans votre fichier .env"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

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


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)) -> TokenPayload:
    """
    Dépendance FastAPI à utiliser dans TOUS les routers (A et B) :

        @router.get("/xxx")
        def my_endpoint(current_user: TokenPayload = Depends(get_current_user)):
            ...
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(**decoded)
    except jwt.PyJWTError:
        raise credentials_exception


def require_role(required_role: str):
    """
    Dépendance paramétrable pour restreindre un endpoint à un rôle donné :

        @router.post("/xxx")
        def admin_only(current_user: TokenPayload = Depends(require_role("admin_groupe"))):
            ...
    """
    def role_checker(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès réservé au rôle '{required_role}'",
            )
        return current_user
    return role_checker
