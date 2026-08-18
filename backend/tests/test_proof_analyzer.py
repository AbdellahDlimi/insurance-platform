"""
Tests unitaires pour le moteur IA d'analyse de preuves de sinistres (rag_analyseur_preuves).
"""
import pytest
from app.ai.rag_analyseur_preuves.engine import (
    extract_text_from_file,
    _heuristic_analysis,
    analyser_preuve,
)


def test_heuristic_analysis_conforme():
    # Cas 1 : Facture et déclaration conformes (montant déclaré = 350 €, facture = 350.00 €)
    text = """
    GARAGE DU CENTRE - FACTURE N° 2026-441
    Date : 12/08/2026
    Client : Jean Dupont
    Prestation : Réparation pare-chocs avant suite à choc / accident léger.
    Total TTC : 350,00 €
    """
    res = _heuristic_analysis(
        text=text,
        description="Choc survenu sur le parking ayant endommagé le pare-chocs avant.",
        montant_declare=350.0,
        filename="facture_garage.pdf",
    )

    assert res.score_fraude < 0.20
    assert not res.is_fraud_suspected
    assert res.niveau_severite == "faible"
    assert res.montant_detecte == 350.0


def test_heuristic_analysis_incoherence_montant():
    # Cas 2 : Incohérence majeure de montant (déclaré 1200 €, facture 180 €)
    text = """
    CLINIQUE VETERINAIRE DU SUD
    Facture N° 8891
    Soins d'urgence et pansements pour fracture.
    Total à régler : 180,00 EUR
    """
    res = _heuristic_analysis(
        text=text,
        description="Frais de clinique vétérinaire pour soins urgents.",
        montant_declare=1200.0,
        filename="facture_veto.pdf",
    )

    assert res.score_fraude >= 0.50
    assert res.is_fraud_suspected
    assert len(res.anomalies) > 0
    assert any("Écart significatif de montant" in a for a in res.anomalies)


def test_extract_text_from_txt():
    content = b"Attestation de depot de plainte pour vol de velo. Montant estime du prejudice: 450 euros."
    text = extract_text_from_file(content, "plainte.txt")
    assert "vol de velo" in text
    assert "450 euros" in text


def test_analyser_preuve_end_to_end():
    content = b"Devis reparation plomberie degat des eaux. Montant total: 280.00 EUR"
    res = analyser_preuve(
        file_bytes=content,
        filename="devis_plomberie.txt",
        description="Fuite d'eau importante dans la cuisine ayant endommage le meuble sous evier.",
        montant_declare=280.0,
        date_declaration="2026-08-15",
    )
    assert res.score_fraude < 0.30
    assert "280" in res.resume_ia or "devis_plomberie" in res.resume_ia
