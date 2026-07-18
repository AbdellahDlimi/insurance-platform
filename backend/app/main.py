"""
Point d'entrée de l'API FastAPI.
Chaque module expose son router, monté ici avec son préfixe.
"""
from fastapi import FastAPI

from app.modules.users_kyc.router import router as users_kyc_router
from app.modules.groups.router import router as groups_router
from app.modules.cagnotte.router import router as cagnotte_router
from app.modules.claims.router import router as claims_router
from app.modules.notifications.router import router as notifications_router
from app.modules.audit.router import router as audit_router

app = FastAPI(title="Plateforme Assurance Collaborative P2P")

app.include_router(users_kyc_router)
app.include_router(groups_router)
app.include_router(cagnotte_router)
app.include_router(claims_router)
app.include_router(notifications_router)
app.include_router(audit_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
