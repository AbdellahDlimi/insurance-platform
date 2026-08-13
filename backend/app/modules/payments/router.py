import stripe
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.auth import get_current_user, TokenPayload
from app.modules.cagnotte.models import Cotisation
from app.modules.groups.models import Adhesion
from app.modules.payments.models import Payment
from app.modules.payments.schemas import PaymentOut, CheckoutSessionOut
import app.modules.payments.service as payment_service
import app.config as cfg

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-checkout-session/{cotisation_id}", response_model=CheckoutSessionOut, summary="Créer une session Stripe Checkout")
def create_checkout_session(
    cotisation_id: UUID, 
    current_user: TokenPayload = Depends(get_current_user), 
    db: Session = Depends(get_session)
):
    """
    Crée une session Stripe Checkout pour régler une cotisation spécifique.
    Vérifie que la cotisation existe, n'est pas déjà payée, et que l'utilisateur y a accès.
    """
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if not cotisation:
        raise HTTPException(status_code=404, detail="Cotisation non trouvée.")

    if cotisation.statut_paiement == "paye":
        raise HTTPException(status_code=400, detail="Cotisation déjà payée.")

    # Vérification d'accès : l'utilisateur doit être lié à l'adhésion de la cotisation
    adhesion = db.query(Adhesion).filter(Adhesion.id == cotisation.adhesion_id).first()
    if not adhesion or str(adhesion.utilisateur_id) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Non autorisé à payer cette cotisation.")

    user_id = UUID(current_user.user_id)
    return payment_service.create_stripe_checkout_session(db, cotisation, user_id)


@router.post("/webhook", summary="Webhook de notification Stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_session)):
    """
    Endpoint de réception et traitement des webhooks Stripe.
    Vérifie la signature Stripe de manière sécurisée.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not cfg.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")

    try:
        stripe.api_key = cfg.STRIPE_SECRET_KEY
        event = stripe.Webhook.construct_event(
            payload, sig_header, cfg.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print("Webhook Signature Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            metadata = session.get('metadata', {})
            payment_id = metadata.get('payment_id')
            payment_intent_id = session.get('payment_intent')
            
            if payment_id and payment_intent_id:
                payment_service.confirm_payment_via_webhook(db, payment_id, payment_intent_id)
            else:
                print(f"[Webhook Warning] Métadonnées manquantes dans la session: {session.get('id')}")
    except Exception as e:
        print("Webhook Processing Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")

    return {"status": "success"}


@router.get("/my-payments", response_model=list[PaymentOut], summary="Consulter la liste de mes paiements")
def get_my_payments(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Récupère la liste de tous les paiements (historique) de l'utilisateur connecté.
    """
    user_id = UUID(current_user.user_id)
    payments = db.query(Payment).filter(Payment.user_id == user_id).order_by(Payment.created_at.desc()).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentOut, summary="Consulter le détail d'un paiement")
def get_payment(
    payment_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Consulte les détails d'un paiement spécifique. 
    Vérifie que le paiement appartient bien à l'utilisateur connecté pour des raisons de sécurité.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé.")

    if str(payment.user_id) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Non autorisé à consulter ce paiement.")

    return payment


# Keep for backward compatibility with older manual success redirect integrations
@router.post("/confirm/{cotisation_id}", summary="Confirmation de paiement manuelle (Fallback)")
def confirm_payment(cotisation_id: UUID, db: Session = Depends(get_session)):
    """
    Route de secours pour confirmer un paiement manuellement si nécessaire.
    """
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if not cotisation:
        raise HTTPException(status_code=404, detail="Cotisation non trouvée")

    if cotisation.statut_paiement == "paye":
        return {"status": "already_paid", "cotisation_id": str(cotisation_id)}

    payment_service.handle_successful_payment(db, str(cotisation_id))
    return {"status": "confirmed", "cotisation_id": str(cotisation_id)}


@router.post("/confirm-simulated/{payment_id}", summary="Confirmation de paiement simulé (Mode Test sans Stripe CLI)")
def confirm_simulated_payment(payment_id: UUID, db: Session = Depends(get_session)):
    """
    Confirme directement un paiement simulé lorsque les clés Stripe ou la CLI ne sont pas disponibles.
    """
    payment = payment_service.confirm_simulated_payment(db, str(payment_id))
    return {"status": "confirmed", "payment_id": str(payment.id)}

