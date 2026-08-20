"""
Router FastAPI du module claims.
Contient uniquement les endpoints HTTP : validation des entrées (Pydantic),
appel au service, retour de la réponse. Aucune logique métier ici.
"""
from uuid import UUID

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, require_role, require_verified_kyc, TokenPayload
from app.core.database import get_session
from app.modules.claims import service
from app.modules.claims.schemas import *
from app.modules.claims import repository

router = APIRouter(prefix="/claims", tags=["claims"])


import os
import mimetypes
from fastapi import Form, UploadFile, File
from fastapi.responses import FileResponse
from app.modules.groups.models import Adhesion

# ── Déclaration d'un sinistre ────────────────────────────────────────────────

@router.post(
    "/",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Déclarer un nouveau sinistre (JSON)",
)
def create_claim(
    data: ClaimCreate,
    current_user: TokenPayload = Depends(require_verified_kyc),
    session: Session = Depends(get_session),
):
    """Un membre déclare un sinistre (requiert KYC vérifié). Émet l'event Kafka 'claim.created'."""
    sinistre = service.declare_sinistre(
        session, data, utilisateur_id=UUID(current_user.user_id)
    )
    return sinistre


@router.post(
    "/with-file",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Déclarer un nouveau sinistre avec pièce justificative (Multipart)",
)
async def create_claim_with_file(
    adhesion_id: UUID = Form(...),
    groupe_id: UUID = Form(...),
    description: str = Form(...),
    montant_declare: float = Form(...),
    file: UploadFile = File(None),
    current_user: TokenPayload = Depends(require_verified_kyc),
    session: Session = Depends(get_session),
):

    """
    Déclare un sinistre avec téléversement de justificatif (attestation, facture, constat).
    Exécute automatiquement l'analyseur IA de preuves et le calcul du score de fraude.
    """
    file_bytes = None
    filename = None
    content_type = None

    if file and file.filename:
        file_bytes = await file.read()
        filename = file.filename
        content_type = file.content_type

    data = ClaimCreate(
        adhesion_id=adhesion_id,
        groupe_id=groupe_id,
        description=description,
        montant_declare=montant_declare,
    )

    sinistre = service.declare_sinistre(
        session,
        data=data,
        utilisateur_id=UUID(current_user.user_id),
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
    )
    return sinistre


