"""Filter agent tests on real-world style posts. Run: python scripts/agents/tests/test_filter.py"""

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from filter_agent import filter_post  # noqa: E402

TODAY = date(2026, 10, 14)
LONG = " Les candidats intéressés sont invités à envoyer leur CV et lettre de motivation par email."

CASES = [
    # (title, text, company, expected_ok)
    ("Concours ENIET 2024 : Recrutement de 5 550 Élèves - maîtres", "Le concours ENIET 2024 vise à recruter 5 550 élèves-maîtres." + LONG, "MINESEC", False),
    ("Une nouvelle aventure commence chez Oasis Lounge !", "Une nouvelle aventure commence, merci à toute l'équipe pour l'accueil chaleureux de ce lundi." , "Oasis Lounge", False),
    ("Formation en Usinage avec immersion en entreprise", "Formation en usinage avec immersion en entreprise, frais de formation 150 000 FCFA." + LONG, "Centre", False),
    ("Je cherche un stage en comptabilité", "Bonjour, je cherche un stage en comptabilité à Douala, merci de me contacter." + LONG, None, False),
    ("Officiellement stagiaire chez Orange", "Je suis officiellement stagiaire chez Orange Cameroun depuis ce matin, très content." + LONG, None, False),
    ("Stage à Abidjan", "Offre de stage marketing basée à Abidjan, Côte d'Ivoire, durée 6 mois." + LONG, "Société X", False),
    ("Offre de stage 2023", "Offre de stage valable pour la session 2023 uniquement, dépôt avant décembre 2023." + LONG, "ABC SARL", False),
    ("Stage", "court", "ABC", False),
    ("Stage informatique", "Nous recrutons un stagiaire en informatique pour une durée de trois mois dans nos bureaux du centre-ville.", None, False),
    ("Avis de recrutement : 02 STAGIAIRES PROFESSIONNELS en RH", "SANLAM ALLIANZ Cameroun recrute deux stagiaires professionnels RH à Douala." + LONG, "SANLAM ALLIANZ Cameroun", True),
    ("UNICEF Internship Opportunity in Cameroon", "UNICEF recrute 12 stagiaires en changement social dans plusieurs villes du Cameroun." + LONG, "UNICEF", True),
    ("Offre de stage chez CAMTEL", "CAMTEL propose 115 postes de stages pour les étudiants et jeunes diplômés en 2026." + LONG, "CAMTEL", True),
    ("DEPUTY PROJECT MANAGER at INTERSOS", "INTERSOS recrute un Deputy Project Manager basé à Maroua, contrat de 12 mois." + LONG, "INTERSOS", True),
    ("Stage Pré-Emploi Consultant Junior Contrôle Interne (6 Mois)", "HYST Consulting recrute un consultant junior en contrôle interne pour un stage de 6 mois à Douala." + LONG, "HYST Consulting", True),
    ("Recrutement d'un stagiaire en cuisine", "SOLUTIONS RH+ recrute un stagiaire professionnel en cuisine à Douala. Contact WhatsApp +237 6 99 99 99 99.", None, True),
    ("Stage communication", "La fondation recrute un stagiaire en communication à Yaoundé, postuler via https://fondation.org/jobs avant le 30 novembre 2026.", None, True),
    ("Offre de stage at ORBIT SARL", "ORBIT SARL propose une offre de stage académique et professionnel à Douala, Cameroun." + LONG, "ORBIT SARL", True),
    ("Stage pharmacie", "Pharmacie Well à Yaoundé recherche un stagiaire chef de projet pour 2025-2026." + LONG, "Pharmacie Well", True),
    ("Caissier régional PASSR", "Le projet PASSR recrute un caissier régional à Garoua, dossier à déposer avant le 20 octobre 2026." + LONG, "PASSR", True),
    ("Stage logistique", "IBABEAUTY CAMEROON recrute des stagiaires en logistique pour son centre de distribution à Douala." + LONG, "IBABEAUTY CAMEROON", True),
]


def main() -> int:
    failures = 0
    for title, text, company, expected in CASES:
        ok, reason = filter_post(title, text, company, today=TODAY)
        if ok != expected:
            failures += 1
            print(f"FAIL {title!r}: got {ok} ({reason}), expected {expected}")
    print(f"{len(CASES) - failures}/{len(CASES)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
