import stripe
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import app.config as cfg
from app.modules.cagnotte.models import Cotisation

stripe.api_key = cfg.STRIPE_SECRET_KEY

def create_stripe_checkout_session(cotisation: Cotisation) -> str:
    # Since uvicorn caches env vars, we hardcode to 3000 which is the user's dev port
    frontend_url = "http://localhost:3000"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': f'Cotisation TrustPool',
                        'description': f'Paiement de la cotisation',
                    },
                    'unit_amount': int(cotisation.montant_final * 100), # Stripe uses cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{frontend_url}/payment/success',
            cancel_url=f'{frontend_url}/payment/cancel',
            client_reference_id=str(cotisation.id),
        )
        return session.url
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def handle_successful_payment(db: Session, cotisation_id: str):
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if cotisation and cotisation.statut_paiement != "paye":
        cotisation.statut_paiement = "paye"
        cotisation.paye_le = datetime.now(timezone.utc)
        db.commit()
