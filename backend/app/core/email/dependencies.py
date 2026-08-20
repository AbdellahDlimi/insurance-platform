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


def create_email_client():
    if USE_SMTP and SMTP_USER and SMTP_PASSWORD:
        logger.info("[EmailProvider] Using standard SMTP client (%s:%s as %s)", SMTP_HOST, SMTP_PORT, SMTP_USER)
        return SMTPClient(
            host=SMTP_HOST,
            port=SMTP_PORT,
            user=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=(SMTP_PORT != 465),
        )
    elif RESEND_API_KEY and RESEND_API_KEY != "dummy_key_if_not_set":
        logger.info("[EmailProvider] Using Resend API client")
        return ResendClient(api_key=RESEND_API_KEY)
    elif SMTP_HOST and (SMTP_PORT == 1025 or SMTP_PORT == 25):
        # Local development mailcatcher / mailhog
        logger.info("[EmailProvider] Using Local SMTP Relay (%s:%s)", SMTP_HOST, SMTP_PORT)
        return SMTPClient(
            host=SMTP_HOST,
            port=SMTP_PORT,
            user=SMTP_USER or "",
            password=SMTP_PASSWORD or "",
            use_tls=False,
        )
    else:
        logger.warning("[EmailProvider] No valid SMTP credentials or Resend API key found. Falling back to default Resend client.")
        return ResendClient(api_key=RESEND_API_KEY or "dummy_key_if_not_set")


_client = create_email_client()
_email_service = EmailService(client=_client, from_address=SMTP_FROM)


def get_email_service() -> EmailService:
    """FastAPI dependency for injecting the EmailService."""
    return _email_service
