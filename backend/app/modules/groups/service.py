import random
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.groups import repository
from app.modules.groups.models import Groupe, DemandeAdhesion, Adhesion
from app.modules.groups.schemas import GroupCreate, PendingRequestOut, MemberOut
from app.modules.groups.events import produce_adhesion_requested, produce_adhesion_validated
from app.modules.users_kyc.service import get_kyc_status
from app.modules.users_kyc.models import Utilisateur
from app.modules.cagnotte.models import Cagnotte, Cotisation


def create_group(db: Session, admin_id: uuid.UUID, data: GroupCreate) -> Groupe:
    """
    Crée un nouveau groupe d'assurance collaborative.
    L'utilisateur créateur devient l'admin du groupe et son rôle passe à 'admin_groupe'.
    Initialise également la cagnotte du groupe avec un solde à 0.
    """
    # 1. Promouvoir le créateur au rôle 'admin_groupe'
    user = db.query(Utilisateur).filter(Utilisateur.id == admin_id).first()
    if user and user.role == "membre":
        user.role = "admin_groupe"
        db.commit()

    # 2. Création du groupe
    group = repository.create_group(db, admin_id, data)
    
    # 2.5 Création de l'adhésion de l'admin
    repository.create_adhesion(db, admin_id, group.id)
    
    # 3. Appel croisé au module cagnotte pour l'initialisation de la cagnotte
    try:
        from app.modules.cagnotte.service import creer_cagnotte_initiale
        creer_cagnotte_initiale(db, group.id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création de la cagnotte associée au groupe : {e}"
        )
        
    return group


def request_to_join_group(db: Session, user_id: uuid.UUID, group_id: uuid.UUID) -> DemandeAdhesion:
    """
    Permet à un utilisateur de demander à rejoindre un groupe.
    Vérifie préalablement que son KYC est vérifié ('verified').
    """
    # 1. Vérifier si le groupe existe
    group = repository.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe spécifié n'existe pas",
        )
        
    if not group.est_ouvert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce groupe est fermé aux nouvelles adhésions",
        )
        
    # 2. Vérification KYC (Appel croisé au module users_kyc)
    try:
        kyc = get_kyc_status(db, user_id)
        if kyc.statut_verification != "verified":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Votre KYC doit être vérifié (Statut actuel : {kyc.statut_verification})",
            )
    except HTTPException as e:
        if e.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous devez soumettre vos documents KYC avant de postuler à un groupe",
            )
        raise e

    # 3. Vérifier s'il est déjà membre
    existing_adhesion = repository.get_adhesion_by_user_and_group(db, user_id, group_id)
    if existing_adhesion and existing_adhesion.statut == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous êtes déjà membre de ce groupe",
        )

    # 4. Simulation du score de compatibilité (calculé par le Moteur IA)
    score_compatibilite = round(random.uniform(0.65, 0.98), 4)

    # 5. Créer la demande
    req = repository.create_join_request(db, user_id, group_id, score_compatibilite)

    # 6. Publier l'événement Kafka adhesion.requested
    produce_adhesion_requested(req.id, user_id, group_id, score_compatibilite)

    return req


def validate_join_request(
    db: Session,
    request_id: uuid.UUID,
    admin_id: uuid.UUID,
    statut: str
) -> DemandeAdhesion:
    """
    Permet à l'admin du groupe d'accepter ou rejeter une demande d'adhésion.
    Crée l'adhésion si acceptée et publie l'événement Kafka correspondant.
    """
    # 1. Vérifier si la demande existe
    req = repository.get_join_request_by_id(db, request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La demande d'adhésion n'existe pas",
        )
        
    if req.statut != "en_attente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La demande d'adhésion a déjà été traitée (Statut : {req.statut})",
        )

    # 2. Vérifier si l'utilisateur qui valide est bien l'admin du groupe concerné
    group = repository.get_group_by_id(db, req.groupe_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe associé à cette demande est introuvable",
        )
        
    if group.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul l'administrateur du groupe peut valider cette demande",
        )

    if statut not in ["acceptee", "refusee"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le statut de validation doit être 'acceptee' ou 'refusee'",
        )

    # 3. Traiter la validation
    updated_req = repository.update_join_request_status(db, request_id, statut)
    
    adhesion_id = None
    if statut == "acceptee":
        # Vérifier la capacité max
        if group.capacite_max is not None:
            active_members = repository.get_members_by_group(db, group.id)
            if len(active_members) >= group.capacite_max:
                repository.update_join_request_status(db, request_id, "refusee")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La capacité maximale de ce groupe est atteinte",
                )
        
        # Création de l'adhésion
        adhesion = repository.create_adhesion(db, req.utilisateur_id, req.groupe_id)
        adhesion_id = adhesion.id

        # Création de la cotisation initiale
        from app.modules.cagnotte.repository import create_cotisation, get_cagnotte_by_group_id
        from app.modules.cagnotte.models import Cotisation
        cagnotte = get_cagnotte_by_group_id(db, group.id)
        if cagnotte:
            # Récupérer le montant de l'appel en cours s'il y en a un
            existing_cot = db.query(Cotisation).filter(
                Cotisation.cagnotte_id == cagnotte.id,
                Cotisation.periode == cagnotte.periode_courante
            ).first()
            if existing_cot:
                mb = float(existing_cot.montant_base)
                create_cotisation(
                    db=db,
                    adhesion_id=adhesion.id,
                    cagnotte_id=cagnotte.id,
                    montant_base=mb,
                    coefficient_applique=float(adhesion.coefficient_actuel),
                    montant_final=mb * float(adhesion.coefficient_actuel),
                    periode=cagnotte.periode_courante,
                    statut_paiement="en_attente"
                )

    # 4. Publier l'événement Kafka adhesion.validated
    produce_adhesion_validated(
        adhesion_id=adhesion_id,
        utilisateur_id=req.utilisateur_id,
        groupe_id=req.groupe_id,
        valide_par_admin_id=admin_id,
        statut=statut,
    )

    return updated_req


