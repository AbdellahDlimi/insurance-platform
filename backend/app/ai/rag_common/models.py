"""
Modèles ORM SQLAlchemy pour le système RAG.
Tables : rag_document (chunks + embeddings), rag_conversation (historique).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Index, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    from sqlalchemy.types import UserDefinedType
    class Vector(UserDefinedType):
        def __init__(self, dim=None):
            self.dim = dim
        def get_col_spec(self, **kw):
            return f"vector({self.dim})" if self.dim else "vector"



from app.core.database import Base

from app.modules.users_kyc.models import Utilisateur  # Important pour la Foreign Key


class RagDocument(Base):
    """
    Stocke les chunks de documents avec leur embedding vectoriel.
    Utilisé pour la recherche hybride (vectorielle + full-text).
    """
    __tablename__ = "rag_document"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection = Column(String(100), nullable=False, index=True)
    langue = Column(String(10), nullable=False, default="fr", index=True)
    titre = Column(String(255), nullable=True)
    contenu = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )


class RagConversation(Base):
    """
    Historique de conversation du copilote, par session utilisateur.
    Permet la mémoire contextuelle entre les échanges.
    """
    __tablename__ = "rag_conversation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    utilisateur_id = Column(
        UUID(as_uuid=True),
        ForeignKey("utilisateur.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    session_id = Column(String(100), nullable=False, index=True)
    role = Column(String(20), nullable=False)       # 'user' | 'assistant' | 'system'
    contenu = Column(Text, nullable=False)
    langue_detectee = Column(String(10), nullable=True)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
