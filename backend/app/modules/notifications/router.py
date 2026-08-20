
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session
from app.modules.notifications.dependencies import get_notification_service
from app.modules.notifications.service import NotificationService
from app.modules.notifications.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get(
    "/",
    response_model=list[NotificationResponse],
    summary="Lister mes notifications",
)
def list_my_notifications(
    non_lues_only: bool = Query(False, description="Filtrer uniquement les non lues"),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Liste les notifications de l'utilisateur connecté."""
    return notification_service.get_user_notifications(
        session, UUID(current_user.user_id), non_lues_only
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Marquer une notification comme lue",
)
def mark_as_read(
    notification_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    notif = notification_service.mark_notification_read(session, notification_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification non trouvée")
    return notif


@router.patch(
    "/read-all",
    summary="Marquer toutes mes notifications comme lues",
)
def mark_all_as_read(
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    count = notification_service.mark_all_notifications_read(session, UUID(current_user.user_id))
    return {"marked_as_read": count}


from app.modules.notifications.schemas import NotificationDirectCreate

@router.post(
    "/send-to-user",
    response_model=NotificationResponse,
    summary="Envoyer une notification directe (Équipe Conformité)",
)
def send_notification_to_user(
    data: NotificationDirectCreate,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
    notification_service: NotificationService = Depends(get_notification_service),
):
    from app.modules.notifications import repository
    notif = repository.create_notification(
        session,
        utilisateur_id=data.destinataire_id,
        n_type=data.type,
        contenu=data.contenu,
    )
    return notif

