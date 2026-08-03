"""
EmailTemplate Enum — source of truth for all template names.

Architectural decision: Using an Enum instead of raw strings prevents
typos, enables IDE autocompletion, and makes template refactoring safe.
Every caller must use this enum; the rendering engine resolves the file path.
"""
from enum import Enum


class EmailTemplate(str, Enum):
    # ── Account lifecycle ─────────────────────────────────────────────────
    WELCOME             = "welcome"
    VERIFY_EMAIL        = "verify_email"
    PASSWORD_RESET      = "password_reset"

    # ── KYC ──────────────────────────────────────────────────────────────
    KYC_APPROVED        = "kyc_approved"
    KYC_REJECTED        = "kyc_rejected"

    # ── Groups ───────────────────────────────────────────────────────────
    GROUP_INVITATION    = "group_invitation"
    RECOMMENDATION      = "recommendation"
    MEMBERSHIP_APPROVED = "membership_approved"
    MEMBERSHIP_REJECTED = "membership_rejected"

    # ── Claims ───────────────────────────────────────────────────────────
    CLAIM_SUBMITTED     = "claim_submitted"
    CLAIM_APPROVED      = "claim_approved"
    CLAIM_REJECTED      = "claim_rejected"

    # ── Payments ─────────────────────────────────────────────────────────
    PAYMENT_SUCCESS     = "payment_success"
    PAYMENT_FAILED      = "payment_failed"
    REMINDER            = "reminder"

    # ── Security / Admin ─────────────────────────────────────────────────
    FRAUD_ALERT         = "fraud_alert"
    ADMIN_NOTIFICATION  = "admin_notification"
