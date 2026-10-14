"""Verifier agent tests. Run: python scripts/agents/tests/test_verifier.py"""

import sys
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


CHECKS = [
    ("doublon HYST", is_duplicate("HYST", "OFFRE DE STAGE PRÉ-EMPLOI Consultant(e) Junior en Contrôle Interne (6 MOIS) at HYST", EXISTING), True),
    ("doublon KEISIS", is_duplicate("KEISIS INC CANADA", "Jobs Opportunities : 07 SALES AGENTS at KEISIS INC CANADA", EXISTING), True),
    ("doublon SANLAM", is_duplicate("SANLAM ALLIANZ Cameroun Assurances vie", "Avis de recrutement : 02 STAGIAIRES PROFESSIONNELS RH at SANLAM ALLIANZ Cameroun Assurances vie", EXISTING), True),
    ("pas doublon autre poste", is_duplicate("HYST Consulting", "Stage Assistant Marketing Digital", EXISTING), False),
]

DECISIONS = [
    ("stage clair -> publié", decide({"category": "stage", "confidence": 0.95}, fields(), EXISTING, TODAY)["status"], "published"),
    ("emploi clair -> publié emploi", decide({"category": "emploi", "confidence": 0.9}, fields(), EXISTING, TODAY)["kind"], "emploi"),
    ("concours -> rejeté", decide({"category": "concours", "confidence": 0.9}, fields(), EXISTING, TODAY)["status"], "rejected"),
    ("entreprise générique -> rejeté", decide({"category": "stage", "confidence": 0.9}, fields(company="Entreprise partenaire"), EXISTING, TODAY)["status"], "rejected"),
    ("date passée -> rejeté", decide({"category": "stage", "confidence": 0.9}, fields(deadline="2026-09-01"), EXISTING, TODAY)["status"], "rejected"),
    ("sans contact -> à valider", decide({"category": "stage", "confidence": 0.9}, fields(contact_email=None), EXISTING, TODAY)["status"], "pending_review"),
    ("confiance moyenne -> à valider", decide({"category": "stage", "confidence": 0.65}, fields(), EXISTING, TODAY)["status"], "pending_review"),
]


def main() -> int:
    failures = 0
    for name, got, expected in CHECKS + DECISIONS:
        ok = got == expected
        failures += 0 if ok else 1
        print(f"{'OK  ' if ok else 'FAIL'} {name}: {got}")
    print(f"{len(CHECKS) + len(DECISIONS) - failures}/{len(CHECKS) + len(DECISIONS)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
