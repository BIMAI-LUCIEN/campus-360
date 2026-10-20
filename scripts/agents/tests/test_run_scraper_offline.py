"""Full offline dry-run: fixture items, fake model, no database, no network.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config  # noqa: E402
import run_scraper  # noqa: E402

LONG = " Les candidats intéressés sont invités à envoyer leur CV et lettre de motivation par email."
COMPANIES = ["SANLAM ALLIANZ Cameroun", "UNICEF", "CAMTEL", "ORBIT SARL", "IBABEAUTY CAMEROON", "Pharmacie Well"]
FIXTURE = [
    {"title": f"Offre de stage chez {name}", "description": f"{name} recrute des stagiaires à Douala." + LONG,
     "company": name, "url": f"https://example.org/offres/{i}", "category": "stage", "publishable": True}
    for i, name in enumerate(COMPANIES)
]


class OfflineRunTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.fixture = Path(self.dir.name) / "offers.json"
        self.fixture.write_text(json.dumps(FIXTURE, ensure_ascii=False), encoding="utf-8")

    def tearDown(self):
        self.dir.cleanup()

    def test_offline_run_hits_the_cap_without_db_or_network(self):
        out = io.StringIO()
        with mock.patch("job_store.psycopg2.connect") as connect, \
                mock.patch("requests.post") as post, \
                mock.patch("requests.Session.request") as session_request, \
                mock.patch.object(config, "DAILY_OFFER_CAP", 2), \
                contextlib.redirect_stdout(out):
            code = run_scraper.main(["--dry-run", "--no-db", "--from-fixture", str(self.fixture), "--offline-llm"])
        text = out.getvalue()
        self.assertEqual(code, 0)
        connect.assert_not_called()
        post.assert_not_called()
        session_request.assert_not_called()
        self.assertIn("cap_reached: True", text)
        self.assertIn("added_today: 2", text)
        self.assertIn("collected: 6", text)
        self.assertIn("Dry-run : aucune écriture en base.", text)

    def test_no_db_requires_dry_run(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(run_scraper.main(["--no-db"]), 2)

    def test_live_refused_in_dry_run(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(run_scraper.main(["--dry-run", "--live"]), 2)


if __name__ == "__main__":
    unittest.main()
