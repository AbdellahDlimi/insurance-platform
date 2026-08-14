"""
Script d'ingestion du PDF TrustPool dans le système RAG.

Parse le PDF, nettoie le texte par section, puis ingère :
  1. Version française (directe depuis le PDF)
  2. Version arabe (traduction automatique via Gemini)

Usage :
  cd backend && source venv/bin/activate
  python -m app.ai.rag_copilote.ingest_pdf
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from dotenv import load_dotenv
load_dotenv()

import time
from app.core.database import SessionLocal
from app.ai.rag_common.pdf_parser import PDFParser
from app.ai.rag_common.vector_store import VectorStore
from app.ai.rag_common.llm_service import get_llm_service

# Chemin du PDF dans les sources
PDF_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "TrustPool_doc.pdf")

# Collections cibles
COLLECTION_FR = "trustpool_doc_fr"
COLLECTION_AR = "trustpool_doc_ar"


def translate_to_arabic(text: str, section_title: str = "") -> str:
    """
    Traduit une section du document en arabe via Gemini.
    On utilise le LLM pour une traduction contextuelle de qualité.
    """
    llm = get_llm_service()
    from google import genai
    from google.genai import types
    import app.config as cfg

    client = genai.Client(api_key=cfg.GEMINI_API_KEY)

    prompt = f"""Traduis le texte suivant du français vers l'arabe.
C'est un document officiel d'une plateforme d'assurance collaborative (TrustPool).

RÈGLES DE TRADUCTION :
- Garde les termes techniques en anglais entre parenthèses : KYC, P2P, bonus-malus, buffer pool
- Conserve les noms propres : TrustPool, Stripe, PostgreSQL
- Utilise l'arabe standard moderne (فصحى)
- Garde la même structure et les mêmes numérotations
- Ne traduis PAS les exemples de code, URLs, ou noms de variables

Section : {section_title}

TEXTE À TRADUIRE :
{text[:3000]}

TRADUCTION EN ARABE :"""

    try:
        response = client.models.generate_content(
            model=cfg.GEMINI_LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=4096,
                temperature=0.2,
            ),
        )
        return response.text
    except Exception as e:
        print(f"  ⚠️  Erreur traduction '{section_title}': {e}")
        return ""


def ingest():
    """Pipeline principal d'ingestion."""
    db = SessionLocal()
    vs = VectorStore()
    parser = PDFParser()

    try:
        # ── 1. Parser le PDF ──────────────────────────────────────────
        print(f"📄 Parsing du PDF: {PDF_PATH}")
        parsed = parser.parse_file(PDF_PATH)
        print(f"   ✅ {parsed.nb_pages} pages, {len(parsed.sections)} sections, {parsed.nb_caracteres} chars")
        print()

        # ── 2. Nettoyer les anciennes collections ─────────────────────
        print("🗑️  Nettoyage des anciennes collections...")
        vs.delete_collection(db, COLLECTION_FR)
        vs.delete_collection(db, COLLECTION_AR)
        print()

        # ── 3. Ingestion FR (depuis le PDF) ───────────────────────────
        print("🇫🇷 Ingestion version française...")
        total_chunks_fr = 0

        # Ingérer section par section pour un meilleur contexte
        for i, section in enumerate(parsed.sections):
            if len(section.contenu.strip()) < 50:
                continue  # Skip les sections trop courtes

            nb = vs.ingest_document(
                db=db,
                collection=COLLECTION_FR,
                contenu=section.contenu,
                langue="fr",
                titre=section.titre,
                metadata={
                    "source": "TrustPool_doc.pdf",
                    "page_debut": section.page_debut,
                    "page_fin": section.page_fin,
                    "section_index": i,
                },
            )
            total_chunks_fr += nb
            print(f"   [{i+1}/{len(parsed.sections)}] {section.titre[:50]:<50} → {nb} chunks")

        print(f"\n   ✅ Total FR: {total_chunks_fr} chunks ingérés")
        print()

        # ── 4. Traduction + Ingestion AR ──────────────────────────────
        print("🇲🇦 Traduction et ingestion version arabe...")
        total_chunks_ar = 0

        for i, section in enumerate(parsed.sections):
            if len(section.contenu.strip()) < 50:
                continue

            # Traduction via Gemini
            translated = translate_to_arabic(section.contenu, section.titre)
            if not translated or len(translated.strip()) < 30:
                print(f"   [{i+1}] ⏭️  Skip (traduction vide): {section.titre[:50]}")
                continue

            # Pause pour respecter les rate limits du free tier
            time.sleep(1)

            nb = vs.ingest_document(
                db=db,
                collection=COLLECTION_AR,
                contenu=translated,
                langue="ar",
                titre=section.titre,
                metadata={
                    "source": "TrustPool_doc.pdf",
                    "page_debut": section.page_debut,
                    "page_fin": section.page_fin,
                    "section_index": i,
                    "traduit_de": "fr",
                },
            )
            total_chunks_ar += nb
            print(f"   [{i+1}/{len(parsed.sections)}] {section.titre[:50]:<50} → {nb} chunks")

        print(f"\n   ✅ Total AR: {total_chunks_ar} chunks ingérés")
        print()

        # ── 5. Résumé ─────────────────────────────────────────────────
        print("=" * 60)
        print(f"✅ Ingestion terminée !")
        print(f"   📄 Source : TrustPool_doc.pdf ({parsed.nb_pages} pages)")
        print(f"   🇫🇷 Français : {total_chunks_fr} chunks → collection '{COLLECTION_FR}'")
        print(f"   🇲🇦 Arabe    : {total_chunks_ar} chunks → collection '{COLLECTION_AR}'")
        print(f"   💾 Stockés dans pgvector avec embeddings Gemini (768d)")
        print("=" * 60)

    except Exception as e:
        import traceback
        print(f"\n❌ Erreur: {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    ingest()
