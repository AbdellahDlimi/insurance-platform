"""
Schémas Pydantic du module notifications.
"""
from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    """Réponse API pour une notification."""
    id: UUID
    utilisateur_id: UUID
    type: str
    contenu: str
    lu: bool
    created_at: datetime

    model_config = {"from_attributes": True}
