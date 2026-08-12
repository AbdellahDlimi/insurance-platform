import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Payment(Base):
    __tablename__ = "payment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="eur")
    status = Column(String(20), nullable=False, default="PENDING") # PENDING, PAID, FAILED, CANCELLED, REFUNDED
    stripe_session_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    paid_at = Column(DateTime(timezone=True), nullable=True)

    utilisateur = relationship("Utilisateur", foreign_keys=[user_id])
    groupe = relationship("Groupe", foreign_keys=[group_id])
