"""
NotificationService — High-level orchestrator for user communications.

Architectural decision:
  - This is the ONLY service business modules should use for sending alerts.
  - It handles BOTH sending an email (via EmailService) and storing an in-app
    notification in the database (via repository).
  - Business services (like Auth, Claims, Groups) do not know about Resend
    or even EmailService. They just call NotificationService.
"""
import logging
from typing import Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.email.email_service import EmailService
from app.modules.notifications import repository
from app.modules.notifications.models import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Orchestrates cross-channel notifications (In-app + Email).
    Instantiated via FastAPI dependency injection.
    """

    def __init__(self, email_service: EmailService) -> None:
        self.email_service = email_service

    # ── Internal logic ────────────────────────────────────────────────────────

    def _persist_in_app(
        self, session: Session, user_id: UUID, n_type: str, content: str
    ) -> None:
        """Stores a notification in the PostgreSQL database."""
        try:
            repository.create_notification(session, user_id, n_type, content)
        except Exception as e:
            logger.error("Failed to persist in-app notification: %s", e)

    # ── Business Methods ──────────────────────────────────────────────────────

    def notify_welcome(
        self,
        session: Session,
        user_id: UUID,
        email: str,
        pseudonyme: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """New user registration."""
        self._persist_in_app(
            session, user_id, "welcome", "Bienvenue sur TrustPool 🎉 !"
        )
        self.email_service.send_welcome_email(
            to=email, pseudonyme=pseudonyme, background_tasks=background_tasks
        )

    def notify_claim_submitted(
        self,
        session: Session,
        user_id: UUID,
        email: str,
        pseudonyme: str,
        claim_id: str,
        amount: float,
        description: str,
        pdf_bytes: bytes | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Claim was submitted by the user."""
        self._persist_in_app(
            session,
            user_id,
            "claim_submitted",
            f"Votre sinistre {claim_id[:8]} d'un montant de {amount}€ est en cours de traitement.",
        )
        self.email_service.send_claim_submitted_email(
            to=email,
            pseudonyme=pseudonyme,
            claim_id=claim_id,
            amount=amount,
            description=description,
            pdf_bytes=pdf_bytes,
            background_tasks=background_tasks,
        )

    def notify_group_invitation(
        self,
        session: Session,
        user_id: UUID,
        email: str,
        pseudonyme: str,
        group_name: str,
        invitation_link: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """User is invited to a group."""
        self._persist_in_app(
            session,
            user_id,
            "group_invitation",
            f"Vous êtes invité(e) à rejoindre le groupe {group_name}.",
        )
        self.email_service.send_group_invitation_email(
            to=email,
            pseudonyme=pseudonyme,
            group_name=group_name,
            invitation_link=invitation_link,
            background_tasks=background_tasks,
        )

    # ── Standard notification operations ──────────────────────────────────────

    def get_user_notifications(
        self, session: Session, user_id: UUID, non_lues_only: bool = False
    ) -> list[Notification]:
        return repository.list_notifications_by_user(session, user_id, non_lues_only)

    def mark_notification_read(
        self, session: Session, notification_id: UUID
    ) -> Notification | None:
        return repository.mark_as_read(session, notification_id)

    def mark_all_notifications_read(
        self, session: Session, user_id: UUID
    ) -> int:
        return repository.mark_all_as_read(session, user_id)
