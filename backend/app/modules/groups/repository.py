import uuid
from sqlalchemy.orm import Session
from app.modules.groups.models import Groupe, DemandeAdhesion, Adhesion
from app.modules.groups.schemas import GroupCreate

def create_group(db: Session, admin_id: uuid.UUID, data: GroupCreate) -> Groupe:
    group = Groupe(
        nom=data.nom,
        specialite=data.specialite,
        capacite_max=data.capacite_max,
        admin_id=admin_id,
        cotisation_de_base=data.cotisation_de_base,
        buffer_pool_cible=data.buffer_pool_cible,
        reglement_pdf_url=data.reglement_pdf_url,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def get_group_by_id(db: Session, group_id: uuid.UUID) -> Groupe | None:
    return db.query(Groupe).filter(Groupe.id == group_id).first()


def get_open_groups(db: Session) -> list[Groupe]:
    return db.query(Groupe).filter(Groupe.est_ouvert == True).all()


def create_join_request(
    db: Session, user_id: uuid.UUID, group_id: uuid.UUID, score_compatibilite: float
) -> DemandeAdhesion:
    # Remove any existing join request for this user and group
    db.query(DemandeAdhesion).filter(
        DemandeAdhesion.utilisateur_id == user_id,
        DemandeAdhesion.groupe_id == group_id
    ).delete()
    
    req = DemandeAdhesion(
        utilisateur_id=user_id,
        groupe_id=group_id,
        score_compatibilite=score_compatibilite,
        statut="en_attente",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def get_join_request_by_id(db: Session, request_id: uuid.UUID) -> DemandeAdhesion | None:
    return db.query(DemandeAdhesion).filter(DemandeAdhesion.id == request_id).first()


def get_join_request_by_user_and_group(
    db: Session, user_id: uuid.UUID, group_id: uuid.UUID
) -> DemandeAdhesion | None:
    return db.query(DemandeAdhesion).filter(
        DemandeAdhesion.utilisateur_id == user_id,
        DemandeAdhesion.groupe_id == group_id
    ).first()


def update_join_request_status(
    db: Session, request_id: uuid.UUID, statut: str
) -> DemandeAdhesion | None:
    req = get_join_request_by_id(db, request_id)
    if req:
        req.statut = statut
        db.commit()
        db.refresh(req)
    return req


def create_adhesion(db: Session, user_id: uuid.UUID, group_id: uuid.UUID) -> Adhesion:
    # Avoid duplicate active adhesions
    existing = get_adhesion_by_user_and_group(db, user_id, group_id)
    if existing:
        if existing.statut != "active":
            existing.statut = "active"
            existing.coefficient_actuel = 1.0
            existing.nb_sinistres_periode = 0
            db.commit()
            db.refresh(existing)
        return existing

    adhesion = Adhesion(
        utilisateur_id=user_id,
        groupe_id=group_id,
        statut="active",
        coefficient_actuel=1.0,
        nb_sinistres_periode=0,
    )
    db.add(adhesion)
    db.commit()
    db.refresh(adhesion)
    return adhesion


def get_adhesion_by_user_and_group(
    db: Session, user_id: uuid.UUID, group_id: uuid.UUID
) -> Adhesion | None:
    return db.query(Adhesion).filter(
        Adhesion.utilisateur_id == user_id,
        Adhesion.groupe_id == group_id
    ).first()


def get_members_by_group(db: Session, group_id: uuid.UUID) -> list[Adhesion]:
    return db.query(Adhesion).filter(
        Adhesion.groupe_id == group_id,
        Adhesion.statut == "active"
    ).all()


def get_group_members_enriched(db: Session, group_id: uuid.UUID, admin_id: uuid.UUID) -> list[tuple]:
    """Retourne les membres actifs d'un groupe avec leurs infos utilisateur.
    Chaque élément est un tuple (Adhesion, Utilisateur)."""
    from app.modules.users_kyc.models import Utilisateur
    return (
        db.query(Adhesion, Utilisateur)
        .join(Utilisateur, Utilisateur.id == Adhesion.utilisateur_id)
        .filter(Adhesion.groupe_id == group_id, Adhesion.statut == "active")
        .order_by(Adhesion.date_adhesion)
        .all()
    )


def get_join_requests_by_group(db: Session, group_id: uuid.UUID) -> list[DemandeAdhesion]:
    return db.query(DemandeAdhesion).filter(DemandeAdhesion.groupe_id == group_id).all()


def get_pending_requests_by_group(db: Session, group_id: uuid.UUID) -> list[DemandeAdhesion]:
    """Retourne uniquement les demandes en_attente pour un groupe."""
    return db.query(DemandeAdhesion).filter(
        DemandeAdhesion.groupe_id == group_id,
        DemandeAdhesion.statut == "en_attente",
    ).all()


def get_all_pending_requests_for_admin(db: Session, admin_id: uuid.UUID) -> list[tuple]:
    """Retourne toutes les demandes en_attente pour tous les groupes administrés par admin_id.
    Chaque élément est un tuple (DemandeAdhesion, Groupe, Utilisateur)."""
    from app.modules.users_kyc.models import Utilisateur
    return (
        db.query(DemandeAdhesion, Groupe, Utilisateur)
        .join(Groupe, Groupe.id == DemandeAdhesion.groupe_id)
        .join(Utilisateur, Utilisateur.id == DemandeAdhesion.utilisateur_id)
        .filter(
            Groupe.admin_id == admin_id,
            DemandeAdhesion.statut == "en_attente",
        )
        .order_by(DemandeAdhesion.date_demande.desc())
        .all()
    )

def get_adhesions_by_user(db: Session, user_id: uuid.UUID) -> list[Adhesion]:
    return db.query(Adhesion).filter(
        Adhesion.utilisateur_id == user_id,
        Adhesion.statut == "active"
    ).all()

