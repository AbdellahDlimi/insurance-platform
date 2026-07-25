import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CagnotteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    groupe_id: uuid.UUID
    solde_actuel: float
    solde_buffer_pool: float
    periode_courante: str


class CotisationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    adhesion_id: uuid.UUID
    cagnotte_id: uuid.UUID
    montant_base: float
    coefficient_applique: float
    montant_final: float
    statut_paiement: str
    paye_le: datetime | None
