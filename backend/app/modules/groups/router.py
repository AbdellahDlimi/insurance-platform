import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, TokenPayload
from app.core.database import get_session
from app.modules.groups import service, repository
from app.modules.users_kyc import repository as kyc_repository
from app.modules.groups.schemas import (
    GroupCreate,
    GroupOut,
    JoinRequestOut,
    AdhesionOut,
    AdhesionValidate,
    PendingRequestOut,
    MemberOut,
)

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupOut, status_code=201)
def create_group(
    data: GroupCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Crée un nouveau groupe d'assurance collaborative.
    """
    return service.create_group(db, uuid.UUID(current_user.user_id), data)


@router.get("", response_model=list[GroupOut])
def get_groups(db: Session = Depends(get_session)):
    """
    Liste tous les groupes collaboratifs ouverts.
    """
    return repository.get_open_groups(db)


@router.get("/admin/pending-requests", response_model=list[PendingRequestOut])
def get_admin_pending_requests(
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    db: Session = Depends(get_session),
):
    """
    Retourne toutes les demandes d'adhésion en attente
    pour tous les groupes dont l'utilisateur est administrateur.
    """
    return service.get_admin_pending_requests(db, uuid.UUID(current_user.user_id))


@router.get("/{id}", response_model=GroupOut)
def get_group(id: uuid.UUID, db: Session = Depends(get_session)):
    """
    Récupère les informations détaillées d'un groupe.
    """
    return service.get_group_details(db, id)


@router.post("/{id}/join-request", response_model=JoinRequestOut, status_code=201)
def join_request(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à un utilisateur dont le KYC est vérifié de demander à rejoindre un groupe.
    """
    from fastapi import HTTPException, status
    kyc = kyc_repository.get_kyc_by_user_id(db, uuid.UUID(current_user.user_id))
    if not kyc or kyc.statut_verification != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Vérification KYC requise pour rejoindre un groupe."
        )
        
    return service.request_to_join_group(db, uuid.UUID(current_user.user_id), id)


@router.get("/{id}/join-requests", response_model=list[JoinRequestOut])
def get_join_requests(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    db: Session = Depends(get_session),
):
    """
    Permet à l'admin du groupe de consulter l'ensemble des demandes d'adhésion du groupe.
    """
    return service.get_group_join_requests(db, id, uuid.UUID(current_user.user_id))


@router.post("/{id}/members/{user_id}/validate", response_model=JoinRequestOut)
def validate_member(
    id: uuid.UUID,
    user_id: uuid.UUID,
    validation: AdhesionValidate,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    db: Session = Depends(get_session),
):
    """
    Permet à l'admin du groupe de valider ou de refuser une demande d'adhésion.
    """
    return service.validate_join_request_by_user(
        db=db,
        group_id=id,
        user_id=user_id,
        admin_id=uuid.UUID(current_user.user_id),
        statut=validation.statut,
    )


@router.get("/{id}/members", response_model=list[AdhesionOut])
def get_members(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Liste les adhésions actives d'un groupe.
    """
    return service.get_group_members(db, id, uuid.UUID(current_user.user_id))


@router.get("/{id}/members/enriched", response_model=list[MemberOut])
def get_members_enriched(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Liste les membres actifs d'un groupe avec pseudonyme et flag admin.
    """
    return service.get_group_members_enriched(db, id, uuid.UUID(current_user.user_id))

@router.get("/me/adhesions", response_model=list[AdhesionOut])
def get_my_adhesions(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Liste toutes les adhésions actives de l'utilisateur connecté.
    """
    return service.get_user_adhesions(db, uuid.UUID(current_user.user_id))