# ── Lecture ───────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=list[ClaimResponse],
    summary="Lister les sinistres de l'utilisateur courant",
)
def list_my_claims(
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return service.list_sinistres_utilisateur(session, UUID(current_user.user_id))


@router.get(
    "/groupe/{groupe_id}",
    response_model=list[ClaimResponse],
    summary="Lister les sinistres d'un groupe",
)
def list_claims_by_group(
    groupe_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return service.list_sinistres_groupe(session, groupe_id)


@router.get(
    "/{sinistre_id}",
    response_model=ClaimResponse,
    summary="Récupérer un sinistre par ID",
)
def get_claim(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    return sinistre


# ── Pièces justificatives & Fichiers ─────────────────────────────────────────

@router.get(
    "/{sinistre_id}/pieces",
    response_model=list[PieceJustificativeResponse],
    summary="Lister les pièces justificatives d'un sinistre",
)
def list_pieces(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return repository.list_pieces_by_sinistre(session, sinistre_id)


from fastapi.responses import FileResponse, Response
from app.core import storage

@router.get(
    "/{sinistre_id}/pieces/{piece_id}/file",
    summary="Visualiser / Télécharger le fichier d'une pièce justificative",
)
def get_piece_file(
    sinistre_id: UUID,
    piece_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Retourne le fichier brut (Image / PDF) d'une pièce justificative.
    Accessible uniquement à l'auteur du sinistre, à l'admin du groupe, ou à l'équipe conformité.
    """
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")

    adhesion = session.query(Adhesion).filter(Adhesion.id == sinistre.adhesion_id).first()
    is_owner = adhesion and str(adhesion.utilisateur_id) == current_user.user_id
    is_group_admin = current_user.role == "admin_groupe"
    is_compliance = current_user.role in ["admin_plateforme", "equipe_conformite"]

    if not (is_owner or is_group_admin or is_compliance):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette pièce justificative")

    piece = repository.get_piece_by_id(session, piece_id)
    if not piece or piece.sinistre_id != sinistre_id:
        raise HTTPException(status_code=404, detail="Pièce justificative non trouvée")

    if not piece.hdfs_url:
        raise HTTPException(status_code=404, detail="Aucun fichier associé à cette pièce justificative")

    # Récupération via MinIO / S3 ou fallback local
    file_bytes, mime_type = storage.get_file_bytes(piece.hdfs_url)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le stockage")

    filename = os.path.basename(piece.hdfs_url)
    return Response(
        content=file_bytes,
        media_type=mime_type or piece.type_fichier or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )



# ── Alertes de fraude ────────────────────────────────────────────────────────

@router.get(
    "/alertes/all",
    summary="Lister toutes les alertes de fraude (Équipe Conformité)",
)
def list_all_fraud_alerts(
    statut: Optional[str] = Query(None, description="Filtrer par statut (ouverte, traitee, escaladee)"),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from app.modules.claims.models import AlerteFraude, Sinistre
    from app.modules.groups.models import Groupe, Adhesion
    from app.modules.users_kyc.models import Utilisateur

    query = session.query(AlerteFraude)
    if statut:
        query = query.filter(AlerteFraude.statut_traitement == statut)
    
    alertes = query.order_by(AlerteFraude.created_at.desc()).all()
    result = []
    for a in alertes:
        sin = session.query(Sinistre).filter(Sinistre.id == a.sinistre_id).first()
        grp = session.query(Groupe).filter(Groupe.id == sin.groupe_id).first() if sin else None
        adh = session.query(Adhesion).filter(Adhesion.id == sin.adhesion_id).first() if sin else None
        user = session.query(Utilisateur).filter(Utilisateur.id == adh.utilisateur_id).first() if adh else None

        result.append({
            "id": str(a.id),
            "sinistre_id": str(a.sinistre_id),
            "score": float(a.score),
            "niveau_severite": a.niveau_severite,
            "explication_ia": a.explication_ia,
            "statut_traitement": a.statut_traitement,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "groupe_nom": grp.nom if grp else "Groupe Communautaire",
            "groupe_specialite": grp.specialite if grp else "Pool Mutuel",
            "montant_declare": float(sin.montant_declare) if sin else 0.0,
            "description_sinistre": sin.description if sin else "",
            "resume_ia": sin.resume_ia if sin else None,
            "membre_pseudonyme": user.pseudonyme if user else "Membre #Anonyme",
            "sinistre_statut": sin.statut if sin else "en_attente",
        })
    return result


@router.post(
    "/alertes/{alerte_id}/traiter",
    summary="Mettre à jour le statut d'une alerte de fraude (Équipe Conformité)",
)
def update_fraud_alert_status(
    alerte_id: UUID,
    statut: str = Query(..., description="Nouveau statut (ouverte, traitee, escaladee, classee)"),
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from app.modules.claims.models import AlerteFraude
    alerte = session.query(AlerteFraude).filter(AlerteFraude.id == alerte_id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    alerte.statut_traitement = statut
    session.commit()
    session.refresh(alerte)
    return {"id": str(alerte.id), "statut_traitement": alerte.statut_traitement, "message": "Statut mis à jour"}


@router.get(
    "/{sinistre_id}/alertes",
    response_model=list[AlerteFraudeResponse],
    summary="Lister les alertes de fraude d'un sinistre",
)
def list_alertes(
    sinistre_id: UUID,
    current_user: TokenPayload = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return repository.list_alertes_by_sinistre(session, sinistre_id)




# ── Validation / Rejet (admin_groupe uniquement) ────────────────────────────

@router.post(
    "/{sinistre_id}/validate",
    response_model=ClaimResponse,
    summary="Valider un sinistre (admin groupe)",
)
def validate_claim(
    sinistre_id: UUID,
    data: ClaimValidate,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """
    Admin valide le sinistre → émet 'claim.validated'.
    ⚠️ Cet event déclenche le recalcul du malus côté Personne A.
    """
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    if sinistre.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Ce sinistre a déjà été traité")

    from app.modules.groups.models import Adhesion
    adhesion = session.query(Adhesion).filter(Adhesion.id == sinistre.adhesion_id).first()
    utilisateur_id = adhesion.utilisateur_id if adhesion else UUID(current_user.user_id)

    return service.valider_sinistre(
        session, sinistre, data,
        admin_id=UUID(current_user.user_id),
        utilisateur_id=utilisateur_id,
    )


@router.post(
    "/{sinistre_id}/reject",
    response_model=ClaimResponse,
    summary="Rejeter un sinistre (admin groupe)",
)
def reject_claim(
    sinistre_id: UUID,
    data: ClaimReject,
    current_user: TokenPayload = Depends(require_role("admin_groupe")),
    session: Session = Depends(get_session),
):
    """Admin rejette le sinistre → émet 'claim.rejected'."""
    sinistre = service.get_sinistre(session, sinistre_id)
    if not sinistre:
        raise HTTPException(status_code=404, detail="Sinistre non trouvé")
    if sinistre.statut != "en_attente":
        raise HTTPException(status_code=400, detail="Ce sinistre a déjà été traité")

    from app.modules.groups.models import Adhesion
    adhesion = session.query(Adhesion).filter(Adhesion.id == sinistre.adhesion_id).first()
    utilisateur_id = adhesion.utilisateur_id if adhesion else UUID(current_user.user_id)

    return service.rejeter_sinistre(
        session, sinistre, data,
        admin_id=UUID(current_user.user_id),
        utilisateur_id=utilisateur_id,
    )
