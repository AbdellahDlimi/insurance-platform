import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class GroupCreate(BaseModel):
    nom: str
    specialite: str
    capacite_max: int | None = None
    cotisation_de_base: float
    buffer_pool_cible: float | None = None
    reglement_pdf_url: str | None = None


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    specialite: str
    est_ouvert: bool
    capacite_max: int | None
    admin_id: uuid.UUID
    cotisation_de_base: float
    buffer_pool_cible: float | None
    reglement_pdf_url: str | None
    admin_pseudonyme: Optional[str] = None
    admin_email: Optional[str] = None



class JoinRequestCreate(BaseModel):
    pass


class JoinRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utilisateur_id: uuid.UUID
    groupe_id: uuid.UUID
    score_compatibilite: float | None
    statut: str
    date_demande: datetime
    # Champs enrichis (non présents dans le modèle ORM, peuplés manuellement)
    pseudonyme_demandeur: Optional[str] = None


class PendingRequestOut(BaseModel):
    """Résumé d'une demande en attente pour le tableau de bord admin."""
    id: uuid.UUID
    utilisateur_id: uuid.UUID
    groupe_id: uuid.UUID
    nom_groupe: str
    pseudonyme_demandeur: str
    score_compatibilite: Optional[float] = None
    date_demande: datetime


class AdhesionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utilisateur_id: uuid.UUID
    groupe_id: uuid.UUID
    statut: str
    coefficient_actuel: float
    nb_sinistres_periode: int
    date_adhesion: datetime


class MemberOut(BaseModel):
    """Adhésion enrichie avec les infos publiques du membre."""
    utilisateur_id: uuid.UUID
    pseudonyme: str
    statut: str
    coefficient_actuel: float
    nb_sinistres_periode: int
    date_adhesion: datetime
    is_admin: bool = False
    has_paid_current_month: bool = False
    tranche_age: Optional[str] = None
    situation_pro: Optional[str] = None
    region: Optional[str] = None
    niveau_risque: Optional[str] = None
    interets_assurance: Optional[list[str]] = None


class AdhesionValidate(BaseModel):
    statut: str = Field(description="acceptee ou refusee")
