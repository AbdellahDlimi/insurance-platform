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
