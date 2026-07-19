"""
Router FastAPI du module claims.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, TokenPayload
from app.core.database import get_session
from app.modules.claims import service
from app.modules.claims.schemas import (
    ClaimCreate, ClaimResponse, ClaimValidate, ClaimReject,
    PieceJustificativeResponse, AlerteFraudeResponse,
)
from app.modules.claims import repository

router = APIRouter(prefix="/claims", tags=["claims"])


# ── Déclaration d'un sinistre ────────────────────────────────────────────────

@router.post(
    "/",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Déclarer un nouveau sinistre",
)
def create_claim(
    data: ClaimCreate,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Un membre déclare un sinistre. Émet l'event Kafka 'claim.created'."""
    sinistre = service.declare_sinistre(
        session, data, utilisateur_id=UUID(current_user.user_id)
    )
    return sinistre


# ── Lecture ───────────────────────────────────────────────────────────────────

@router.get(
    "/{sinistre_id}",
    response_model=ClaimResponse,
    summary="Récupérer un sinistre par ID",
)
def get_claim(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    return sinistre


@router.get(
    "/groupe/{groupe_id}",
    response_model=list[ClaimResponse],
    summary="Lister les sinistres d'un groupe",
)
def list_claims_by_group(
    groupe_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return service.list_sinistres_groupe(session, groupe_id)


# ── Pièces justificatives ───────────────────────────────────────────────────

@router.get(
    "/{sinistre_id}/pieces",
    response_model=list[PieceJustificativeResponse],
    summary="Lister les pièces justificatives d'un sinistre",
)
def list_pieces(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return repository.list_pieces_by_sinistre(session, sinistre_id)


# ── Alertes de fraude ────────────────────────────────────────────────────────

@router.get(
    "/{sinistre_id}/alertes",
    response_model=list[AlerteFraudeResponse],
    summary="Lister les alertes de fraude d'un sinistre",
)
def list_alertes(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return repository.list_alertes_by_sinistre(session, sinistre_id)


# ── Validation / Rejet (admin_groupe uniquement) ────────────────────────────

@router.post(
    "/{sinistre_id}/validate",
    response_model=ClaimResponse,
    summary="Valider un sinistre (admin groupe)",
)
def validate_claim(
    sinistre_id: UUID,
    data: ClaimValidate,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """
    Admin valide le sinistre → émet 'claim.validated'.
    ⚠️ Cet event déclenche le recalcul du malus côté Personne A.
    """
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    if sinistre.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Ce sinistre a déjà été traité")

    # Récupérer l'utilisateur déclarant via l'adhésion
    return service.valider_sinistre(
        session, sinistre, data,
        admin_id=UUID(current_user.user_id),
        utilisateur_id=UUID(current_user.user_id),
    )


@router.post(
    "/{sinistre_id}/reject",
    response_model=ClaimResponse,
    summary="Rejeter un sinistre (admin groupe)",
)
def reject_claim(
    sinistre_id: UUID,
    data: ClaimReject,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """Admin rejette le sinistre → émet 'claim.rejected'."""
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    if sinistre.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Ce sinistre a déjà été traité")

    return service.rejeter_sinistre(
        session, sinistre, data,
        admin_id=UUID(current_user.user_id),
        utilisateur_id=UUID(current_user.user_id),
    )
