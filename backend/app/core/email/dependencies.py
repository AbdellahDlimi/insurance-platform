"""
Dependency injection for the Email layer.

Architectural decision:
  - We instantiate the ResendClient and EmailService exactly ONCE at startup.
  - This avoids parsing the API key and creating HTTP sessions on every request.
  - FastAPI Depends() will inject the same instance everywhere.
"""
from app.config import RESEND_API_KEY, SMTP_FROM
from app.core.email.email_service import EmailService
from app.core.email.resend_client import ResendClient

# Singleton instances created at module load time.
# Fast, thread-safe (in standard WSGI/ASGI servers), and memory efficient.
_client = ResendClient(api_key=RESEND_API_KEY or "dummy_key_if_not_set")
_email_service = EmailService(client=_client, from_address=SMTP_FROM)


def get_email_service() -> EmailService:
    """FastAPI dependency for injecting the EmailService."""
    return _email_service
