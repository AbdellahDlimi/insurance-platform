"""
Router FastAPI du module audit.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, TokenPayload
from app.core.database import get_session
from app.modules.audit import service
from app.modules.audit.schemas import (
    AuditLogResponse, LeveeAnonymatCreate, LeveeAnonymatResponse,
)
from app.modules.audit import repository

router = APIRouter(prefix="/audit", tags=["audit"])


# ── Journal d'audit ──────────────────────────────────────────────────────────

@router.get(
    "/logs",
    response_model=list[AuditLogResponse],
    summary="Consulter le journal d'audit",
)
def get_audit_logs(
    cible_type: Optional[str] = Query(None, description="Filtrer par type de cible"),
    cible_id: Optional[UUID] = Query(None, description="Filtrer par ID de cible"),
    limit: int = Query(50, ge=1, le=200),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return service.get_audit_logs(session, cible_type, cible_id, limit)


# ── Levée d'anonymat ────────────────────────────────────────────────────────

@router.get(
    "/levee-anonymat",
    summary="Lister toutes les demandes de levée d'anonymat (Conformité)",
)
def list_anonymity_requests(
    statut: Optional[str] = Query(None, description="Filtrer par statut (en_attente, approuvee, refusee, executee)"),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from app.modules.audit.models import DemandeLeveeAnonymat
    from app.modules.groups.models import Groupe
    from app.modules.users_kyc.models import Utilisateur
    from app.modules.claims.models import Sinistre

    query = session.query(DemandeLeveeAnonymat)
    if statut:
        query = query.filter(DemandeLeveeAnonymat.statut == statut)
    
    demandes = query.all()
    result = []
    for d in demandes:
        grp = session.query(Groupe).filter(Groupe.id == d.groupe_id).first()
        admin_req = session.query(Utilisateur).filter(Utilisateur.id == d.demande_par_admin_id).first()
        cible = session.query(Utilisateur).filter(Utilisateur.id == d.utilisateur_cible_id).first()
        sin = session.query(Sinistre).filter(Sinistre.id == d.sinistre_id).first()

        result.append({
            "id": str(d.id),
            "sinistre_id": str(d.sinistre_id),
            "utilisateur_cible_id": str(d.utilisateur_cible_id),
            "groupe_id": str(d.groupe_id),
            "nom_groupe": grp.nom if grp else "Groupe Communautaire",
            "specialite_groupe": grp.specialite if grp else "Pool Mutuel",
            "demandeur_pseudonyme": admin_req.pseudonyme if admin_req else "Admin Groupe",
            "demandeur_email": admin_req.email if admin_req else None,
            "cible_pseudonyme": cible.pseudonyme if cible else "Membre #Anonyme",
            "justification_legale": d.justification_legale,
            "statut": d.statut,
            "valide_par_agent_id": str(d.valide_par_agent_id) if d.valide_par_agent_id else None,
            "date_execution": d.date_execution.isoformat() if d.date_execution else None,
            "sinistre_montant": float(sin.montant_declare) if sin else 0.0,
            "sinistre_description": sin.description if sin else "",
            "date_soumission": d.date_execution.isoformat() if d.date_execution else "Récemment",
        })
    return result


@router.post(
    "/levee-anonymat",
    response_model=LeveeAnonymatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Demander une levée d'anonymat",
)
def request_anonymity_lift(
    data: LeveeAnonymatCreate,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """
    Un admin de groupe demande la levée d'anonymat d'un membre
    dans le cadre d'une enquête sur un sinistre.
    Émet l'event 'anonymity.lift.requested'.
    """
    return service.demander_levee_anonymat(
        session, data, admin_id=UUID(current_user.user_id)
    )


@router.post(
    "/levee-anonymat/{demande_id}/approve",
    response_model=LeveeAnonymatResponse,
    summary="Approuver une levée d'anonymat (équipe conformité)",
)
def approve_anonymity_lift(
    demande_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    L'équipe conformité approuve la demande → émet 'anonymity.lift.approved'.
    Déclenche le déchiffrement KYC côté Personne A.
    """
    if current_user.role not in ["equipe_conformite", "admin_plateforme"]:
        raise HTTPException(status_code=403, detail="Accès réservé à l'équipe conformité")

    demande = repository.get_demande_levee_by_id(session, demande_id)
    if not demande:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if demande.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")

    return service.approuver_levee_anonymat(
        session, demande, agent_id=UUID(current_user.user_id)
    )


@router.post(
    "/levee-anonymat/{demande_id}/reject",
    response_model=LeveeAnonymatResponse,
    summary="Rejeter une levée d'anonymat (équipe conformité)",
)
def reject_anonymity_lift(
    demande_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    L'équipe conformité rejette la demande avec traçabilité dans le journal d'audit.
    """
    if current_user.role not in ["equipe_conformite", "admin_plateforme"]:
        raise HTTPException(status_code=403, detail="Accès réservé à l'équipe conformité")

    demande = repository.get_demande_levee_by_id(session, demande_id)
    if not demande:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if demande.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")

    demande = repository.update_demande_levee(
        session,
        demande,
        statut="refusee",
        valide_par_agent_id=UUID(current_user.user_id),
    )

    service.log_action(
        session,
        acteur_id=UUID(current_user.user_id),
        action="rejet_levee_anonymat",
        cible_type="DemandeLeveeAnonymat",
        cible_id=demande.id,
        details={"motif": "Justification légale insuffisante ou non conforme"},
    )

    return demande

