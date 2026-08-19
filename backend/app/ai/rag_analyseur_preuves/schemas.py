"""
Schémas Pydantic pour le module rag_analyseur_preuves.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class ProofAnalysisResult(BaseModel):
    texte_extrait: str = Field(..., description="Texte brut extrait de la pièce justificative (OCR/PDF)")
    resume_ia: str = Field(..., description="Synthèse concise de l'incident et des éléments du document")
    score_fraude: float = Field(..., ge=0.0, le=1.0, description="Score de suspicion de fraude (0.00 = conforme, 1.00 = fraude)")
    is_fraud_suspected: bool = Field(default=False, description="Indique si une alerte de fraude doit être déclenchée")
    niveau_severite: str = Field(default="faible", description="Niveau de gravité : faible, moyen, eleve, critique")
    explication_ia: str = Field(..., description="Explication détaillée de la cohérence ou des anomalies détectées")
    montant_detecte: Optional[float] = Field(None, description="Montant extrait du document s'il est identifiable")
    anomalies: List[str] = Field(default_factory=list, description="Liste des anomalies ou incohérences relevées")
    confiance_ia: float = Field(default=0.90, ge=0.0, le=1.0, description="Niveau de confiance de l'analyse")
