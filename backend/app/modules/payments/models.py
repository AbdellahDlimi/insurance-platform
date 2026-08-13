import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class Payment(Base):
    __tablename__ = "payment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groupe.id"), nullable=False)
    cotisation_id = Column(UUID(as_uuid=True), ForeignKey("cotisation.id"), nullable=True)  # nullable=True for compatibility if needed
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="eur")
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PAID, FAILED, CANCELLED, REFUNDED
    stripe_session_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Relations using string references to avoid circular imports
    utilisateur = relationship("Utilisateur")
    groupe = relationship("Groupe")
    cotisation = relationship("Cotisation")
