import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class UserCreate(BaseModel):
    """Ce que le client envoie pour s'inscrire."""
    email: EmailStr
    mot_de_passe: str  # en clair ici, sera hashé dans service.py avant stockage
    pseudonyme: str


class UserLogin(BaseModel):
    """Ce que le client envoie pour se connecter."""
    email: EmailStr
    mot_de_passe: str


class UserUpdate(BaseModel):
    """Champs modifiables par l'utilisateur lui-même."""
    pseudonyme: str | None = None


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
    onboarding_complete: bool
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
    type_document: str  # ex: "passeport" | "cni"

class KYCReviewSubmit(BaseModel):
    statut: str  # verified / failed
    commentaire: str | None = None

class KYCDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    utilisateur_id: uuid.UUID
    statut_verification: str
    document_url: str | None = None
    commentaire_review: str | None = None
    verifie_le: datetime | None = None
    pseudonyme: str | None = None


class KYCStatusOut(BaseModel):
    """Statut actuel de la vérification KYC."""
    model_config = ConfigDict(from_attributes=True)

    statut_verification: str  # pending / verified / failed / manual_review
    fournisseur_api: str | None = None
    verifie_le: datetime | None = None


class OnboardingSubmit(BaseModel):
    tranche_age: str       # enum validé côté frontend
    situation_pro: str
    interets_assurance: list[str]
    budget_max_mensuel: float
    niveau_risque: str
    region: str | None = None
    situation_familiale: str | None = None
    nombre_personnes_a_charge: int | None = None
    couverture_existante: list[str] | None = None
    priorite_assurance: str | None = None

class OnboardingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tranche_age: str
    situation_pro: str
    interets_assurance: list[str]
    budget_max_mensuel: float
    niveau_risque: str
    region: str | None
    situation_familiale: str | None
    nombre_personnes_a_charge: int | None
    couverture_existante: list[str] | None
    priorite_assurance: str | None
    onboarding_complete: bool = True
