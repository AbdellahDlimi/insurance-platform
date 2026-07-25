"""
Router FastAPI du module audit.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, TokenPayload
from app.core.database import get_session
from app.modules.audit import service
from app.modules.audit.schemas import (
    AuditLogResponse, LeveeAnonymatCreate, LeveeAnonymatResponse,
)
from app.modules.audit import repository

router = APIRouter(prefix="/audit", tags=["audit"])


# ── Journal d'audit ──────────────────────────────────────────────────────────

@router.get(
    "/logs",
    response_model=list[AuditLogResponse],
    summary="Consulter le journal d'audit",
)
def get_audit_logs(
    cible_type: Optional[str] = Query(None, description="Filtrer par type de cible"),
    cible_id: Optional[UUID] = Query(None, description="Filtrer par ID de cible"),
    limit: int = Query(50, ge=1, le=200),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return service.get_audit_logs(session, cible_type, cible_id, limit)


# ── Levée d'anonymat ────────────────────────────────────────────────────────

@router.post(
    "/levee-anonymat",
    response_model=LeveeAnonymatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Demander une levée d'anonymat",
)
def request_anonymity_lift(
    data: LeveeAnonymatCreate,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """
    Un admin de groupe demande la levée d'anonymat d'un membre
    dans le cadre d'une enquête sur un sinistre.
    Émet l'event 'anonymity.lift.requested'.
    """
    return service.demander_levee_anonymat(
        session, data, admin_id=UUID(current_user.user_id)
    )


@router.post(
    "/levee-anonymat/{demande_id}/approve",
    response_model=LeveeAnonymatResponse,
    summary="Approuver une levée d'anonymat (équipe conformité)",
)
def approve_anonymity_lift(
    demande_id: UUID,
    current_user: TokenPayload = Depends(require_role("equipe_conformite")),
    session: Session = Depends(get_session),
):
    """
    L'équipe conformité approuve la demande → émet 'anonymity.lift.approved'.
    Déclenche le déchiffrement KYC côté Personne A.
    """
    demande = repository.get_demande_levee_by_id(session, demande_id)
    if not demande:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if demande.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")

    return service.approuver_levee_anonymat(
        session, demande, agent_id=UUID(current_user.user_id)
    )
