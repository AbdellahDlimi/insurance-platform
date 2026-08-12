from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CreateCheckoutSessionRequest(BaseModel):
    group_id: UUID
    amount: Optional[float] = None
    currency: Optional[str] = "eur"


class CreatePaymentIntentRequest(BaseModel):
    group_id: UUID
    amount: Optional[float] = None
    currency: Optional[str] = "eur"


class CheckoutSessionResponse(BaseModel):
    payment_id: str
    checkout_url: str
    status: str


class PaymentIntentResponse(BaseModel):
    payment_id: str
    client_secret: str
    amount: float
    currency: str
    status: str


class PaymentResponse(BaseModel):
    id: str
    user_id: str
    group_id: str
    amount: float
    currency: str
    status: str
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