def validate_join_request_by_user(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    admin_id: uuid.UUID,
    statut: str
) -> DemandeAdhesion:
    """
    Helper pour valider une demande d'adhésion en connaissant le groupe et le membre.
    """
    req = repository.get_join_request_by_user_and_group(db, user_id, group_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune demande d'adhésion trouvée pour cet utilisateur dans ce groupe",
        )
    return validate_join_request(db, req.id, admin_id, statut)


def get_group_members(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> list[Adhesion]:
    """
    Récupère les membres actifs d'un groupe.
    Vérifie d'abord que le groupe existe.
    """
    group = repository.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe spécifié n'existe pas",
        )
        
    if group.admin_id != user_id:
        existing_adhesion = repository.get_adhesion_by_user_and_group(db, user_id, group_id)
        if not existing_adhesion or existing_adhesion.statut != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les membres du groupe peuvent voir les membres",
            )
            
    return repository.get_members_by_group(db, group_id)


def get_group_members_enriched(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> list[MemberOut]:
    """
    Récupère les membres actifs avec leur pseudonyme et un flag is_admin.
    Accessible uniquement aux membres du groupe et à l'admin.
    """
    group = repository.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe spécifié n'existe pas",
        )
        
    if group.admin_id != user_id:
        existing_adhesion = repository.get_adhesion_by_user_and_group(db, user_id, group_id)
        if not existing_adhesion or existing_adhesion.statut != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les membres du groupe peuvent voir les détails des membres",
            )
            
    rows = repository.get_group_members_enriched(db, group_id, group.admin_id)
    
    # Check paid status for the current period
    cagnotte = db.query(Cagnotte).filter(Cagnotte.groupe_id == group_id).first()
    paid_adhesions = set()
    if cagnotte:
        cotisations = db.query(Cotisation).filter(
            Cotisation.cagnotte_id == cagnotte.id,
            Cotisation.periode == cagnotte.periode_courante,
            Cotisation.statut_paiement == "paye"
        ).all()
        paid_adhesions = {c.adhesion_id for c in cotisations}

    return [
        MemberOut(
            utilisateur_id=adhesion.utilisateur_id,
            pseudonyme=utilisateur.pseudonyme,
            statut=adhesion.statut,
            coefficient_actuel=float(adhesion.coefficient_actuel),
            nb_sinistres_periode=adhesion.nb_sinistres_periode,
            date_adhesion=adhesion.date_adhesion,
            is_admin=(utilisateur.id == group.admin_id),
            has_paid_current_month=(adhesion.id in paid_adhesions),
            tranche_age=profil.tranche_age if profil else None,
            situation_pro=profil.situation_pro if profil else None,
            region=profil.region if profil else None,
            niveau_risque=profil.niveau_risque if profil else None,
            interets_assurance=profil.interets_assurance if profil else None,
        )
        for adhesion, utilisateur, profil in rows
    ]


def get_group_details(db: Session, group_id: uuid.UUID) -> Groupe:
    """
    Récupère les détails d'un groupe par son ID.
    """
    group = repository.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe spécifié n'existe pas",
        )
    return group


def get_group_join_requests(db: Session, group_id: uuid.UUID, admin_id: uuid.UUID) -> list[DemandeAdhesion]:
    """
    Récupère toutes les demandes d'adhésion d'un groupe pour l'admin de ce groupe.
    """
    group = repository.get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe spécifié n'existe pas",
        )
    if group.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul l'administrateur du groupe peut consulter la liste des demandes d'adhésion",
        )
    return repository.get_join_requests_by_group(db, group_id)

def get_user_adhesions(db: Session, user_id: uuid.UUID) -> list[Adhesion]:
    """
    Récupère toutes les adhésions actives d'un utilisateur.
    Vérifie et crée l'adhésion pour les groupes dont l'utilisateur est admin s'il ne l'a pas déjà.
    """
    # Auto-fix pour les admins (rétroactif)
    admin_groups = db.query(Groupe).filter(Groupe.admin_id == user_id).all()
    for group in admin_groups:
        existing = repository.get_adhesion_by_user_and_group(db, user_id, group.id)
        if not existing or existing.statut != "active":
            repository.create_adhesion(db, user_id, group.id)
            
    return repository.get_adhesions_by_user(db, user_id)


def get_admin_pending_requests(db: Session, admin_id: uuid.UUID) -> list[PendingRequestOut]:
    """
    Récupère toutes les demandes d'adhésion en attente pour tous les groupes
    dont l'utilisateur est administrateur.
    """
    rows = repository.get_all_pending_requests_for_admin(db, admin_id)
    result = []
    for demande, groupe, utilisateur in rows:
        result.append(PendingRequestOut(
            id=demande.id,
            utilisateur_id=demande.utilisateur_id,
            groupe_id=demande.groupe_id,
            nom_groupe=groupe.nom,
            pseudonyme_demandeur=utilisateur.pseudonyme,
            score_compatibilite=float(demande.score_compatibilite) if demande.score_compatibilite else None,
            date_demande=demande.date_demande,
        ))
    return result
