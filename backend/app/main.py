"""
Point d'entrée de l'API FastAPI.
Chaque module expose son router, monté ici avec son préfixe.
"""
from dotenv import load_dotenv

load_dotenv()

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


@app.on_event("startup")
def startup_event():
    # Démarre les consommateurs Kafka dans des threads d'arrière-plan
    from app.core.database import SessionLocal
    from app.modules.users_kyc.events import consume_anonymity_lift_approved
    from app.modules.cagnotte.events import consume_claim_validated

    consume_anonymity_lift_approved(SessionLocal)
    consume_claim_validated(SessionLocal)


@app.get("/health")
def health_check():
    return {"status": "ok"}

