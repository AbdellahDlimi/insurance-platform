import uuid
from datetime import datetime
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


class AdhesionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    utilisateur_id: uuid.UUID
    groupe_id: uuid.UUID
    statut: str
    coefficient_actuel: float
    nb_sinistres_periode: int
    date_adhesion: datetime


class AdhesionValidate(BaseModel):
    statut: str = Field(description="acceptee ou refusee")
