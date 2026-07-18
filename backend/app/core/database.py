"""
Connexion PostgreSQL partagée (SQLAlchemy).
Le schéma est défini dans infra/init.sql — ne jamais créer de table
autrement que via ce fichier (ou une migration Alembic future).
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/insurance_platform"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session() -> Session:
    """Dépendance FastAPI standard pour obtenir une session DB."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
