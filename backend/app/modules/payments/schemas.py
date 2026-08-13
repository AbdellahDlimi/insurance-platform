from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

class PaymentOut(BaseModel):
    id: UUID
    user_id: UUID
    group_id: UUID
    cotisation_id: Optional[UUID] = None
    amount: Decimal
    currency: str
    status: str
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class CheckoutSessionOut(BaseModel):
    payment_id: UUID
    checkout_url: str
    url: str  # For backward compatibility with existing front-end calls
    status: str
