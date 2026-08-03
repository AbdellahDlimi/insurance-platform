"""
Resend HTTP client — the ONLY place in the codebase that imports the Resend SDK.

Architectural decision (Adapter / Anti-corruption Layer pattern):
  - All Resend-specific logic is fully encapsulated here.
  - If Resend changes its API or we switch provider, only this file changes.
  - Business services never see resend.Emails, resend.Params, etc.
  - Retry logic lives here, not in the EmailService — single responsibility.

Retry strategy: exponential backoff with jitter (industry standard for
transient HTTP failures). We retry on 429 (rate-limit) and 5xx errors.
We do NOT retry on 4xx validation errors (they will never succeed).
"""
import logging
import time
import random
import os
from typing import Any

import resend  # pip install resend

from app.core.email.models import EmailPayload, EmailResult

logger = logging.getLogger(__name__)

# ── Retry configuration ───────────────────────────────────────────────────────
_MAX_RETRIES  = 3
_BASE_DELAY_S = 1.0   # seconds
_MAX_DELAY_S  = 30.0  # cap

# HTTP status codes that are worth retrying
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class ResendClient:
    """
    Thin wrapper around the Resend SDK with:
      - Lazy API key injection (set once at startup)
      - Retry with exponential backoff + jitter
      - Structured logging
      - Result normalization via EmailResult
    """

    def __init__(self, api_key: str) -> None:
        """
        Inject the API key. Resend SDK uses a module-level global,
        so we set it here on construction. This is safe because
        the client is instantiated once as a singleton (see dependencies.py).
        """
        if not api_key:
            raise ValueError(
                "RESEND_API_KEY is empty. "
                "Set it in your .env file before starting the server."
            )
        resend.api_key = api_key
        logger.info("ResendClient initialised (key length=%d).", len(api_key))

    # ── Public interface ──────────────────────────────────────────────────────

    def send(self, payload: EmailPayload) -> EmailResult:
        """
        Send a single email via the Resend API.
        Retries up to _MAX_RETRIES times on transient errors.

        Returns:
            EmailResult with success=True and message_id on success,
            or success=False and error description on permanent failure.
        """
        
        # Override email destination for development/testing
        dev_override = os.getenv("DEV_EMAIL_OVERRIDE")
        final_to = [dev_override] if dev_override else payload.to

        params: dict[str, Any] = {
            "from": payload.from_address,
            "to": final_to,
            "subject": payload.subject,
            "html": payload.html,
        }
        if payload.reply_to:
            params["reply_to"] = payload.reply_to
        if payload.attachments:
            params["attachments"] = payload.attachments
        if payload.tags:
            params["tags"] = payload.tags

        last_error: str = "Unknown error"

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                response = resend.Emails.send(params)  # type: ignore[attr-defined]
                msg_id: str = response.get("id", "")
                logger.info(
                    "Email sent | to=%s | subject='%s' | id=%s | attempt=%d",
                    payload.to,
                    payload.subject,
                    msg_id,
                    attempt,
                )
                return EmailResult(success=True, message_id=msg_id)

            except resend.exceptions.ResendError as exc:  # type: ignore[attr-defined]
                status = getattr(exc, "status_code", None)
                last_error = str(exc)

                if status and status not in _RETRYABLE_STATUS:
                    logger.error(
                        "Resend non-retryable error (HTTP %s): %s | to=%s",
                        status,
                        exc,
                        payload.to,
                    )
                    return EmailResult(success=False, error=last_error)

                logger.warning(
                    "Resend transient error (attempt %d/%d, HTTP %s): %s",
                    attempt,
                    _MAX_RETRIES,
                    status,
                    exc,
                )

            except Exception as exc:
                last_error = str(exc)
                logger.error(
                    "Unexpected error sending email (attempt %d/%d): %s",
                    attempt,
                    _MAX_RETRIES,
                    exc,
                    exc_info=True,
                )

            # Exponential backoff with full jitter before next attempt
            if attempt < _MAX_RETRIES:
                delay = min(_BASE_DELAY_S * (2 ** (attempt - 1)), _MAX_DELAY_S)
                jitter = random.uniform(0, delay * 0.3)
                sleep_time = delay + jitter
                logger.debug("Retrying in %.2f seconds…", sleep_time)
                time.sleep(sleep_time)

        logger.error(
            "All %d send attempts failed for to=%s: %s",
            _MAX_RETRIES,
            payload.to,
            last_error,
        )
        return EmailResult(success=False, error=last_error)
