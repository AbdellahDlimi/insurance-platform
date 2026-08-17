"""
Vector Store — abstraction pgvector pour le système RAG.

Fournit :
- Ingestion de documents (chunking → embedding → stockage)
- Hybrid Search (vectoriel cosine + full-text PostgreSQL)
  avec Reciprocal Rank Fusion pour combiner les scores
- CRUD des collections
"""
import logging
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.rag_common.models import RagDocument, RagConversation
from app.ai.rag_common.chunker import RecursiveChunker
from app.ai.rag_common.embedding_service import get_embedding_service
import app.config as cfg

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Abstraction pgvector pour les opérations RAG.
    Toutes les méthodes prennent une Session SQLAlchemy.
    """

    def __init__(self):
        self.chunker = RecursiveChunker()
        self.embed = get_embedding_service()

    # ──────────────────────────────────────────────
    # INGESTION
    # ──────────────────────────────────────────────

    def ingest_document(
        self,
        db: Session,
        collection: str,
        contenu: str,
        langue: str = "fr",
        titre: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """
        Ingère un document :
        1. Découpe en chunks
        2. Génère les embeddings en batch
        3. Persiste dans rag_document

        Returns:
            Nombre de chunks créés
        """
        metadata = metadata or {}
        titre = titre or ""

        chunks = self.chunker.chunk_document(contenu, titre=titre, metadata=metadata)
        if not chunks:
            logger.warning(f"Document vide pour la collection '{collection}'")
            return 0

        # Embedding en batch
        texts = [c.contenu for c in chunks]
        embeddings = self.embed.embed_batch(texts, task_type="RETRIEVAL_DOCUMENT")

        # Persistance
        for chunk, embedding in zip(chunks, embeddings):
            doc = RagDocument(
                collection=collection,
                langue=langue,
                titre=titre or chunk.titre,
                contenu=chunk.contenu,
                metadata_={**chunk.metadata, **metadata},
                embedding=embedding,
            )
            db.add(doc)

        db.commit()
        logger.info(f"✅ {len(chunks)} chunks ingérés dans '{collection}' [{langue}]")
        return len(chunks)

    def delete_collection(self, db: Session, collection: str) -> int:
        """Supprime tous les documents d'une collection."""
        deleted = db.query(RagDocument).filter(
            RagDocument.collection == collection
        ).delete()
        db.commit()
        logger.info(f"🗑️  {deleted} chunks supprimés de '{collection}'")
        return deleted

    # ──────────────────────────────────────────────
    # RECHERCHE HYBRIDE
    # ──────────────────────────────────────────────

    def hybrid_search(
        self,
        db: Session,
        query: str,
        collections: List[str],
        langue: Optional[str] = None,
        top_k: Optional[int] = None,
    ) -> List[Tuple[RagDocument, float]]:
        """
        Recherche hybride avec Reciprocal Rank Fusion (RRF).

        1. Recherche vectorielle cosine (sémantique)
        2. Recherche full-text PostgreSQL (mots-clés)
        3. Fusion RRF des deux classements

        Args:
            query      : Question de l'utilisateur
            collections: Liste des collections à interroger
            langue     : Filtrer par langue ('fr', 'ar', None=toutes)
            top_k      : Nombre de résultats (défaut: cfg.RAG_TOP_K)

        Returns:
            Liste de (RagDocument, score_rrf) triée par pertinence
        """
        top_k = top_k or cfg.RAG_TOP_K

        # Embedding de la requête
        query_embedding = self.embed.embed_query(query)
        is_mock_embedding = all(v == 0.0 for v in query_embedding)

        # Filtre sur les collections
        collection_filter = "AND collection = ANY(:collections)"
        lang_filter = "AND langue = :langue" if langue else ""

        # ── 1. Recherche vectorielle (uniquement si vraie clé API présente) ──
        vector_sql = text(f"""
            SELECT id,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS score,
                   ROW_NUMBER() OVER (ORDER BY embedding <=> CAST(:embedding AS vector)) AS rank
            FROM rag_document
            WHERE embedding IS NOT NULL
              {collection_filter}
              {lang_filter}
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
        """)

        # ── 2. Recherche full-text ────────────────────────────────────
        fulltext_sql = text(f"""
            SELECT id,
                   ts_rank(tsv_fr, websearch_to_tsquery('french', :query)) AS score,
                   ROW_NUMBER() OVER (
                       ORDER BY ts_rank(tsv_fr, websearch_to_tsquery('french', :query)) DESC
                   ) AS rank
            FROM rag_document
            WHERE tsv_fr @@ websearch_to_tsquery('french', :query)
              {collection_filter}
              {lang_filter}
            ORDER BY score DESC
            LIMIT :limit
        """)

        params: dict = {
            "embedding": str(query_embedding),
            "query": query,
            "collections": collections,
            "limit": top_k * 3,  # Large pool avant RRF
        }
        if langue:
            params["langue"] = langue

        # Si l'embedding est factice (tous zéros), on fait une recherche textuelle pure
        if is_mock_embedding:
            try:
                fulltext_rows = db.execute(fulltext_sql, params).fetchall()
            except Exception as e:
                logger.error(f"Erreur fulltext search (mode démo): {e}")
                return []
            
            top_ids = [str(row.id) for row in fulltext_rows[:top_k]]
            if not top_ids:
                # Si aucun résultat textuel, renvoyer les premiers documents par défaut
                try:
                    default_docs = db.query(RagDocument).filter(
                        RagDocument.collection.in_(collections)
                    ).limit(top_k).all()
                    return [(doc, 1.0) for doc in default_docs]
                except Exception:
                    return []
            
            docs = db.query(RagDocument).filter(
                RagDocument.id.in_([uuid.UUID(i) for i in top_ids])
            ).all()
            docs_by_id = {str(d.id): d for d in docs}
            return [
                (docs_by_id[doc_id], 1.0 / (60 + i))
                for i, doc_id in enumerate(top_ids)
                if doc_id in docs_by_id
            ]

        try:
            vector_rows = db.execute(vector_sql, params).fetchall()
            fulltext_rows = db.execute(fulltext_sql, params).fetchall()
        except Exception as e:
            logger.error(f"Erreur hybrid_search: {e}")
            return []

        # ── 3. Reciprocal Rank Fusion ─────────────────────────────────
        k_rrf = 60  # Constante RRF standard
        rrf_scores: dict[str, float] = {}

        for row in vector_rows:
            doc_id = str(row.id)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k_rrf + row.rank)

        for row in fulltext_rows:
            doc_id = str(row.id)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k_rrf + row.rank)

        if not rrf_scores:
            return []

        # Récupérer les documents triés par score RRF
        sorted_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)
        top_ids = sorted_ids[:top_k]

        docs = db.query(RagDocument).filter(
            RagDocument.id.in_([uuid.UUID(i) for i in top_ids])
        ).all()

        # Conserver l'ordre RRF
        docs_by_id = {str(d.id): d for d in docs}
        results = [
            (docs_by_id[doc_id], rrf_scores[doc_id])
            for doc_id in top_ids
            if doc_id in docs_by_id
        ]

        return results

    # ──────────────────────────────────────────────
    # CONVERSATION HISTORY
    # ──────────────────────────────────────────────

    def save_message(
        self,
        db: Session,
        utilisateur_id: uuid.UUID,
        session_id: str,
        role: str,
        contenu: str,
        langue: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> RagConversation:
        """Persiste un message de conversation."""
        msg = RagConversation(
            utilisateur_id=utilisateur_id,
            session_id=session_id,
            role=role,
            contenu=contenu,
            langue_detectee=langue,
            metadata_=metadata or {},
        )
        db.add(msg)
        db.commit()
        return msg

    def get_conversation_history(
        self,
        db: Session,
        session_id: str,
        limit: int = 20,
    ) -> List[dict]:
        """
        Récupère l'historique de conversation d'une session.
        Retourne les messages dans l'ordre chronologique.
        """
        msgs = (
            db.query(RagConversation)
            .filter(RagConversation.session_id == session_id)
            .order_by(RagConversation.created_at.asc())
            .limit(limit)
            .all()
        )
        return [{"role": m.role, "content": m.contenu} for m in msgs]

    def list_collections(self, db: Session) -> List[dict]:
        """Liste les collections disponibles avec leur taille."""
        rows = db.execute(text("""
            SELECT collection, langue, COUNT(*) as nb_chunks
            FROM rag_document
            GROUP BY collection, langue
            ORDER BY collection, langue
        """)).fetchall()

        return [
            {"collection": r.collection, "langue": r.langue, "nb_chunks": r.nb_chunks}
            for r in rows
        ]


# Singleton
_vector_store: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store
