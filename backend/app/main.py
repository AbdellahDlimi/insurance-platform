"""
Point d'entrée de l'API FastAPI.
Chaque module expose son router, monté ici avec son préfixe.
"""
from dotenv import load_dotenv
load_dotenv()

from uuid import uuid4
from fastapi import FastAPI, Query

from app.core.auth import TokenPayload, create_access_token

# ── Modules Personne B ────────────────────────────────────────────────────────
from app.modules.claims.router import router as claims_router
from app.modules.notifications.router import router as notifications_router
from app.modules.audit.router import router as audit_router

# ── Modules Personne A ────────────────────────────────────────────────────────
from app.modules.users_kyc.router import router as users_kyc_router
from app.modules.groups.router import router as groups_router
from app.modules.cagnotte.router import router as cagnotte_router

app = FastAPI(title="Plateforme Assurance Collaborative P2P")

# ── CORS Middleware ──────────────────────────────────────────────────────────
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modules Personne B
app.include_router(claims_router)
app.include_router(notifications_router)
app.include_router(audit_router)

# Modules Personne A
app.include_router(users_kyc_router)
app.include_router(groups_router)
app.include_router(cagnotte_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ── DEV ONLY — Endpoint pour générer un token de test ────────────────────────
# ⚠️ À SUPPRIMER avant la mise en production !

@app.get("/dev/token", tags=["dev"], summary="Générer un JWT de test")
def dev_token(
    role: str = Query(
        "membre",
        enum=["membre", "admin_groupe", "equipe_conformite"],
        description="Rôle à attribuer au token de test",
    ),
    user_id: str = Query(None, description="UUID utilisateur (auto-généré si vide)"),
    group_id: str = Query(None, description="UUID groupe à inclure (optionnel)"),
):
    """
    🔧 **Dev uniquement** — Génère un token JWT valide pour tester les endpoints protégés.

    Exemples d'utilisation :
    - `/dev/token` → token membre par défaut
    - `/dev/token?role=admin_groupe` → token admin
    - `/dev/token?role=admin_groupe&group_id=xxx` → token admin avec groupe
    """
    payload = TokenPayload(
        user_id=user_id or str(uuid4()),
        role=role,
        group_ids=[group_id] if group_id else [],
    )
    token = create_access_token(payload)
    return {
        "access_token": token,
        "token_type": "bearer",
        "payload": payload.model_dump(),
        "usage": f'Dans Swagger : cliquer sur 🔒 Authorize → entrer : Bearer {token[:20]}...',
    }
