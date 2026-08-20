"""
Service LLM utilisant Google Gemini 2.0 Flash (nouveau SDK google-genai).
Détection automatique de la langue (FR / AR / EN).
"""
import logging
import time
from typing import List, Optional

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    types = None
    GENAI_AVAILABLE = False

import app.config as cfg

logger = logging.getLogger(__name__)

_client = None

def _get_client():
    global _client
    if not GENAI_AVAILABLE:
        return None
    if _client is None and cfg.GEMINI_API_KEY and "YOUR_GEMINI_API_KEY" not in cfg.GEMINI_API_KEY:
        try:
            _client = genai.Client(api_key=cfg.GEMINI_API_KEY)
        except Exception as e:
            logger.error(f"Erreur initialisation client Gemini: {e}")
            _client = None
    return _client


_SYSTEM_PROMPT = """
Tu es le Copilote IA de TrustPool, une plateforme d'assurance collaborative P2P.
Tu aides les membres à comprendre leurs couvertures, cotisations, sinistres et le fonctionnement de la plateforme.

RÈGLES :
1. Réponds TOUJOURS dans la même langue que la question (arabe, français ou anglais).
2. Sois précis, bienveillant et professionnel.
3. Cite tes sources si elles proviennent de la base de connaissance.
4. Si tu ne sais pas, dis-le honnêtement — ne jamais inventer.
5. Ne divulgue jamais d'informations d'autres membres.
"""


class LLMService:
    """Client Gemini 2.0 Flash pour la génération RAG multilingue."""

    def __init__(self, model: Optional[str] = None):
        self.model_name = model or cfg.GEMINI_LLM_MODEL

    def detect_language(self, text: str) -> str:
        """Détection heuristique FR / AR / EN."""
        if not text:
            return "fr"
        arabic = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
        if arabic / max(len(text), 1) > 0.15:
            return "ar"
        en_kw = ["what", "how", "when", "where", "why", "can you", "please", "help"]
        if any(k in text.lower() for k in en_kw):
            return "en"
        return "fr"

    def build_prompt(
        self,
        question: str,
        context_chunks: List[str],
        history: List[dict],
        langue: str = "fr",
        user_context: Optional[dict] = None,
    ) -> str:
        labels = {
            "ar": ("السياق:", "محادثة سابقة:", "معلومات المستخدم:", "السؤال:", "أجب بالعربية بناءً على السياق فقط."),
            "en": ("Context:", "Previous conversation:", "User info:", "Question:", "Answer in English based only on the context."),
            "fr": ("Contexte :", "Historique :", "Infos utilisateur :", "Question :", "Réponds en français en te basant sur le contexte fourni."),
        }
        ctx_label, hist_label, user_label, q_label, instruction = labels.get(langue, labels["fr"])

        parts = [_SYSTEM_PROMPT]

        if user_context and user_context.get("groupes"):
            parts.append(f"{user_label}\n- Groupes : {', '.join(user_context['groupes'])}")

        if context_chunks:
            parts.append(f"\n{ctx_label}")
            for i, chunk in enumerate(context_chunks, 1):
                parts.append(f"[{i}] {chunk[:800]}")

        if history:
            parts.append(f"\n{hist_label}")
            for msg in history[-6:]:
                role = "Utilisateur" if msg["role"] == "user" else "Copilote"
                parts.append(f"{role}: {msg['content'][:300]}")

        parts.append(f"\n{q_label} {question}\n{instruction}")
        return "\n".join(parts)

    def generate(
        self,
        question: str,
        context_chunks: List[str],
        history: List[dict],
        langue: str = "fr",
        user_context: Optional[dict] = None,
        max_retries: int = 2,
    ) -> str:
        client = _get_client()
        if not client:
            if context_chunks:
                header = (
                    "⚠️ **Mode Démo (Clé API Gemini non configurée)**\n"
                    "Voici les informations pertinentes trouvées dans la base de connaissances TrustPool :\n\n"
                ) if langue != "ar" else (
                    "⚠️ **الوضع التجريبي (مفتاح API غير مكوّن)**\n"
                    "إليك المعلومات ذات الصلة التي تم العثور عليها في قاعدة المعرفة TrustPool :\n\n"
                )
                
                formatted_chunks = []
                for chunk in context_chunks[:2]:
                    clean_chunk = chunk.strip()
                    formatted_chunks.append(f"📄 {clean_chunk}")
                
                footer = (
                    "\n\n*(Pour activer les réponses fluides et intelligentes du Copilote, veuillez ajouter une clé `GEMINI_API_KEY` valide dans le fichier `backend/.env`)*"
                ) if langue != "ar" else (
                    "\n\n*(لتفعيل إجابات Copilot الذكية، يرجى إضافة مفتاح `GEMINI_API_KEY` صالح في ملف `backend/.env`)*"
                )
                
                return header + "\n\n".join(formatted_chunks) + footer
            else:
                return (
                    "⚠️ **Mode Démo**\n"
                    "La clé API Gemini n'est pas configurée dans `backend/.env`. Veuillez ajouter `GEMINI_API_KEY` pour activer le Copilote."
                ) if langue != "ar" else (
                    "⚠️ **الوضع التجريبي**\n"
                    "مفتاح API لـ Gemini غير مكوّن في `backend/.env`. يرجى إضافة `GEMINI_API_KEY` لتفعيل Copilot."
                )

        prompt = self.build_prompt(question, context_chunks, history, langue, user_context)

        for attempt in range(max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=1024,
                        temperature=0.3,
                        top_p=0.8,
                    ),
                )
                return response.text
            except Exception as e:
                err = str(e).lower()
                if ("429" in err or "quota" in err) and attempt < max_retries:
                    time.sleep(2 ** attempt)
                    continue
                logger.error(f"Erreur LLM Gemini (attempt {attempt+1}): {e}")
                break

        return "Désolé, une erreur est survenue. Réessayez." if langue != "ar" else "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
