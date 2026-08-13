import pytest
import uuid
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.modules.payments.models import Payment
from app.modules.cagnotte.models import Cotisation, Cagnotte
from app.modules.groups.models import Adhesion, Groupe

def test_create_checkout_session_unauthenticated(client):
    # Unauthenticated user should get 401
    res = client.post(f"/payments/create-checkout-session/{uuid.uuid4()}")
    assert res.status_code == 401

def test_create_checkout_session_not_found(verified_client):
    # Verified user trying to pay a non-existent cotisation should get 404
    client = verified_client["client"]
    res = client.post(f"/payments/create-checkout-session/{uuid.uuid4()}")
    assert res.status_code == 404

def test_create_checkout_session_unauthorized(verified_client, db_session):
    client = verified_client["client"]
    
    # Create another user
    from app.modules.users_kyc.models import Utilisateur
    other_user = Utilisateur(
        email="other@trustpool.io",
        pseudonyme="OtherUser",
        mot_de_passe_hash="hash",
        role="membre",
        statut_compte="actif"
    )
    db_session.add(other_user)
    db_session.commit()
    
    # Create a group and an adhesion for that other user
    group = Groupe(
        nom="Other Group",
        specialite="Auto",
        cotisation_de_base=Decimal("50.00"),
        admin_id=verified_client["user"]["id"]
    )
    db_session.add(group)
    db_session.commit()
    
    adhesion = Adhesion(
        utilisateur_id=other_user.id,
        groupe_id=group.id,
        statut="active"
    )
    db_session.add(adhesion)
    db_session.commit()
    
    cagnotte = Cagnotte(
        groupe_id=group.id,
        solde_actuel=Decimal("0.00"),
        periode_courante="2026-08"
    )
    db_session.add(cagnotte)
    db_session.commit()
    
    cotisation = Cotisation(
        adhesion_id=adhesion.id,
        cagnotte_id=cagnotte.id,
        montant_base=Decimal("50.00"),
        coefficient_applique=Decimal("1.0"),
        montant_final=Decimal("50.00"),
        statut_paiement="en_attente",
        periode="2026-08"
    )
    db_session.add(cotisation)
    db_session.commit()
    
    # The logged in user tries to pay other_user's cotisation, should get 403
    res = client.post(f"/payments/create-checkout-session/{cotisation.id}")
    assert res.status_code == 403

@patch("stripe.checkout.Session.create")
def test_create_checkout_session_success(mock_stripe, verified_client, db_session):
    client = verified_client["client"]
    user_id = verified_client["user"]["id"]
    
    # Mock Stripe Session creation
    mock_session = MagicMock()
    mock_session.id = "cs_test_123"
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_123"
    mock_stripe.return_value = mock_session

    # Create a group and adhesion for our verified user
    group = Groupe(
        nom="My Group",
        specialite="Auto",
        cotisation_de_base=Decimal("50.00"),
        admin_id=uuid.UUID(user_id)
    )
    db_session.add(group)
    db_session.commit()
    
    adhesion = Adhesion(
        utilisateur_id=uuid.UUID(user_id),
        groupe_id=group.id,
        statut="active"
    )
    db_session.add(adhesion)
    db_session.commit()
    
    cagnotte = Cagnotte(
        groupe_id=group.id,
        solde_actuel=Decimal("0.00"),
        periode_courante="2026-08"
    )
    db_session.add(cagnotte)
    db_session.commit()
    
    cotisation = Cotisation(
        adhesion_id=adhesion.id,
        cagnotte_id=cagnotte.id,
        montant_base=Decimal("50.00"),
        coefficient_applique=Decimal("1.0"),
        montant_final=Decimal("50.00"),
        statut_paiement="en_attente",
        periode="2026-08"
    )
    db_session.add(cotisation)
    db_session.commit()

    res = client.post(f"/payments/create-checkout-session/{cotisation.id}")
    assert res.status_code == 200
    data = res.json()
    assert "checkout_url" in data
    assert data["checkout_url"] == "https://checkout.stripe.com/pay/cs_test_123"
    assert data["status"] == "PENDING"
    
    # Check that it exists in PostgreSQL
    payment = db_session.query(Payment).filter(Payment.id == data["payment_id"]).first()
    assert payment is not None
    assert payment.status == "PENDING"
    assert payment.stripe_session_id == "cs_test_123"

