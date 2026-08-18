import os
import mimetypes
import uuid

from fastapi import APIRouter, Depends, BackgroundTasks, Form, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session, SessionLocal
from app.modules.users_kyc import service, repository
from app.modules.users_kyc.schemas import UserCreate, UserLogin, UserOut, UserUpdate, TokenResponse, KYCStatusOut, OnboardingSubmit, OnboardingOut, KYCReviewSubmit, KYCDetailOut
from app.modules.notifications.dependencies import get_notification_service
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/users_kyc", tags=["users_kyc"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(
    data: UserCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    user = service.register_user(db, data, notification_service, background_tasks)
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_session)):
    return service.login_user(db, data)


@router.get("/me", response_model=UserOut)
def me(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.role == "admin_plateforme":
        agent = repository.get_agent_by_id(db, uuid.UUID(current_user.user_id))
        if agent:
            return {
                "id": agent.id,
                "email": agent.email,
                "pseudonyme": agent.nom,
                "role": "admin_plateforme",
                "statut_compte": "actif",
                "onboarding_complete": True,
                "created_at": agent.created_at
            }
            
    return repository.get_user_by_id(db, uuid.UUID(current_user.user_id))


@router.patch("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à l'utilisateur de mettre à jour son pseudonyme.
    """
    from fastapi import HTTPException
    result = repository.update_user_profile(db, uuid.UUID(current_user.user_id), data.model_dump(exclude_none=True))
    if result is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if result == 'taken':
        raise HTTPException(status_code=409, detail="Ce pseudonyme est déjà utilisé par un autre compte.")
    return result


@router.post("/kyc/submit", response_model=KYCStatusOut, status_code=201)
def submit_kyc(
    nom_complet: str = Form(...),
    date_naissance: str = Form(...),
    type_document: str = Form(...),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à l'utilisateur de soumettre ses pièces justificatives KYC.
    Les données seront stockées sous forme chiffrée.
    """
    data = {
        "nom_complet": nom_complet,
        "date_naissance": date_naissance,
        "type_document": type_document
    }
    coffre = service.submit_kyc(db, uuid.UUID(current_user.user_id), data, file)
    return coffre


@router.get("/kyc/pending", response_model=list[KYCDetailOut])
def get_pending_kyc(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.role != "admin_plateforme":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs")
    
    coffres = repository.get_all_pending_kyc(db)
    result = []
    for c in coffres:
        user = repository.get_user_by_id(db, c.utilisateur_id)
        result.append({
            "id": c.id,
            "utilisateur_id": c.utilisateur_id,
            "statut_verification": c.statut_verification,
            "document_url": c.document_url,
            "commentaire_review": c.commentaire_review,
            "verifie_le": c.verifie_le,
            "pseudonyme": user.pseudonyme if user else None
        })
    return result


@router.post("/kyc/{kyc_id}/review", response_model=KYCDetailOut)
def review_kyc(
    kyc_id: uuid.UUID,
    data: KYCReviewSubmit,
    background_tasks: BackgroundTasks,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    if current_user.role != "admin_plateforme":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs")
    
    coffre = service.review_kyc(
        db=db,
        kyc_id=kyc_id,
        statut=data.statut,
        commentaire=data.commentaire,
        admin_id=uuid.UUID(current_user.user_id),
        notification_service=notification_service,
        background_tasks=background_tasks
    )
    user = repository.get_user_by_id(db, coffre.utilisateur_id)
    return {
        "id": coffre.id,
        "utilisateur_id": coffre.utilisateur_id,
        "statut_verification": coffre.statut_verification,
        "document_url": coffre.document_url,
        "commentaire_review": coffre.commentaire_review,
        "verifie_le": coffre.verifie_le,
        "pseudonyme": user.pseudonyme if user else None
    }


from fastapi.responses import FileResponse, Response
from app.core import storage

@router.get("/kyc/{kyc_id}/document", summary="Visualiser la pièce d'identité KYC (Conformité uniquement)")
def get_kyc_document(
    kyc_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Retourne le fichier physique (Passeport / CIN en Image ou PDF).
    Accessible STRICTEMENT à l'équipe de conformité / admin_plateforme ou au propriétaire du compte.
    """
    coffre = repository.get_kyc_by_id(db, kyc_id)
    if not coffre:
        raise HTTPException(status_code=404, detail="Dossier KYC introuvable")

    is_admin = current_user.role in ["admin_plateforme", "equipe_conformite"]
    is_owner = str(coffre.utilisateur_id) == current_user.user_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé à l'équipe de conformité")

    if not coffre.document_url:
        raise HTTPException(status_code=404, detail="Aucun document associé à ce KYC")

    # Récupération via MinIO / S3 ou fallback local
    file_bytes, mime_type = storage.get_file_bytes(coffre.document_url)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le stockage")

    filename = os.path.basename(coffre.document_url)
    return Response(
        content=file_bytes,
        media_type=mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )




@router.get("/kyc/status", response_model=KYCStatusOut)
def get_kyc_status(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet de consulter le statut de vérification KYC de l'utilisateur connecté.
    """
    coffre = service.get_kyc_status(db, uuid.UUID(current_user.user_id))
    return coffre


@router.post("/onboarding", response_model=OnboardingOut, status_code=201)
def submit_onboarding(
    data: OnboardingSubmit,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Soumet les informations d'onboarding de l'utilisateur.
    """
    return service.submit_onboarding(db, uuid.UUID(current_user.user_id), data.model_dump())


@router.get("/onboarding", response_model=OnboardingOut)
def get_onboarding(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Récupère le profil d'onboarding de l'utilisateur.
    """
    return service.get_onboarding_status(db, uuid.UUID(current_user.user_id))