"""Classifier + extractor tests (real model calls). Run: python scripts/agents/tests/test_llm_agents.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from classifier_agent import classify_post  # noqa: E402
from extractor_agent import extract_fields, quote_in_source  # noqa: E402

CLASSIFY_CASES = [
    ("Concours ENIET 2024", "Le concours ENIET vise à recruter 5 550 élèves-maîtres pour les Écoles Normales.", {"concours"}),
    ("Une nouvelle aventure commence chez Oasis Lounge !", "Merci à toute l'équipe pour ce premier jour, je suis ravi de rejoindre Oasis Lounge.", {"bruit"}),
    ("Formation en Usinage", "Formation en usinage avec immersion en entreprise. Inscription : 150 000 FCFA.", {"formation"}),
    ("Avis de recrutement : 02 stagiaires RH", "SANLAM ALLIANZ Cameroun recrute deux stagiaires professionnels RH à Douala. CV à rh@sanlam.cm.", {"stage"}),
    ("DEPUTY PROJECT MANAGER at INTERSOS", "INTERSOS recrute un Deputy Project Manager basé à Maroua, CDD 12 mois. Postuler sur intersos.org.", {"emploi"}),
]

EXTRACT_TEXT = (
    "HYST Consulting recrute un(e) Consultant(e) Junior en Contrôle Interne pour un stage pré-emploi "
    "de 6 mois à Douala. Profil : Bac+3 en audit, maîtrise d'Excel. "
    "Envoyez CV et lettre à recrutement@hyst-consulting.com avant le 31 octobre 2026."
)


def main() -> int:
    failures = 0
    for title, text, expected in CLASSIFY_CASES:
        result = classify_post(title, text)
        ok = result["category"] in expected
        failures += 0 if ok else 1
        print(f"{'OK  ' if ok else 'FAIL'} classify {title[:40]!r} -> {result['category']} ({result['confidence']:.2f})")

    extracted = extract_fields("Stage Pré-Emploi Consultant Junior", EXTRACT_TEXT)
    fields, evidence = extracted["fields"], extracted["evidence"]
    print("fields:", fields)
    source = "Stage Pré-Emploi Consultant Junior\n" + EXTRACT_TEXT
    for field, quote in evidence.items():
        if not quote_in_source(quote, source):
            failures += 1
            print(f"FAIL evidence for {field} not in source")
    for field, value in fields.items():
        if field in ("skills", "summary"):
            continue
        if value and field not in evidence:
            failures += 1
            print(f"FAIL {field} has a value without evidence")
    if fields.get("stipend") is not None:
        failures += 1
        print("FAIL stipend invented")
    if (fields.get("contact_email") or "").lower() != "recrutement@hyst-consulting.com":
        failures += 1
        print("FAIL contact_email not extracted")
    print("PASS" if not failures else f"{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
