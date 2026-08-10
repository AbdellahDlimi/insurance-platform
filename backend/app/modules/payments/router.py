from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
import stripe

from app.core.database import get_session
from app.modules.cagnotte.models import Cotisation
import app.config as cfg
import app.modules.payments.service as payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-checkout-session/{cotisation_id}")
def create_checkout_session(cotisation_id: UUID, db: Session = Depends(get_session)):
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if not cotisation:
        raise HTTPException(status_code=404, detail="Cotisation non trouvée")
    
    if cotisation.statut_paiement == "paye":
        raise HTTPException(status_code=400, detail="Cotisation déjà payée")

    session_url = payment_service.create_stripe_checkout_session(cotisation)
    return {"url": session_url}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_session)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not cfg.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, cfg.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print("Webhook Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            cotisation_id = getattr(session, 'client_reference_id', None)
            if cotisation_id:
                payment_service.handle_successful_payment(db, cotisation_id)
    except Exception as e:
        print("Webhook Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")

    return {"status": "success"}


@router.post("/confirm/{cotisation_id}")
def confirm_payment(cotisation_id: UUID, db: Session = Depends(get_session)):
    """
    Public endpoint called by frontend after Stripe redirect.
    Marks the cotisation as paid and credits the cagnotte.
    No auth required — the UUID is unguessable and serves as proof.
    Idempotent: calling this on an already-paid cotisation is a no-op.
    """
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if not cotisation:
        raise HTTPException(status_code=404, detail="Cotisation non trouvée")

    if cotisation.statut_paiement == "paye":
        return {"status": "already_paid", "cotisation_id": str(cotisation_id)}

    # Delegate to the shared service method for idempotency, cagnotte credit, and notifications
    payment_service.handle_successful_payment(db, str(cotisation_id))

    return {"status": "confirmed", "cotisation_id": str(cotisation_id)}

