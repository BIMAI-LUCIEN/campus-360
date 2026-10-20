"""Verifier agent tests.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from verifier_agent import decide, is_duplicate  # noqa: E402

TODAY = date(2026, 10, 14)
EXISTING = [
    {"company": "HYST Consulting", "title": "Stage Pré-Emploi Consultant(e) Junior en Contrôle Interne & Audit (6 Mois)"},
    {"company": "KEISIS INC", "title": "Jobs Opportunities : 07 SALES AGENTS at KEISIS INC CANADA"},
    {"company": "SANLAM ALLIANZ Cameroun Assurances vie", "title": "Avis de Recrutement : 02 STAGIAIRES PROFESSIONNELS en Ressources Humaines (RH)"},
]


def fields(**kwargs):
    base = {"title": "Stage", "company": "ORBIT SARL", "city": "Douala", "deadline": None,
            "contact_email": "rh@orbit.cm", "contact_whatsapp": None, "apply_url": None}
    base.update(kwargs)
    return {"fields": base}


# (name, company, title, expected_duplicate)
CHECKS = [
    ("doublon HYST", "HYST", "OFFRE DE STAGE PRÉ-EMPLOI Consultant(e) Junior en Contrôle Interne (6 MOIS) at HYST", True),
    ("doublon KEISIS", "KEISIS INC CANADA", "Jobs Opportunities : 07 SALES AGENTS at KEISIS INC CANADA", True),
    ("doublon SANLAM", "SANLAM ALLIANZ Cameroun Assurances vie", "Avis de recrutement : 02 STAGIAIRES PROFESSIONNELS RH at SANLAM ALLIANZ Cameroun Assurances vie", True),
    ("pas doublon autre poste", "HYST Consulting", "Stage Assistant Marketing Digital", False),
]

# (name, classification, extraction, key, expected)
DECISIONS = [
    ("stage clair -> publié", {"category": "stage", "confidence": 0.95}, fields(), "status", "published"),
    ("emploi clair -> publié emploi", {"category": "emploi", "confidence": 0.9}, fields(), "kind", "emploi"),
    ("concours -> rejeté", {"category": "concours", "confidence": 0.9}, fields(), "status", "rejected"),
    ("entreprise générique -> rejeté", {"category": "stage", "confidence": 0.9}, fields(company="Entreprise partenaire"), "status", "rejected"),
    ("date passée -> rejeté", {"category": "stage", "confidence": 0.9}, fields(deadline="2026-09-01"), "status", "rejected"),
    ("sans contact -> à valider", {"category": "stage", "confidence": 0.9}, fields(contact_email=None), "status", "pending_review"),
    ("confiance moyenne -> à valider", {"category": "stage", "confidence": 0.65}, fields(), "status", "pending_review"),
]


class VerifierTests(unittest.TestCase):
    def test_duplicates_table(self):
        for name, company, title, expected in CHECKS:
            with self.subTest(name=name):
                self.assertEqual(is_duplicate(company, title, EXISTING), expected)

    def test_decisions_table(self):
        # Always pass today: decide() falls back to the machine date otherwise.
        for name, classification, extraction, key, expected in DECISIONS:
            with self.subTest(name=name):
                self.assertEqual(decide(classification, extraction, EXISTING, TODAY)[key], expected)


if __name__ == "__main__":
    unittest.main()
