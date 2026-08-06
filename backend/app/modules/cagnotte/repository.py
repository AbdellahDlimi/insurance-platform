import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.modules.cagnotte.models import Cagnotte, Cotisation


def create_cagnotte(db: Session, groupe_id: uuid.UUID, periode_courante: str) -> Cagnotte:
    # Delete existing if any to avoid uniqueness violation
    db.query(Cagnotte).filter(Cagnotte.groupe_id == groupe_id).delete()
    
    cagnotte = Cagnotte(
        groupe_id=groupe_id,
        solde_actuel=0.00,
        solde_buffer_pool=0.00,
        periode_courante=periode_courante,
    )
    db.add(cagnotte)
    db.commit()
    db.refresh(cagnotte)
    return cagnotte


def get_cagnotte_by_group_id(db: Session, groupe_id: uuid.UUID) -> Cagnotte | None:
    return db.query(Cagnotte).filter(Cagnotte.groupe_id == groupe_id).first()


def get_cagnotte_by_id(db: Session, cagnotte_id: uuid.UUID) -> Cagnotte | None:
    return db.query(Cagnotte).filter(Cagnotte.id == cagnotte_id).first()


def create_cotisation(
    db: Session,
    adhesion_id: uuid.UUID,
    cagnotte_id: uuid.UUID,
    montant_base: float,
    coefficient_applique: float,
    montant_final: float,
    periode: str,
    statut_paiement: str = "en_attente"
) -> Cotisation:
    # Remove existing pending cotisation for this period/adhesion if it exists
    # to avoid duplicates
    db.query(Cotisation).filter(
        Cotisation.adhesion_id == adhesion_id,
        Cotisation.cagnotte_id == cagnotte_id,
        Cotisation.statut_paiement == "en_attente"
    ).delete()

    cotisation = Cotisation(
        adhesion_id=adhesion_id,
        cagnotte_id=cagnotte_id,
        montant_base=montant_base,
        coefficient_applique=coefficient_applique,
        montant_final=montant_final,
        periode=periode,
        statut_paiement=statut_paiement,
    )
    db.add(cotisation)
    db.commit()
    db.refresh(cotisation)
    return cotisation


def get_cotisations_by_adhesion(db: Session, adhesion_id: uuid.UUID) -> list[Cotisation]:
    return db.query(Cotisation).filter(Cotisation.adhesion_id == adhesion_id).all()


def get_latest_cotisation_for_adhesion(db: Session, adhesion_id: uuid.UUID) -> Cotisation | None:
    return db.query(Cotisation).filter(Cotisation.adhesion_id == adhesion_id).order_by(Cotisation.id).first()


def get_cotisation_by_id(db: Session, cotisation_id: uuid.UUID) -> Cotisation | None:
    return db.query(Cotisation).filter(Cotisation.id == cotisation_id).first()


def update_cotisation_paiement(db: Session, cotisation_id: uuid.UUID, paye_le: datetime) -> Cotisation | None:
    cotisation = get_cotisation_by_id(db, cotisation_id)
    if cotisation:
        cotisation.statut_paiement = "paye"
        cotisation.paye_le = paye_le
        db.commit()
        db.refresh(cotisation)
    return cotisation


def crediter_cagnotte(db: Session, cagnotte_id: uuid.UUID, montant: float) -> Cagnotte | None:
    cagnotte = get_cagnotte_by_id(db, cagnotte_id)
    if cagnotte:
        cagnotte.solde_actuel = float(cagnotte.solde_actuel) + float(montant)
        db.commit()
        db.refresh(cagnotte)
    return cagnotte

