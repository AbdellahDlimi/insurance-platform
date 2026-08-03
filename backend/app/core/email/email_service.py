"""
EmailService — high-level email API exposed to the rest of the application.

Architectural decision:
  - This is the ONLY class business services should import for emails.
  - It orchestrates: template rendering → payload building → Resend dispatch.
  - It exposes NAMED methods (send_welcome_email, etc.) so callers
    never deal with template names or HTML strings directly.
  - All Resend-specific logic stays in ResendClient (dependency inversion).
  - BackgroundTasks integration: callers can pass a FastAPI BackgroundTasks
    instance so the send happens AFTER the HTTP response is returned.

SOLID mapping:
  S — Single responsibility: only orchestrates email sending.
  O — Open/closed: add a new email type by adding a method, not editing existing ones.
  L — Not applicable (no inheritance hierarchy here).
  I — Thin interface; callers only see high-level methods.
  D — Depends on ResendClient abstraction injected at construction time.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import BackgroundTasks

from app.core.email.models import EmailPayload, EmailResult
from app.core.email.renderer import render_template
from app.core.email.resend_client import ResendClient
from app.core.email.templates_enum import EmailTemplate

logger = logging.getLogger(__name__)


class EmailService:
    """
    High-level email orchestrator.
    Instantiated once and injected via FastAPI dependency injection.
    """

    def __init__(self, client: ResendClient, from_address: str) -> None:
        self._client = client
        self._from = from_address

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _build_and_send(
        self,
        to: str | list[str],
        subject: str,
        template: EmailTemplate,
        context: dict[str, Any],
        reply_to: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
        tags: list[dict[str, str]] | None = None,
    ) -> EmailResult:
        """Render template, build payload and dispatch synchronously."""
        recipients = [to] if isinstance(to, str) else to
        html = render_template(template, context)
        payload = EmailPayload(
            to=recipients,
            subject=subject,
            html=html,
            from_address=self._from,
            reply_to=reply_to,
            attachments=attachments or [],
            tags=tags or [],
        )
        return self._client.send(payload)

    def _schedule_or_send(
        self,
        background_tasks: BackgroundTasks | None,
        to: str | list[str],
        subject: str,
        template: EmailTemplate,
        context: dict[str, Any],
        reply_to: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
        tags: list[dict[str, str]] | None = None,
    ) -> None:
        """
        If background_tasks is provided, schedule the send as a background job
        so the HTTP response returns immediately. Otherwise send synchronously.

        Architectural note: This method is the single place where we decide
        between sync and async sending. Callers don't need to know the difference.
        """
        kwargs = dict(
            to=to,
            subject=subject,
            template=template,
            context=context,
            reply_to=reply_to,
            attachments=attachments,
            tags=tags,
        )
        if background_tasks is not None:
            background_tasks.add_task(self._build_and_send, **kwargs)
            logger.debug("Email scheduled in background | template=%s | to=%s", template, to)
        else:
            result = self._build_and_send(**kwargs)
            if not result.success:
                logger.error("Sync email failed | template=%s | to=%s | error=%s", template, to, result.error)

    # ── Account lifecycle ─────────────────────────────────────────────────────

    def send_welcome_email(
        self,
        to: str,
        pseudonyme: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Sent immediately after successful registration."""
        self._schedule_or_send(
            background_tasks, to,
            subject="Bienvenue sur TrustPool 🎉",
            template=EmailTemplate.WELCOME,
            context={"pseudonyme": pseudonyme},
        )

    def send_verification_email(
        self,
        to: str,
        pseudonyme: str,
        verification_link: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Email verification link sent after registration."""
        self._schedule_or_send(
            background_tasks, to,
            subject="Vérifiez votre adresse email — TrustPool",
            template=EmailTemplate.VERIFY_EMAIL,
            context={"pseudonyme": pseudonyme, "verification_link": verification_link},
        )

    def send_password_reset_email(
        self,
        to: str,
        pseudonyme: str,
        reset_link: str,
        expires_minutes: int = 30,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject="Réinitialisation de votre mot de passe — TrustPool",
            template=EmailTemplate.PASSWORD_RESET,
            context={
                "pseudonyme": pseudonyme,
                "reset_link": reset_link,
                "expires_minutes": expires_minutes,
            },
        )

    # ── KYC ──────────────────────────────────────────────────────────────────

    def send_kyc_approved_email(
        self,
        to: str,
        pseudonyme: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject="Votre identité a été vérifiée ✅ — TrustPool",
            template=EmailTemplate.KYC_APPROVED,
            context={"pseudonyme": pseudonyme},
        )

    def send_kyc_rejected_email(
        self,
        to: str,
        pseudonyme: str,
        reason: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject="Vérification d'identité — action requise",
            template=EmailTemplate.KYC_REJECTED,
            context={"pseudonyme": pseudonyme, "reason": reason},
        )

    # ── Groups ────────────────────────────────────────────────────────────────

    def send_group_invitation_email(
        self,
        to: str,
        pseudonyme: str,
        group_name: str,
        invitation_link: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Vous avez été invité(e) à rejoindre {group_name} — TrustPool",
            template=EmailTemplate.GROUP_INVITATION,
            context={
                "pseudonyme": pseudonyme,
                "group_name": group_name,
                "invitation_link": invitation_link,
            },
        )

    def send_group_recommendation_email(
        self,
        to: str,
        pseudonyme: str,
        recommendations: list[dict[str, Any]],
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """IA matchmaker recommendations digest."""
        self._schedule_or_send(
            background_tasks, to,
            subject="Des groupes faits pour vous 🤝 — TrustPool",
            template=EmailTemplate.RECOMMENDATION,
            context={"pseudonyme": pseudonyme, "recommendations": recommendations},
        )

    def send_membership_approved_email(
        self,
        to: str,
        pseudonyme: str,
        group_name: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Adhésion acceptée — {group_name}",
            template=EmailTemplate.MEMBERSHIP_APPROVED,
            context={"pseudonyme": pseudonyme, "group_name": group_name},
        )

    def send_membership_rejected_email(
        self,
        to: str,
        pseudonyme: str,
        group_name: str,
        reason: str | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Adhésion non retenue — {group_name}",
            template=EmailTemplate.MEMBERSHIP_REJECTED,
            context={"pseudonyme": pseudonyme, "group_name": group_name, "reason": reason},
        )

    # ── Claims ────────────────────────────────────────────────────────────────

    def send_claim_submitted_email(
        self,
        to: str,
        pseudonyme: str,
        claim_id: str,
        amount: float,
        description: str,
        pdf_bytes: bytes | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        attachments = []
        if pdf_bytes:
            attachments.append({
                "filename": f"declaration_{claim_id}.pdf",
                "content": list(pdf_bytes),
                "type": "application/pdf",
            })
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Sinistre déclaré — Réf. {claim_id[:8]}",
            template=EmailTemplate.CLAIM_SUBMITTED,
            context={
                "pseudonyme": pseudonyme,
                "claim_id": claim_id,
                "amount": amount,
                "description": description,
            },
            attachments=attachments,
        )

    def send_claim_approved_email(
        self,
        to: str,
        pseudonyme: str,
        claim_id: str,
        approved_amount: float,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Sinistre approuvé — Réf. {claim_id[:8]} ✅",
            template=EmailTemplate.CLAIM_APPROVED,
            context={
                "pseudonyme": pseudonyme,
                "claim_id": claim_id,
                "approved_amount": approved_amount,
            },
        )

    def send_claim_rejected_email(
        self,
        to: str,
        pseudonyme: str,
        claim_id: str,
        reason: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Sinistre non approuvé — Réf. {claim_id[:8]}",
            template=EmailTemplate.CLAIM_REJECTED,
            context={"pseudonyme": pseudonyme, "claim_id": claim_id, "reason": reason},
        )

    # ── Payments ──────────────────────────────────────────────────────────────

    def send_payment_confirmation_email(
        self,
        to: str,
        pseudonyme: str,
        amount: float,
        group_name: str,
        transaction_id: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Paiement confirmé — {group_name}",
            template=EmailTemplate.PAYMENT_SUCCESS,
            context={
                "pseudonyme": pseudonyme,
                "amount": amount,
                "group_name": group_name,
                "transaction_id": transaction_id,
            },
        )

    def send_payment_failed_email(
        self,
        to: str,
        pseudonyme: str,
        amount: float,
        group_name: str,
        reason: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Échec de paiement — {group_name} ⚠️",
            template=EmailTemplate.PAYMENT_FAILED,
            context={
                "pseudonyme": pseudonyme,
                "amount": amount,
                "group_name": group_name,
                "reason": reason,
            },
        )

    def send_monthly_contribution_reminder(
        self,
        to: str,
        pseudonyme: str,
        group_name: str,
        amount_due: float,
        due_date: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        self._schedule_or_send(
            background_tasks, to,
            subject=f"Rappel cotisation — {group_name}",
            template=EmailTemplate.REMINDER,
            context={
                "pseudonyme": pseudonyme,
                "group_name": group_name,
                "amount_due": amount_due,
                "due_date": due_date,
            },
        )

    # ── Security / Admin ──────────────────────────────────────────────────────

    def send_fraud_alert_email(
        self,
        to: str | list[str],
        pseudonyme: str,
        alert_type: str,
        details: str,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """High-priority — sent to compliance team and/or user."""
        self._schedule_or_send(
            background_tasks, to,
            subject="🚨 Alerte fraude détectée — TrustPool",
            template=EmailTemplate.FRAUD_ALERT,
            context={"pseudonyme": pseudonyme, "alert_type": alert_type, "details": details},
        )

    def send_admin_notification(
        self,
        to: str | list[str],
        subject: str,
        event_type: str,
        details: dict[str, Any],
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """Generic admin/ops notification for platform events."""
        self._schedule_or_send(
            background_tasks, to,
            subject=f"[TrustPool Admin] {subject}",
            template=EmailTemplate.ADMIN_NOTIFICATION,
            context={"event_type": event_type, "details": details},
        )

    def send_custom_email(
        self,
        to: str | list[str],
        subject: str,
        template: EmailTemplate,
        context: dict[str, Any],
        reply_to: str | None = None,
        attachments: list[dict[str, Any]] | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> None:
        """
        Escape hatch for one-off or future email types.
        Prefer named methods above for discoverability and consistency.
        """
        self._schedule_or_send(
            background_tasks, to, subject, template, context,
            reply_to=reply_to, attachments=attachments,
        )
