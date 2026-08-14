"""
Moteur RAG du Copilote TrustPool.
Pipeline complet : contextualisation → retrieval → génération → sauvegarde.

Fonctionnalités :
- Détection automatique de la langue (FR / AR / EN)
- Réponse dans la même langue que la question
- Mémoire contextuelle (historique de session)
- Enrichissement de la requête avec le profil utilisateur
- Citations des sources utilisées
"""
import logging
import uuid
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.ai.rag_common.vector_store import get_vector_store
from app.ai.rag_common.llm_service import get_llm_service
from app.ai.rag_common.schemas import ChatRequest, ChatResponse, DocumentSource
import app.config as cfg

logger = logging.getLogger(__name__)

# Collections interrogées par le copilote
_COPILOTE_COLLECTIONS = [
    # Documents PDF TrustPool (policies, architecture, FAQ complète)
    "trustpool_doc_fr", "trustpool_doc_ar",
    # FAQ et règlements (seed_data.py)
    "faq_fr", "faq_ar",
    "reglement_fr", "reglement_ar",
    "guide_utilisation",
]


def _get_user_context(db: Session, user_id: uuid.UUID) -> dict:
    """
    Enrichit la requête avec le contexte de l'utilisateur :
    groupes, profil, sinistres récents.
    """
    context = {}
    try:
        # Groupes de l'utilisateur
        from app.modules.groups.models import Adhesion, Groupe
        adhesions = db.query(Adhesion).filter(
            Adhesion.utilisateur_id == user_id,
            Adhesion.statut == "active"
        ).all()

        if adhesions:
            groupes = []
            for adh in adhesions:
                groupe = db.query(Groupe).filter(Groupe.id == adh.groupe_id).first()
                if groupe:
                    groupes.append(f"{groupe.nom} ({groupe.specialite})")
            context["groupes"] = groupes

    except Exception as e:
        logger.warning(f"Impossible de charger le contexte utilisateur: {e}")

    return context


def process_chat(
    db: Session,
    user_id: uuid.UUID,
    request: ChatRequest,
) -> ChatResponse:
    """
    Pipeline RAG complet pour le copilote.

    Étapes :
    1. Détecter la langue de la question
    2. Charger l'historique de session
    3. Recherche hybride dans les collections
    4. Enrichir avec le contexte utilisateur
    5. Générer la réponse via LLM
    6. Sauvegarder les messages
    7. Retourner la réponse avec sources

    Args:
        db       : Session SQLAlchemy
        user_id  : UUID de l'utilisateur connecté
        request  : ChatRequest (message, session_id, langue_preference)

    Returns:
        ChatResponse avec message, sources, langue
    """
    vs = get_vector_store()
    llm = get_llm_service()

    # ── 1. Détection de la langue ─────────────────────────────────────
    if request.langue_preference:
        langue = request.langue_preference
    else:
        langue = llm.detect_language(request.message)

    logger.info(f"[Copilote] Session={request.session_id} | Langue={langue}")

    # ── 2. Historique de conversation ─────────────────────────────────
    history = vs.get_conversation_history(db, request.session_id, limit=10)

    # ── 3. Recherche hybride ──────────────────────────────────────────
    # Construire une requête enrichie combinant le message actuel
    # avec les 2 derniers échanges pour un meilleur contexte
    enriched_query = request.message
    if history and len(history) >= 2:
        last_exchange = " ".join(
            m["content"] for m in history[-2:]
        )
        enriched_query = f"{last_exchange} {request.message}"

    # Chercher dans les 2 langues pour le Maroc (FR + AR)
    search_collections = _COPILOTE_COLLECTIONS
    results = vs.hybrid_search(
        db=db,
        query=enriched_query,
        collections=search_collections,
        top_k=cfg.RAG_TOP_K,
    )

    # ── 4. Contexte utilisateur ───────────────────────────────────────
    user_context = _get_user_context(db, user_id)

    # ── 5. Préparer les chunks pour le LLM ───────────────────────────
    context_chunks = [doc.contenu for doc, _score in results]
    sources: List[DocumentSource] = [
        DocumentSource(
            titre=doc.titre,
            collection=doc.collection,
            extrait=doc.contenu[:200] + "..." if len(doc.contenu) > 200 else doc.contenu,
            score=round(score, 4),
        )
        for doc, score in results
        if score >= cfg.RAG_SCORE_THRESHOLD
    ]

    # ── 6. Génération LLM ─────────────────────────────────────────────
    response_text = llm.generate(
        question=request.message,
        context_chunks=context_chunks,
        history=history,
        langue=langue,
        user_context=user_context,
    )

    # ── 7. Sauvegarder les messages ───────────────────────────────────
    vs.save_message(
        db=db,
        utilisateur_id=user_id,
        session_id=request.session_id,
        role="user",
        contenu=request.message,
        langue=langue,
    )
    vs.save_message(
        db=db,
        utilisateur_id=user_id,
        session_id=request.session_id,
        role="assistant",
        contenu=response_text,
        langue=langue,
        metadata={"sources": [s.collection for s in sources]},
    )

    return ChatResponse(
        message=response_text,
        langue_reponse=langue,
        sources=sources,
        session_id=request.session_id,
    )


def ingest_document(
    db: Session,
    collection: str,
    contenu: str,
    langue: str = "fr",
    titre: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> Tuple[int, str]:
    """
    Ingère un document dans une collection RAG.
    Retourne (nb_chunks, collection_name).
    """
    vs = get_vector_store()
    nb_chunks = vs.ingest_document(
        db=db,
        collection=collection,
        contenu=contenu,
        langue=langue,
        titre=titre,
        metadata=metadata,
    )
    return nb_chunks, collection
