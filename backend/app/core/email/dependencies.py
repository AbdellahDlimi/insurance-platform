import logging
from app.config import (
    RESEND_API_KEY,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    USE_SMTP,
)
from app.core.email.email_service import EmailService
from app.core.email.resend_client import ResendClient
from app.core.email.smtp_client import SMTPClient

logger = logging.getLogger(__name__)


def create_email_clients():
    """
    Crée le client principal (Resend ou SMTP) et le client de fallback automatique (SMTP).
    """
    smtp_client = None
    if SMTP_HOST and (SMTP_USER or SMTP_PORT in [1025, 25]):
        smtp_client = SMTPClient(
            host=SMTP_HOST,
            port=SMTP_PORT,
            user=SMTP_USER or "",
            password=SMTP_PASSWORD or "",
            use_tls=(SMTP_PORT != 465 and SMTP_PORT != 1025 and SMTP_PORT != 25),
        )

    resend_client = None
    if RESEND_API_KEY and RESEND_API_KEY != "dummy_key_if_not_set":
        resend_client = ResendClient(api_key=RESEND_API_KEY)

    if USE_SMTP and smtp_client:
        primary = smtp_client
        fallback = None
        logger.info("[EmailProvider] Primary: Direct SMTP (%s:%s as %s)", SMTP_HOST, SMTP_PORT, SMTP_USER)
    elif resend_client:
        primary = resend_client
        fallback = smtp_client
        logger.info("[EmailProvider] Primary: Resend API | Fallback: %s", "Gmail SMTP" if smtp_client else "None")
    elif smtp_client:
        primary = smtp_client
        fallback = None
        logger.info("[EmailProvider] Primary: SMTP Relay (%s:%s)", SMTP_HOST, SMTP_PORT)
    else:
        primary = ResendClient(api_key=RESEND_API_KEY or "dummy_key_if_not_set")
        fallback = None

    return primary, fallback


_primary_client, _fallback_client = create_email_clients()
_email_service = EmailService(
    client=_primary_client,
    fallback_client=_fallback_client,
    from_address=SMTP_FROM,
)


def get_email_service() -> EmailService:
    """FastAPI dependency for injecting the EmailService."""
    return _email_service

