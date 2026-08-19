"""
Accès aux données du module claims (SQLAlchemy).
Aucune logique métier ici, uniquement des requêtes.
"""
from uuid import UUID
from typing import Optional

from sqlalchemy.orm import Session

from app.modules.claims.models import Sinistre, PieceJustificative, AlerteFraude


def create_sinistre(session: Session, **kwargs) -> Sinistre:
    """Insère un nouveau sinistre en base."""
    sinistre = Sinistre(**kwargs)
    session.add(sinistre)
    session.commit()
    session.refresh(sinistre)
    return sinistre


def get_sinistre_by_id(session: Session, sinistre_id: UUID) -> Optional[Sinistre]:
    """Récupère un sinistre par son ID."""
    return session.query(Sinistre).filter(Sinistre.id == sinistre_id).first()


def list_sinistres_by_groupe(session: Session, groupe_id: UUID) -> list[Sinistre]:
    """Liste tous les sinistres d'un groupe."""
    return (
        session.query(Sinistre)
        .filter(Sinistre.groupe_id == groupe_id)
        .order_by(Sinistre.date_declaration.desc())
        .all()
    )


def list_sinistres_by_adhesion(session: Session, adhesion_id: UUID) -> list[Sinistre]:
    """Liste tous les sinistres d'une adhésion (= d'un membre dans un groupe)."""
    return (
        session.query(Sinistre)
        .filter(Sinistre.adhesion_id == adhesion_id)
        .order_by(Sinistre.date_declaration.desc())
        .all()
    )


def update_sinistre(session: Session, sinistre: Sinistre, **kwargs) -> Sinistre:
    """Met à jour les champs d'un sinistre existant."""
    for key, value in kwargs.items():
        setattr(sinistre, key, value)
    session.commit()
    session.refresh(sinistre)
    return sinistre


def list_pieces_by_sinistre(
    session: Session, sinistre_id: UUID
) -> list[PieceJustificative]:
    """Liste toutes les pièces justificatives d'un sinistre."""
    return (
        session.query(PieceJustificative)
        .filter(PieceJustificative.sinistre_id == sinistre_id)
        .all()
    )


def create_piece_justificative(session: Session, **kwargs) -> PieceJustificative:
    """Insère une nouvelle pièce justificative."""
    piece = PieceJustificative(**kwargs)
    session.add(piece)
    session.commit()
    session.refresh(piece)
    return piece


def create_alerte_fraude(session: Session, **kwargs) -> AlerteFraude:
    """Insère une nouvelle alerte de fraude."""
    alerte = AlerteFraude(**kwargs)
    session.add(alerte)
    session.commit()
    session.refresh(alerte)
    return alerte


def get_piece_by_id(session: Session, piece_id: UUID) -> Optional[PieceJustificative]:
    """Récupère une pièce justificative par son ID."""
    return session.query(PieceJustificative).filter(PieceJustificative.id == piece_id).first()


def list_alertes_by_sinistre(
    session: Session, sinistre_id: UUID
) -> list[AlerteFraude]:
    """Liste toutes les alertes de fraude d'un sinistre."""
    return (
        session.query(AlerteFraude)
        .filter(AlerteFraude.sinistre_id == sinistre_id)
        .all()
    )

