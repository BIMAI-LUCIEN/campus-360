"""Field-check agent (agent 5) tests: fake search and fake link fetch, no network.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from company_check_agent import (  # noqa: E402
    CompanyCheckAgent, company_presence, normalize_whatsapp, presence_score,
)
from offer_pipeline import process  # noqa: E402

NOW = datetime(2026, 10, 26, tzinfo=timezone.utc)

# Real answer shape of anyapi.google.serp.organic (call of 2026-10-26, trimmed).
SANLAM_RESULTS = [
    {"link": "https://cm.sanlamallianz.com/", "title": "SanlamAllianz Cameroun", "snippet": "Assurance Individuelle Accidents."},
    {"link": "https://dgtcfm.cm/sanlam-allianz-cameroun-assurances-vie", "title": "SANLAM ALLIANZ CAMEROUN ASSURANCES VIE", "snippet": "Douala."},
    {"link": "https://louma-jobs.com/cameroun/entreprises/emploi/sanlam", "title": "SANLAM Allianz Recrutement", "snippet": "Offre d'emploi"},
    {"link": "https://www.facebook.com/sanlamallianzcameroun/", "title": "SanlamAllianz Cameroun | Douala", "snippet": "8264 abonnés"},
    {"link": "https://www.linkedin.com/company/sanlam-allianz-cameroun", "title": "Sanlam Allianz Cameroun | LinkedIn", "snippet": ""},
]


class Response:
    def __init__(self, status_code=200, text="", payload=None):
        self.status_code, self.text, self._payload = status_code, text, payload

    def json(self):
        return self._payload


def search_answer(results):
    return lambda *args, **kwargs: Response(payload={"output": {"data": {"results": results}}})


def agent(results=SANLAM_RESULTS, page=Response(text="<html>Postuler</html>"), known=None):
    calls = []

    def post(*args, **kwargs):
        calls.append(kwargs["json"]["query"])
        return search_answer(results)()

    checker = CompanyCheckAgent(live=True, api_key="test", cli_path="", max_calls=5, post=post,
                                fetch=lambda *a, **k: page, known_company=known)
    checker.search_calls = calls
    return checker


def offer(**fields):
    base = {"title": "Stagiaire RH", "company": "SANLAM ALLIANZ Cameroun", "city": "Douala", "deadline": None,
            "contact_email": "rh@sanlamallianz.com", "contact_whatsapp": None, "apply_url": "https://cm.sanlamallianz.com/jobs/1"}
    base.update(fields)
    return {"fields": base, "evidence": {}}


PUBLISHED = {"status": "published", "kind": "stage", "confidence": 0.9, "reason": "ok"}
ITEM = {"platform": "WEB", "location": "Douala, Cameroun", "published_at": "2026-10-20T08:00:00+00:00"}


class PresenceTests(unittest.TestCase):
    def test_reads_site_facebook_linkedin_and_ignores_job_boards(self):
        presence = company_presence("SANLAM ALLIANZ Cameroun", SANLAM_RESULTS)
        self.assertEqual(presence["website"], "https://cm.sanlamallianz.com/")
        self.assertIn("facebook.com/sanlamallianzcameroun", presence["facebook"])
        self.assertIn("linkedin.com/company/", presence["linkedin"])
        self.assertEqual(presence_score(presence, email_matches_site=True), 100)

    def test_unknown_company_has_no_presence(self):
        presence = company_presence("ORBIT DIGITAL SARL", SANLAM_RESULTS)
        self.assertEqual(presence, {"website": None, "facebook": None, "linkedin": None, "mentions": 0})

    def test_whatsapp_numbers(self):
        self.assertEqual(normalize_whatsapp("+237 6 77 12 34 56"), "237677123456")
        self.assertEqual(normalize_whatsapp("677123456"), "237677123456")
        self.assertIsNone(normalize_whatsapp("+225 07 12 34 56"))


class ReviewTests(unittest.TestCase):
    def test_real_company_open_offer_stays_published(self):
        decision = agent().review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(decision["status"], "published")
        self.assertEqual(decision["company_check"]["kyb_score"], 100)

    def test_company_not_found_goes_to_review(self):
        decision = agent(results=[]).review(PUBLISHED, ITEM, offer(company="Fantome Services"), NOW)
        self.assertEqual(decision["status"], "pending_review")
        self.assertIn("introuvable en ligne", decision["reason"])

    def test_closed_offer_is_rejected(self):
        page = Response(text="<p>No longer accepting applications</p>")
        decision = agent(page=page).review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(decision["status"], "rejected")

    def test_dead_link_is_rejected(self):
        decision = agent(page=Response(status_code=404)).review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(decision["status"], "rejected")

    def test_login_wall_proves_nothing(self):
        decision = agent(page=Response(status_code=999)).review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(decision["status"], "published")

    def test_unusable_contact_goes_to_review(self):
        fields = offer(contact_email="pas-un-email", apply_url=None)
        decision = agent().review(PUBLISHED, ITEM, fields, NOW)
        self.assertEqual(decision["status"], "pending_review")
        self.assertIn("aucun contact utilisable", decision["reason"])

    def test_place_outside_cameroon_goes_to_review(self):
        decision = agent().review(PUBLISHED, {**ITEM, "location": "Abidjan"}, offer(city="Abidjan"), NOW)
        self.assertEqual(decision["status"], "pending_review")
        self.assertIn("lieu non confirmé", decision["reason"])

    def test_old_posting_goes_to_review(self):
        old = {**ITEM, "published_at": "2026-08-01T00:00:00Z"}
        decision = agent().review(PUBLISHED, old, offer(), NOW)
        self.assertEqual(decision["status"], "pending_review")
        self.assertIn("jours", decision["reason"])

    def test_search_unavailable_never_publishes(self):
        checker = CompanyCheckAgent(live=True, api_key="", cli_path="", fetch=lambda *a, **k: Response(text="ok"))
        decision = checker.review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(decision["status"], "pending_review")
        self.assertIn("recherche indisponible", decision["reason"])

    def test_not_live_changes_nothing(self):
        checker = CompanyCheckAgent(live=False, api_key="test", cli_path="")
        self.assertIs(checker.review(PUBLISHED, ITEM, offer(), NOW), PUBLISHED)

    def test_one_search_per_company_per_run_and_known_verified_skipped(self):
        checker = agent()
        checker.review(PUBLISHED, ITEM, offer(), NOW)
        checker.review(PUBLISHED, ITEM, offer(title="Stagiaire Finance"), NOW)
        self.assertEqual(len(checker.search_calls), 1)
        known = agent(known=lambda name: {"status": "VERIFIED", "kyb_score": 80})
        decision = known.review(PUBLISHED, ITEM, offer(), NOW)
        self.assertEqual(known.search_calls, [])
        self.assertEqual(decision["status"], "published")

    def test_quota_stops_searches(self):
        checker = CompanyCheckAgent(live=True, api_key="test", cli_path="", post=lambda *a, **k: Response(status_code=429),
                                    fetch=lambda *a, **k: Response(text="ok"))
        checker.review(PUBLISHED, ITEM, offer(), NOW)
        self.assertTrue(checker.exhausted)
        self.assertIsNone(checker.search("x"))


class FakeStore:
    def __init__(self):
        self.saved, self.rejected = [], []

    def save_offer(self, item, extraction, decision):
        self.saved.append(decision)
        return "job-1"

    def log_rejection(self, stage, reason, item):
        self.rejected.append((stage, reason))


class PipelineWiringTests(unittest.TestCase):
    STRUCTURED = {"platform": "LINKEDIN", "kind_hint": "stage", "title": "Stagiaire Ressources Humaines",
                  "company": "SANLAM ALLIANZ Cameroun", "location": "Douala, Littoral, Cameroon",
                  "url": "https://www.linkedin.com/jobs/view/123", "published_at": "2026-10-24T00:00:00Z",
                  "snippet": "Stagiaire Ressources Humaines — SANLAM ALLIANZ Cameroun — Douala. Offre LinkedIn (stage). "
                             "Postuler : https://www.linkedin.com/jobs/view/123"}

    def test_closed_offer_never_reaches_stage_jobs(self):
        store = FakeStore()
        checker = agent(page=Response(text="No longer accepting applications"))
        result = process(dict(self.STRUCTURED), store, [], checker=checker)
        self.assertEqual(result["status"], "rejected")
        self.assertEqual(result["stage"], "company_check")
        self.assertEqual(store.saved, [])
        self.assertEqual(store.rejected[0][0], "company_check")

    def test_checked_offer_is_saved_with_its_evidence(self):
        store = FakeStore()
        result = process(dict(self.STRUCTURED), store, [], checker=agent())
        self.assertEqual(store.saved[0]["company_check"]["linkedin"], SANLAM_RESULTS[4]["link"])
        self.assertIn(result["status"], ("published", "pending_review"))


if __name__ == "__main__":
    unittest.main()
