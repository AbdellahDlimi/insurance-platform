"""
Accès aux données du module notifications (SQLAlchemy).
Aucune logique métier ici, uniquement des requêtes.
"""
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification


def list_notifications_by_user(
    session: Session, utilisateur_id: UUID, non_lues_only: bool = False
) -> list[Notification]:
    """Liste les notifications d'un utilisateur."""
    query = session.query(Notification).filter(
        Notification.utilisateur_id == utilisateur_id
    )
    if non_lues_only:
        query = query.filter(Notification.lu == False)
    return query.order_by(Notification.created_at.desc()).all()


def mark_as_read(session: Session, notification_id: UUID) -> Optional[Notification]:
    """Marque une notification comme lue."""
    notif = (
        session.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )
    if notif:
        notif.lu = True
        session.commit()
        session.refresh(notif)
    return notif


def mark_all_as_read(session: Session, utilisateur_id: UUID) -> int:
    """Marque toutes les notifications d'un utilisateur comme lues. Retourne le nombre mis à jour."""
    count = (
        session.query(Notification)
        .filter(
            Notification.utilisateur_id == utilisateur_id,
            Notification.lu == False,
        )
        .update({Notification.lu: True})
    )
    session.commit()
    return count
