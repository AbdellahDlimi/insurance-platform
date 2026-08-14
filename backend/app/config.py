"""
Configuration centrale de l'application, lue depuis les variables
d'environnement (.env). Ne jamais mettre de secret en dur ici.
"""
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS")
FERNET_KEY = os.environ.get("FERNET_KEY")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

# Resend config
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "TrustPool <noreply@trustpool.io>")

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000").split(",")

# Stripe config
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
<<<<<<< HEAD
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
=======

# ── AI / RAG (Gemini) ─────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
# Embedding: gemini-embedding-001 → 768 dimensions, gratuit en free tier
GEMINI_EMBEDDING_MODEL = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
# LLM: gemini-3.1-flash-lite → rapide, gratuit en free tier
GEMINI_LLM_MODEL = os.environ.get("GEMINI_LLM_MODEL", "gemini-3.1-flash-lite")

# RAG tuning
RAG_CHUNK_SIZE = int(os.environ.get("RAG_CHUNK_SIZE", "600"))
RAG_CHUNK_OVERLAP = int(os.environ.get("RAG_CHUNK_OVERLAP", "80"))
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "5"))
RAG_SCORE_THRESHOLD = float(os.environ.get("RAG_SCORE_THRESHOLD", "0.3"))

# Langues supportées par le copilote
RAG_SUPPORTED_LANGUAGES = ["fr", "ar", "en"]
>>>>>>> e05d065 (feat(ai): intégration complète du Copilote RAG multilingue (Phase 1))
