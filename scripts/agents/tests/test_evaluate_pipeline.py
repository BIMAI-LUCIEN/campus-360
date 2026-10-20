"""Harness tests on a tiny synthetic fixture (written to a temp dir, never committed).

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import evaluate_pipeline  # noqa: E402

LONG = " Les candidats intéressés sont invités à envoyer leur CV et lettre de motivation par email."
SYNTHETIC = [
    {"title": "Avis de recrutement : 02 STAGIAIRES RH", "description": "SANLAM ALLIANZ Cameroun recrute deux stagiaires RH à Douala." + LONG,
     "company": "SANLAM ALLIANZ Cameroun", "category": "stage", "publishable": True},
    {"title": "Une nouvelle aventure commence chez Oasis Lounge !", "description": "Une nouvelle aventure commence, merci à toute l'équipe pour l'accueil chaleureux de ce lundi.",
     "company": "Oasis Lounge", "category": "bruit", "publishable": False},
    {"title": "Concours ENIET 2024", "description": "Le concours ENIET 2024 vise à recruter 5 550 élèves-maîtres." + LONG,
     "company": "MINESEC", "category": "concours", "publishable": False},
]


class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.fixture = Path(self.dir.name) / "offers.json"
        self.fixture.write_text(json.dumps(SYNTHETIC, ensure_ascii=False), encoding="utf-8")

    def tearDown(self):
        self.dir.cleanup()

    def test_offline_counts_filter_rejections_as_noise(self):
        report = evaluate_pipeline.run(self.fixture, live=False)
        self.assertEqual(report["bruit"]["support"], 1)
        self.assertEqual(report["bruit"]["recall"], 1.0)
        # The filter rejects exams before any model call; its reason still names the category.
        self.assertEqual(report["concours"]["recall"], 1.0)
        self.assertIsNotNone(report["publishable_accuracy"])

    def test_missing_fixture_is_reported(self):
        code = evaluate_pipeline.main(["--offline", "--fixture", str(Path(self.dir.name) / "absent.json")])
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
