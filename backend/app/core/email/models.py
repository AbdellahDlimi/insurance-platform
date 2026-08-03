"""
Pydantic models for the Email layer.

Architectural decision: Pydantic models enforce type safety at the
boundary between the EmailService and the Resend client.
They also serve as self-documenting contracts.
"""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, EmailStr, Field


class EmailPayload(BaseModel):
    """
    Immutable value object representing a single email to be sent.
    All fields are validated by Pydantic before reaching the Resend client.
    """
    to: list[EmailStr]
    subject: str = Field(..., min_length=1, max_length=998)
    html: str = Field(..., min_length=1)
    from_address: str = Field(default="TrustPool <noreply@trustpool.io>")
    reply_to: str | None = None
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    tags: list[dict[str, str]] = Field(default_factory=list)


class EmailResult(BaseModel):
    """
    Result returned by the Resend client after an attempt.
    Wraps Resend's response to decouple callers from the SDK.
    """
    success: bool
    message_id: str | None = None
    error: str | None = None
