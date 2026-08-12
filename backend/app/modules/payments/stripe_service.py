import stripe
import logging
from typing import Dict, Any, Tuple
import app.config as cfg

logger = logging.getLogger(__name__)


def create_stripe_checkout_session(
    amount_cents: int,
    currency: str,
    success_url: str,
    cancel_url: str,
    metadata: Dict[str, str],
    product_name: str = "Cotisation assurance P2P"
) -> Tuple[str, str]:
    """
    Crée une session Stripe Checkout.
    Retourne (session_id, checkout_url).
    """
    if not cfg.STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY non configurée dans le backend.")

    stripe.api_key = cfg.STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='payment',
            line_items=[
                {
                    'price_data': {
                        'currency': currency.lower(),
                        'product_data': {
                            'name': product_name,
                            'description': 'Paiement de la cotisation assurance collaborative P2P',
                        },
                        'unit_amount': amount_cents,
                    },
                    'quantity': 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        return session.id, session.url
    except stripe.error.StripeError as e:
        logger.error(f"[Stripe API Error] {e.user_message or str(e)}")
        raise e


def create_stripe_payment_intent(
    amount_cents: int,
    currency: str,
    metadata: Dict[str, str],
    product_name: str = "Cotisation assurance P2P"
) -> Tuple[str, str]:
    """
    Crée un PaymentIntent Stripe pour le paiement embarqué via Stripe Elements.
    Retourne (payment_intent_id, client_secret).
    """
    if not cfg.STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY non configurée dans le backend.")

    stripe.api_key = cfg.STRIPE_SECRET_KEY

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            metadata=metadata,
            description=product_name,
            automatic_payment_methods={'enabled': True, 'allow_redirects': 'never'},
        )
        return intent.id, intent.client_secret
    except stripe.error.StripeError as e:
        logger.error(f"[Stripe PaymentIntent Error] {e.user_message or str(e)}")
        raise e


def construct_webhook_event(payload: bytes, sig_header: str) -> Any:
    """
    Vérifie la signature et construit l'événement Stripe Webhook.
    """
    if not cfg.STRIPE_WEBHOOK_SECRET:
        raise ValueError("STRIPE_WEBHOOK_SECRET non configurée dans le backend.")

    stripe.api_key = cfg.STRIPE_SECRET_KEY
    return stripe.Webhook.construct_event(
        payload, sig_header, cfg.STRIPE_WEBHOOK_SECRET
    )