@patch("stripe.Webhook.construct_event")
def test_webhook_success_and_idempotence(mock_webhook, verified_client, db_session):
    client = verified_client["client"]
    user_id = verified_client["user"]["id"]
    
    # Create group, adhesion, cagnotte, cotisation, and a pending payment
    group = Groupe(
        nom="My Group Webhook",
        specialite="Auto",
        cotisation_de_base=Decimal("60.00"),
        admin_id=uuid.UUID(user_id)
    )
    db_session.add(group)
    db_session.commit()
    
    adhesion = Adhesion(
        utilisateur_id=uuid.UUID(user_id),
        groupe_id=group.id,
        statut="active"
    )
    db_session.add(adhesion)
    db_session.commit()
    
    cagnotte = Cagnotte(
        groupe_id=group.id,
        solde_actuel=Decimal("100.00"), # start solde
        periode_courante="2026-08"
    )
    db_session.add(cagnotte)
    db_session.commit()
    
    cotisation = Cotisation(
        adhesion_id=adhesion.id,
        cagnotte_id=cagnotte.id,
        montant_base=Decimal("60.00"),
        coefficient_applique=Decimal("1.0"),
        montant_final=Decimal("60.00"),
        statut_paiement="en_attente",
        periode="2026-08"
    )
    db_session.add(cotisation)
    db_session.commit()
    
    payment = Payment(
        user_id=uuid.UUID(user_id),
        group_id=group.id,
        cotisation_id=cotisation.id,
        amount=Decimal("60.00"),
        currency="eur",
        status="PENDING",
        stripe_session_id="cs_test_999"
    )
    db_session.add(payment)
    db_session.commit()
    
    # Mock signature verification and construct_event to return checkout.session.completed event
    mock_webhook.return_value = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_999",
                "payment_intent": "pi_test_999",
                "metadata": {
                    "payment_id": str(payment.id)
                }
            }
        }
    }
    
    # Set Stripe webhook secret in config
    import app.config as cfg
    cfg.STRIPE_WEBHOOK_SECRET = "whsec_test"

    # Call webhook
    headers = {"stripe-signature": "t=123,v1=abc"}
    res = client.post("/payments/webhook", headers=headers, json={"some": "payload"})
    assert res.status_code == 200
    assert res.json() == {"status": "success"}

    # Verify payment status in DB is PAID, cotisation is paye, and cagnotte credited
    db_session.expire_all()
    p_updated = db_session.query(Payment).filter(Payment.id == payment.id).first()
    assert p_updated.status == "PAID"
    assert p_updated.stripe_payment_intent_id == "pi_test_999"
    
    c_updated = db_session.query(Cotisation).filter(Cotisation.id == cotisation.id).first()
    assert c_updated.statut_paiement == "paye"
    
    cag_updated = db_session.query(Cagnotte).filter(Cagnotte.id == cagnotte.id).first()
    assert cag_updated.solde_actuel == Decimal("160.00") # 100 + 60

    # Call webhook again to test IDEMPOTENCY
    res = client.post("/payments/webhook", headers=headers, json={"some": "payload"})
    assert res.status_code == 200
    
    db_session.expire_all()
    cag_updated2 = db_session.query(Cagnotte).filter(Cagnotte.id == cagnotte.id).first()
    assert cag_updated2.solde_actuel == Decimal("160.00") # should NOT double credit!

def test_get_payment_success(verified_client, db_session):
    client = verified_client["client"]
    user_id = verified_client["user"]["id"]
    
    # Create group, adhesion, cagnotte, cotisation, and a payment
    group = Groupe(
        nom="Group Details Test",
        specialite="Auto",
        cotisation_de_base=Decimal("60.00"),
        admin_id=uuid.UUID(user_id)
    )
    db_session.add(group)
    db_session.commit()
    
    adhesion = Adhesion(
        utilisateur_id=uuid.UUID(user_id),
        groupe_id=group.id,
        statut="active"
    )
    db_session.add(adhesion)
    db_session.commit()
    
    cagnotte = Cagnotte(
        groupe_id=group.id,
        solde_actuel=Decimal("0.00"),
        periode_courante="2026-08"
    )
    db_session.add(cagnotte)
    db_session.commit()
    
    cotisation = Cotisation(
        adhesion_id=adhesion.id,
        cagnotte_id=cagnotte.id,
        montant_base=Decimal("60.00"),
        coefficient_applique=Decimal("1.0"),
        montant_final=Decimal("60.00"),
        statut_paiement="paye",
        periode="2026-08"
    )
    db_session.add(cotisation)
    db_session.commit()
    
    payment = Payment(
        user_id=uuid.UUID(user_id),
        group_id=group.id,
        cotisation_id=cotisation.id,
        amount=Decimal("60.00"),
        currency="eur",
        status="PAID",
        stripe_session_id="cs_test_ok",
        stripe_payment_intent_id="pi_test_ok"
    )
    db_session.add(payment)
    db_session.commit()

    res = client.get(f"/payments/{payment.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PAID"
    assert data["amount"] == "60.00"

    # Test list payments
    res_list = client.get("/payments/my-payments")
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) >= 1
    assert items[0]["id"] == str(payment.id)
