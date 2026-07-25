import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class UserCreate(BaseModel):
    """Ce que le client envoie pour s'inscrire."""
    email: EmailStr
    mot_de_passe: str  # en clair ici, sera hashé dans service.py avant stockage


class UserLogin(BaseModel):
    """Ce que le client envoie pour se connecter."""
    email: EmailStr
    mot_de_passe: str


class UserOut(BaseModel):
    """
    Ce que l'API renvoie au client.
    Ne contient JAMAIS mot_de_passe_hash.
    """
    model_config = ConfigDict(from_attributes=True)  # permet .from_orm()

    id: uuid.UUID
    pseudonyme: str
    email: EmailStr
    role: str
    statut_compte: str
    created_at: datetime


class TokenResponse(BaseModel):
    """Réponse renvoyée après un login réussi."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class KYCSubmit(BaseModel):
    """Données KYC à soumettre et à chiffrer."""
    nom_complet: str
    date_naissance: str  # Format AAAA-MM-JJ
    numero_document: str
    type_document: str  # ex: "passeport" | "cni"
    fournisseur_api: str = "Veriff"


class KYCStatusOut(BaseModel):
    """Statut actuel de la vérification KYC."""
    model_config = ConfigDict(from_attributes=True)

    statut_verification: str  # pending / verified / failed / manual_review
    fournisseur_api: str | None = None
    verifie_le: datetime | None = None

