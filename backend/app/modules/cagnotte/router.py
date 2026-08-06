import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, TokenPayload
from app.core.database import get_session
from app.modules.cagnotte import service, repository
from app.modules.cagnotte.schemas import CagnotteOut, CotisationOut
from app.modules.cagnotte.models import Cotisation
from app.modules.groups.models import Adhesion, Groupe

router = APIRouter(tags=["cagnotte"])


@router.get("/groups/{id}/cagnotte", response_model=CagnotteOut)
def get_group_cagnotte(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Consulter le solde de la cagnotte et du buffer pool d'un groupe.
    """
    cagnotte = repository.get_cagnotte_by_group_id(db, id)
    if not cagnotte:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cagnotte introuvable pour ce groupe.",
        )
        
    cotisation_appelee = db.query(Cotisation).filter(
        Cotisation.cagnotte_id == cagnotte.id,
        Cotisation.periode == cagnotte.periode_courante
    ).first() is not None
    
    return {
        "id": cagnotte.id,
        "groupe_id": cagnotte.groupe_id,
        "solde_actuel": cagnotte.solde_actuel,
        "solde_buffer_pool": cagnotte.solde_buffer_pool,
        "periode_courante": cagnotte.periode_courante,
        "cotisation_appelee": cotisation_appelee
    }


@router.get("/members/{id}/cotisation", response_model=list[CotisationOut])
def get_member_cotisation(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Consulter les cotisations associées à un membre (par son Adhesion ID ou son User ID).
    """
    # 1. Tenter par Adhesion ID
    cotisations = db.query(Cotisation).filter(Cotisation.adhesion_id == id).all()
    if not cotisations:
        # 2. Tenter par User ID (rechercher les adhésions du membre)
        adhesions = db.query(Adhesion).filter(Adhesion.utilisateur_id == id).all()
        adhesion_ids = [a.id for a in adhesions]
        if adhesion_ids:
            cotisations = db.query(Cotisation).filter(Cotisation.adhesion_id.in_(adhesion_ids)).all()
            
    return cotisations


@router.post("/cotisations/{id}/pay", response_model=CotisationOut)
def pay_cotisation(
    id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à un membre de régler sa cotisation en attente.
    Crédite automatiquement la cagnotte du groupe concerné.
    """
    return service.payer_cotisation(db, id, uuid.UUID(current_user.user_id))


@router.post("/admin/cagnotte/recalculate")
def trigger_recalculate(
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Déclencher manuellement le recalcul des cotisations de fin de période (Bonus / Malus et clôture).
    Accessible uniquement aux administrateurs de groupe ou à l'équipe de conformité.
    """
    if current_user.role not in ["admin_groupe", "equipe_conformite"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs ou à l'équipe de conformité.",
        )
    return service.recalculer_fin_de_periode(db)

from pydantic import BaseModel
class AppelCotisationInput(BaseModel):
    montant: float

@router.post("/groups/{id}/appel-cotisation")
def appel_cotisation(
    id: uuid.UUID,
    data: AppelCotisationInput,
    current_user: TokenPayload = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Permet à l'admin du groupe de déclencher un appel de cotisation pour tous les membres actifs.
    """
    group = db.query(Groupe).filter(Groupe.id == id).first()
    if not group or group.admin_id != uuid.UUID(current_user.user_id):
        raise HTTPException(status_code=403, detail="Non autorisé. Vous devez être l'admin du groupe.")
        
    cagnotte = repository.get_cagnotte_by_group_id(db, id)
    if not cagnotte:
        raise HTTPException(status_code=404, detail="Cagnotte introuvable")

    already_called = db.query(Cotisation).filter(
        Cotisation.cagnotte_id == cagnotte.id,
        Cotisation.periode == cagnotte.periode_courante
    ).first() is not None
    
    if already_called:
        raise HTTPException(status_code=400, detail="Une cotisation a déjà été appelée pour le mois en cours.")

    adhesions = db.query(Adhesion).filter(Adhesion.groupe_id == id, Adhesion.statut == "active").all()
    count = 0
    for adhesion in adhesions:
        repository.create_cotisation(
            db=db,
            adhesion_id=adhesion.id,
            cagnotte_id=cagnotte.id,
            montant_base=data.montant,
            coefficient_applique=float(adhesion.coefficient_actuel),
            montant_final=data.montant * float(adhesion.coefficient_actuel),
            periode=cagnotte.periode_courante,
            statut_paiement="en_attente"
        )
        count += 1
        
    db.commit()
    return {"message": f"Appel de cotisation de {data.montant}€ envoyé à {count} membres."}

