"""
Schémas Pydantic du module audit.
"""
from datetime import datetime
from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel, Field


# ── Journal d'audit ──────────────────────────────────────────────────────────

class AuditLogCreate(BaseModel):
    """Payload interne pour créer une entrée d'audit."""
    acteur_id: UUID
    action: str
    cible_type: str
    cible_id: UUID
    details: Optional[dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    """Réponse API pour une entrée du journal d'audit."""
    id: UUID
    acteur_id: UUID
    action: str
    cible_type: str
    cible_id: UUID
    details: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Demande de levée d'anonymat ──────────────────────────────────────────────

class LeveeAnonymatCreate(BaseModel):
    """Payload pour demander une levée d'anonymat."""
    sinistre_id: UUID
    utilisateur_cible_id: UUID
    groupe_id: UUID
    justification_legale: str = Field(..., min_length=10)


class LeveeAnonymatResponse(BaseModel):
    """Réponse API pour une demande de levée d'anonymat."""
    id: UUID
    sinistre_id: UUID
    utilisateur_cible_id: UUID
    groupe_id: UUID
    demande_par_admin_id: UUID
    justification_legale: str
    statut: str
    valide_par_agent_id: Optional[UUID] = None
    date_execution: Optional[datetime] = None

    model_config = {"from_attributes": True}
