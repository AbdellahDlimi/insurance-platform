import uuid

from fastapi import APIRouter, Depends, BackgroundTasks, Form, UploadFile, File, HTTPException, status
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
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.role != "admin_plateforme":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux administrateurs")
    
    coffre = service.review_kyc(
        db=db,
        kyc_id=kyc_id,
        statut=data.statut,
        commentaire=data.commentaire,
        admin_id=uuid.UUID(current_user.user_id)
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