import stripe
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException
import app.config as cfg
from app.modules.cagnotte.models import Cotisation
from app.modules.groups.models import Adhesion
from app.modules.payments.models import Payment
from app.modules.cagnotte.repository import crediter_cagnotte
from app.modules.notifications.service import NotificationService
from app.core.email.email_service import EmailService

stripe.api_key = cfg.STRIPE_SECRET_KEY

def create_stripe_checkout_session(db: Session, cotisation: Cotisation, user_id: UUID) -> dict:
    """
    Creates a Stripe Checkout Session for the cotisation and registers a pending Payment.
    """
    # 1. Retrieve the group association
    adhesion = db.query(Adhesion).filter(Adhesion.id == cotisation.adhesion_id).first()
    if not adhesion:
        raise HTTPException(status_code=404, detail="Adhésion associée à la cotisation non trouvée.")

    # 2. Create PENDING Payment in PostgreSQL
    payment = Payment(
        user_id=user_id,
        group_id=adhesion.groupe_id,
        cotisation_id=cotisation.id,
        amount=cotisation.montant_final,
        currency="eur",
        status="PENDING"
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # 3. Create Stripe Checkout Session
    frontend_url = cfg.FRONTEND_URL or "http://localhost:3000"
    amount_in_cents = int(cotisation.montant_final * 100)

    try:
        stripe.api_key = cfg.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': 'Cotisation TrustPool',
                        'description': f'Règlement de la cotisation pour la période {cotisation.periode or ""}',
                    },
                    'unit_amount': amount_in_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&payment_id={payment.id}',
            cancel_url=f'{frontend_url}/payment/cancel',
            client_reference_id=str(cotisation.id),
            metadata={
                'payment_id': str(payment.id),
                'user_id': str(user_id),
                'group_id': str(adhesion.groupe_id),
                'cotisation_id': str(cotisation.id)
            }
        )

        # 4. Save stripe_session_id in database
        payment.stripe_session_id = session.id
        db.commit()
        db.refresh(payment)

        return {
            "payment_id": payment.id,
            "checkout_url": session.url,
            "url": session.url,  # Backward compatibility
            "status": payment.status
        }
    except Exception as e:
        print(f"[Payments] Stripe API call failed ({e}). Falling back to local simulated checkout.")
        local_checkout_url = f"{frontend_url}/stripe-checkout?payment_id={payment.id}&cotisation_id={cotisation.id}&amount={cotisation.montant_final}"
        payment.stripe_session_id = f"sim_{payment.id}"
        db.commit()
        return {
            "payment_id": payment.id,
            "checkout_url": local_checkout_url,
            "url": local_checkout_url,
            "status": payment.status
        }

def confirm_simulated_payment(db: Session, payment_id: str) -> Payment:
    """
    Confirms a simulated payment when Stripe API key is invalid/offline in development mode.
    """
    return confirm_payment_via_webhook(db, payment_id, f"pi_sim_{payment_id}")



def confirm_payment_via_webhook(db: Session, payment_id: str, payment_intent_id: str) -> Payment:
    """
    Confirms payment, updates Postgres status, credits group cagnotte, and triggers notifications.
    Operates within a secure database transaction (with lock) for idempotency.
    """
    try:
        # Lock Payment row for concurrent safety
        payment = db.query(Payment).filter(Payment.id == payment_id).with_for_update().first()
        if not payment:
            raise ValueError(f"Paiement {payment_id} introuvable.")

        if payment.status == "PAID":
            # Idempotency check: Already processed
            return payment

        # Update Payment row
        payment.status = "PAID"
        payment.stripe_payment_intent_id = payment_intent_id
        payment.paid_at = datetime.now(timezone.utc)

        # Lock and update corresponding Cotisation
        cotisation = db.query(Cotisation).filter(Cotisation.id == payment.cotisation_id).with_for_update().first()
        if not cotisation:
            raise ValueError(f"Cotisation {payment.cotisation_id} introuvable.")

        if cotisation.statut_paiement != "paye":
            cotisation.statut_paiement = "paye"
            cotisation.paye_le = datetime.now(timezone.utc)

            # Credit Group Cagnotte
            crediter_cagnotte(db, cotisation.cagnotte_id, float(cotisation.montant_final))

            # Send Email / Notification
            adhesion = db.query(Adhesion).filter(Adhesion.id == cotisation.adhesion_id).first()
            if adhesion:
                try:
                    email_service = EmailService()
                    notif_service = NotificationService(email_service)
                    notif_service.notify_payment_success(db, adhesion.utilisateur_id)
                except Exception as ne:
                    print(f"[Webhook Notification Warning] Notification failed: {ne}")

        db.commit()
        return payment
    except Exception as e:
        db.rollback()
        raise e


# Keep for backward compatibility with older manual success redirect integrations
def handle_successful_payment(db: Session, cotisation_id: str):
    cotisation = db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()
    if cotisation and cotisation.statut_paiement != "paye":
        cotisation.statut_paiement = "paye"
        cotisation.paye_le = datetime.now(timezone.utc)
        db.commit()

        # Credit cagnotte
        crediter_cagnotte(db, cotisation.cagnotte_id, float(cotisation.montant_final))

        # Send notification
        adhesion = db.query(Adhesion).filter(Adhesion.id == cotisation.adhesion_id).first()
        if adhesion:
            try:
                email_service = EmailService()
                notif_service = NotificationService(email_service)
                notif_service.notify_payment_success(db, adhesion.utilisateur_id)
            except Exception as ne:
                print(f"[Manual Confirm Notification Warning] Notification failed: {ne}")
