from fastapi import Depends

from app.core.email.dependencies import get_email_service
from app.core.email.email_service import EmailService
from app.modules.notifications.service import NotificationService

def get_notification_service(
    email_service: EmailService = Depends(get_email_service),
) -> NotificationService:
    """Injects the orchestrating NotificationService."""
    return NotificationService(email_service)
