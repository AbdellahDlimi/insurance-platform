import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session, SessionLocal
from app.modules.users_kyc import service, repository
from app.modules.users_kyc.schemas import UserCreate, UserLogin, UserOut, TokenResponse, KYCSubmit, KYCStatusOut

router = APIRouter(prefix="/users_kyc", tags=["users_kyc"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_session)):
    user = service.register_user(db, data)
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


@router.post("/kyc/submit", response_model=KYCStatusOut, status_code=201)
def submit_kyc(
    data: KYCSubmit,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à l'utilisateur de soumettre ses pièces justificatives KYC.
    Les données seront stockées sous forme chiffrée.
    """
    coffre = service.submit_kyc(db, SessionLocal, uuid.UUID(current_user.user_id), data)
    return coffre


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