"""
Schémas Pydantic du module claims.
Séparés des modèles ORM pour respecter la convention du projet :
  - schemas.py  = validation des entrées/sorties API
  - models.py   = mapping vers les tables PostgreSQL
"""
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field


# ── Sinistre ─────────────────────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    """Payload pour déclarer un nouveau sinistre."""
    adhesion_id: UUID
    groupe_id: UUID
    description: str = Field(..., min_length=10)
    montant_declare: Decimal = Field(..., gt=0)


class ClaimResponse(BaseModel):
    """Réponse API après création ou lecture d'un sinistre."""
    id: UUID
    adhesion_id: UUID
    groupe_id: UUID
    description: str
    montant_declare: Decimal
    montant_approuve: Optional[Decimal] = None
    statut: str
    motif_rejet: Optional[str] = None
    commentaire_validation: Optional[str] = None
    score_fraude: Optional[Decimal] = None
    resume_ia: Optional[str] = None
    date_declaration: datetime
    traite_par_admin_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class ClaimValidate(BaseModel):
    """Payload pour qu'un admin valide un sinistre."""
    montant_approuve: Decimal = Field(..., gt=0)
    commentaire_validation: Optional[str] = None


class ClaimReject(BaseModel):
    """Payload pour qu'un admin rejette un sinistre."""
    motif: str = Field(..., min_length=5)


# ── Pièce justificative ─────────────────────────────────────────────────────

class PieceJustificativeResponse(BaseModel):
    """Réponse API pour une pièce justificative."""
    id: UUID
    sinistre_id: UUID
    hdfs_url: str
    type_fichier: Optional[str] = None
    texte_ocr: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Alerte fraude ────────────────────────────────────────────────────────────

class AlerteFraudeResponse(BaseModel):
    """Réponse API pour une alerte de fraude."""
    id: UUID
    sinistre_id: UUID
    score: Decimal
    niveau_severite: str
    explication_ia: Optional[str] = None
    statut_traitement: str
    created_at: datetime

    model_config = {"from_attributes": True}
