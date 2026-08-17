"""
Service d'embedding utilisant l'API Google Gemini (nouveau SDK google-genai).
Modèle : text-embedding-004 → 768 dimensions, gratuit en free tier.
"""
import logging
import hashlib
from typing import List, Optional

from google import genai
from google.genai import types
import app.config as cfg

logger = logging.getLogger(__name__)

_client: Optional[genai.Client] = None


def _get_client() -> Optional[genai.Client]:
    global _client
    if _client is None and cfg.GEMINI_API_KEY and "YOUR_GEMINI_API_KEY" not in cfg.GEMINI_API_KEY:
        try:
            _client = genai.Client(api_key=cfg.GEMINI_API_KEY)
        except Exception as e:
            logger.error(f"Erreur initialisation client Gemini embedding: {e}")
            _client = None
    return _client


class EmbeddingService:
    """
    Client pour les embeddings Gemini text-embedding-004.
    Dimension : 768. Cache en mémoire pour éviter les appels redondants.
    """

    _cache: dict = {}

    def __init__(self, model: Optional[str] = None):
        self.model = model or cfg.GEMINI_EMBEDDING_MODEL

    def _cache_key(self, text: str) -> str:
        return hashlib.md5(f"{self.model}::{text}".encode()).hexdigest()

    def embed_text(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
        """Génère l'embedding d'un texte. Retourne 768 floats."""
        client = _get_client()
        if not client:
            logger.warning("GEMINI_API_KEY non configurée — embedding vide")
            return [0.0] * 768

        key = self._cache_key(text)
        if key in self._cache:
            return self._cache[key]

        try:
            result = client.models.embed_content(
                model=self.model,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=768,   # Forcer 768 dims (compatible HNSW < 2000)
                ),
            )
            embedding = result.embeddings[0].values
            self._cache[key] = embedding
            return embedding
        except Exception as e:
            logger.error(f"Erreur embedding Gemini: {e}")
            return [0.0] * 768

    def embed_query(self, query: str) -> List[float]:
        """Embedding optimisé pour une requête de recherche."""
        return self.embed_text(query, task_type="RETRIEVAL_QUERY")

    def embed_batch(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        """Embedding en lot."""
        client = _get_client()
        if not client:
            return [[0.0] * 768 for _ in texts]

        try:
            result = client.models.embed_content(
                model=self.model,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=768,   # Forcer 768 dims
                ),
            )
            embeddings = [e.values for e in result.embeddings]
            for text, emb in zip(texts, embeddings):
                self._cache[self._cache_key(text)] = emb
            return embeddings
        except Exception as e:
            logger.warning(f"Batch embedding échoué, fallback séquentiel: {e}")
            return [self.embed_text(t, task_type) for t in texts]


_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
