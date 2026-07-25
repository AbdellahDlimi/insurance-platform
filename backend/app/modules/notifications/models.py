"""
Modèle ORM (SQLAlchemy) du module notifications.
Correspond à la table 'notification' définie dans infra/init.sql.
"""
import uuid

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notification"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(
        UUID(as_uuid=True), ForeignKey("utilisateur.id"), nullable=False
    )
    type = Column(String(50), nullable=False)
    contenu = Column(Text, nullable=False)
    lu = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False,
        server_default=text("now()")
    )
