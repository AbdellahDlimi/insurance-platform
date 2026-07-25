"""
Connexion PostgreSQL partagée (SQLAlchemy).
Le schéma est défini dans infra/init.sql — ne jamais créer de table
autrement que via ce fichier (ou une migration Alembic future).
"""
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://admin:password@localhost:5432/insurance_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base commune à TOUS les modèles ORM du projet (A et B).
# Chaque module importe Base depuis ce fichier, jamais sa propre instance.
Base = declarative_base()


def get_session() -> Session:
    """Dépendance FastAPI standard pour obtenir une session DB."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()