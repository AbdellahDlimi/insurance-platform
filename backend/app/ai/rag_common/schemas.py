"""
Schémas Pydantic partagés pour tout le système RAG.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Un message dans la conversation (user ou assistant)."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    langue: Optional[str] = None


class ChatRequest(BaseModel):
    """Requête envoyée au copilote."""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1, max_length=100)
    # Langue préférée de réponse (si None → auto-détection)
    langue_preference: Optional[str] = Field(None, pattern="^(fr|ar|en)$")


class DocumentSource(BaseModel):
    """Source citée dans une réponse RAG."""
    titre: Optional[str] = None
    collection: str
    extrait: str   # Les 200 premiers caractères du chunk pertinent
    score: float


class ChatResponse(BaseModel):
    """Réponse du copilote."""
    message: str
    langue_reponse: str
    sources: List[DocumentSource] = []
    session_id: str


class IngestRequest(BaseModel):
    """Requête pour ingérer un document dans le RAG."""
    collection: str = Field(..., description="Ex: 'faq_fr', 'reglement_ar', 'juridique'")
    langue: str = Field("fr", pattern="^(fr|ar|en)$")
    titre: Optional[str] = None
    contenu: str = Field(..., min_length=10)
    metadata: dict = Field(default_factory=dict)


class IngestResponse(BaseModel):
    """Résultat de l'ingestion."""
    chunks_created: int
    collection: str
    langue: str


class ConversationHistoryOut(BaseModel):
    """Historique de conversation pour une session."""
    session_id: str
    messages: List[ChatMessage]
    total_messages: int
