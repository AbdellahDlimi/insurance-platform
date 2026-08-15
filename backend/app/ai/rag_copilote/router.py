"""
Router FastAPI pour le Copilote RAG.
Endpoints :
  POST /ai/copilote/chat              — envoyer un message
  GET  /ai/copilote/history/{session} — historique d'une session
  POST /ai/copilote/ingest            — ingérer un document (admin)
  GET  /ai/copilote/collections       — lister les collections (admin)
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, TokenPayload
from app.core.database import get_session
from app.ai.rag_common.schemas import (
    ChatRequest, ChatResponse,
    IngestRequest, IngestResponse,
    ConversationHistoryOut,
)
from app.ai.rag_common.vector_store import get_vector_store
import app.ai.rag_copilote.engine as engine

router = APIRouter(prefix="/ai/copilote", tags=["copilote"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="💬 Envoyer un message au Copilote TrustPool",
)
def chat(
    request: ChatRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Envoie un message au copilote.
    La langue est auto-détectée (FR / AR / EN).
    L'historique de session est mémorisé.
    """
    try:
        return engine.process_chat(
            db=db,
            user_id=uuid.UUID(current_user.user_id),
            request=request,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur copilote: {str(e)}",
        )


@router.get(
    "/history/{session_id}",
    response_model=ConversationHistoryOut,
    summary="📜 Historique d'une session de conversation",
)
def get_history(
    session_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Retourne l'historique complet d'une session."""
    vs = get_vector_store()
    messages = vs.get_conversation_history(db, session_id, limit=50)
    from app.ai.rag_common.schemas import ChatMessage
    return ConversationHistoryOut(
        session_id=session_id,
        messages=[ChatMessage(role=m["role"], content=m["content"]) for m in messages],
        total_messages=len(messages),
    )


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="📥 Ingérer un document (admin)",
)
def ingest(
    request: IngestRequest,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    db: Session = Depends(get_session),
):
    """
    Ingère un document dans la base RAG.
    Réservé aux admins de groupe.

    Collections recommandées :
    - faq_fr / faq_ar
    - reglement_fr / reglement_ar
    - guide_utilisation
    """
    nb_chunks, collection = engine.ingest_document(
        db=db,
        collection=request.collection,
        contenu=request.contenu,
        langue=request.langue,
        titre=request.titre,
        metadata=request.metadata,
    )
    return IngestResponse(
        chunks_created=nb_chunks,
        collection=collection,
        langue=request.langue,
    )


@router.get(
    "/collections",
    summary="📚 Lister les collections RAG disponibles",
)
def list_collections(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Liste les collections avec leur nombre de chunks."""
    vs = get_vector_store()
    return vs.list_collections(db)
