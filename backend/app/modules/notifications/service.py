"""
Logique métier du module notifications.
"""
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.notifications import repository
from app.modules.notifications.models import Notification


def get_user_notifications(
    session: Session, utilisateur_id: UUID, non_lues_only: bool = False
) -> list[Notification]:
    """Liste les notifications d'un utilisateur."""
    return repository.list_notifications_by_user(session, utilisateur_id, non_lues_only)


def mark_notification_read(session: Session, notification_id: UUID) -> Notification | None:
    """Marque une notification comme lue."""
    return repository.mark_as_read(session, notification_id)


def mark_all_notifications_read(session: Session, utilisateur_id: UUID) -> int:
    """Marque toutes les notifications comme lues. Retourne le nombre mis à jour."""
    return repository.mark_all_as_read(session, utilisateur_id)
