import uuid
import pytest
from unittest.mock import patch
from app.modules.payments.models import Payment
from app.modules.groups.models import Groupe, Adhesion
from app.modules.cagnotte.models import Cagnotte, Cotisation


def test_create_checkout_session_unauthorized(client):
    response = client.post("/payments/create-checkout-session", json={"group_id": str(uuid.uuid4())})
    assert response.status_code == 403 or response.status_code == 401


@patch("app.modules.payments.stripe_service.create_stripe_checkout_session")
def test_create_checkout_session_success(mock_stripe, verified_client, db_session):
    client = verified_client["client"]
    user_id = uuid.UUID(verified_client["user"]["id"])

    # 1. Créer un groupe
    grp = Groupe(
        nom="Groupe Test Payments",
        specialite="sante",
        admin_id=user_id,
        cotisation_de_base=150.00
    )
    db_session.add(grp)
    db_session.commit()
    db_session.refresh(grp)

    # 2. Créer une adhésion pour cet utilisateur
    adh = Adhesion(
        utilisateur_id=user_id,
        groupe_id=grp.id,
        statut="active"
    )
    db_session.add(adh)
    db_session.commit()

    # Mock de Stripe
    mock_stripe.return_value = ("cs_test_123", "https://checkout.stripe.com/pay/cs_test_123")

    # 3. Créer la session Stripe
    res = client.post(
        "/payments/create-checkout-session",
        json={"group_id": str(grp.id), "currency": "eur"}
    )

    assert res.status_code == 201
    data = res.json()
    assert "payment_id" in data
    assert data["checkout_url"] == "https://checkout.stripe.com/pay/cs_test_123"
    assert data["status"] == "PENDING"

    # Vérifier l'enregistrement en DB
    payment = db_session.query(Payment).filter(Payment.id == uuid.UUID(data["payment_id"])).first()
    assert payment is not None
    assert payment.status == "PENDING"
    assert float(payment.amount) == 150.00


@patch("app.modules.payments.stripe_service.construct_webhook_event")
def test_webhook_checkout_session_completed_idempotent(mock_webhook, db_session, client):
    # Setup Data
    user_id = uuid.uuid4()
    group_id = uuid.uuid4()

    cagnotte = Cagnotte(
        groupe_id=group_id,
        solde_actuel=100.00,
        solde_buffer_pool=100.00,
        periode_courante="2026-08"
    )
    db_session.add(cagnotte)

    payment = Payment(
        id=uuid.uuid4(),
        user_id=user_id,
        group_id=group_id,
        amount=150.00,
        currency="eur",
        status="PENDING",
        stripe_session_id="cs_test_456"
    )
    db_session.add(payment)
    db_session.commit()

    # Mock de l'événement webhook Stripe
    mock_webhook.return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_456",
                "payment_intent": "pi_test_789",
                "metadata": {
                    "payment_id": str(payment.id),
                    "user_id": str(user_id),
                    "group_id": str(group_id)
                }
            }
        }
    }

    # Premier appel Webhook -> Doit passer le statut à PAID et créditer la cagnotte
    res1 = client.post(
        "/payments/webhook",
        headers={"stripe-signature": "sig_test"},
        content=b"dummy_payload"
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    db_session.refresh(payment)
    db_session.refresh(cagnotte)
    assert payment.status == "PAID"
    assert payment.stripe_payment_intent_id == "pi_test_789"
    assert float(cagnotte.solde_actuel) == 250.00

    # Deuxième appel Webhook (Répétition / Duplicate) -> IDEMPOTENCE
    res2 = client.post(
        "/payments/webhook",
        headers={"stripe-signature": "sig_test"},
        content=b"dummy_payload"
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "already_processed"

    # Vérifier que le solde de la cagnotte N'A PAS ÉTÉ CRÉDITÉ UNE DEUXIÈME FOIS
    db_session.refresh(cagnotte)
    assert float(cagnotte.solde_actuel) == 250.00
