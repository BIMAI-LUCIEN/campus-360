"""Automatic reviewer (agent 6) tests: fake model, fake store, no network, no database.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import auto_review_agent  # noqa: E402
from auto_review_agent import UNKNOWN_COMPANY, review_offer, review_pending  # noqa: E402
from llm_client import LLMUnavailable  # noqa: E402

NOW = datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)
OFFER = {
    "id": "job-1", "title": "Operations Trainee", "kind": "stage", "company": "DHL Global Forwarding",
    "location": "Douala", "apply_method": "LINK", "source_url": "https://www.linkedin.com/jobs/view/1",
    "source_published_at": NOW - timedelta(days=10), "expires_at": NOW + timedelta(days=20),
    "review_reason": "présence en ligne faible, vérifier l'entreprise",
    "description": "DHL Global Forwarding recrute un Operations Trainee à Douala pour six mois.",
}


def model(decision="publish", reason="offre cohérente", company=""):
    motive = "aucun" if decision == "publish" else "hors_cameroun"
    return mock.patch.object(auto_review_agent, "call_json",
                             return_value={"motive": motive, "reason": reason, "company": company})


class FakeStore:
    def __init__(self, offers):
        self.offers, self.settled = offers, []

    def pending_offers(self, limit):
        return self.offers[:limit]

    def settle_review(self, job_id, status, reason, reviewer, company=None):
        self.settled.append((job_id, status, reviewer, company))
        return True


class AutoReviewTests(unittest.TestCase):
    def test_reliable_offer_is_published_despite_weak_online_presence(self):
        with model("publish") as call:
            result = review_offer(dict(OFFER), NOW)
        self.assertEqual(result["status"], "published")
        prompt = call.call_args.args[1]
        self.assertIn("présence en ligne faible", prompt)
        self.assertIn("2026-11-01", prompt)

    def test_model_rejection_is_kept(self):
        with model("reject", "poste situé au Brésil"):
            result = review_offer(dict(OFFER), NOW)
        self.assertEqual((result["status"], result["reason"]), ("rejected", "poste situé au Brésil"))

    def test_old_posting_rejected_without_model_call(self):
        offer = dict(OFFER, source_published_at=NOW - timedelta(days=94))
        with model("publish") as call:
            result = review_offer(offer, NOW)
        self.assertEqual(result["status"], "rejected")
        self.assertIn("94 jours", result["reason"])
        call.assert_not_called()

    def test_passed_deadline_rejected_without_model_call(self):
        offer = dict(OFFER, expires_at=NOW - timedelta(days=2))
        with model("publish") as call:
            self.assertEqual(review_offer(offer, NOW)["status"], "rejected")
        call.assert_not_called()

    def test_unknown_motive_leaves_offer_pending(self):
        with mock.patch.object(auto_review_agent, "call_json", return_value={"motive": "peut-etre", "reason": "", "company": ""}):
            self.assertEqual(review_offer(dict(OFFER), NOW)["status"], "pending_review")

    def test_model_down_leaves_offer_pending(self):
        with mock.patch.object(auto_review_agent, "call_json", side_effect=LLMUnavailable("down")):
            self.assertEqual(review_offer(dict(OFFER), NOW)["status"], "pending_review")

    def test_unknown_company_identified_from_the_text(self):
        offer = dict(OFFER, company=UNKNOWN_COMPANY,
                     description="ADVANS Cameroun recrute des stagiaires professionnels. Envoyez votre CV.")
        with model("publish", company="ADVANS Cameroun"):
            result = review_offer(offer, NOW)
        self.assertEqual((result["status"], result["company"]), ("published", "ADVANS Cameroun"))

    def test_unknown_company_invented_by_model_is_rejected(self):
        offer = dict(OFFER, company=UNKNOWN_COMPANY, description="Avis de recrutement de stagiaires. Envoyez votre CV.")
        with model("publish", company="Orange Cameroun"):
            result = review_offer(offer, NOW)
        self.assertEqual(result["status"], "rejected")

    def test_aggregator_name_replaced_by_real_recruiter(self):
        offer = dict(OFFER, company="ReliefWeb", description="The International Organization for Migration (IOM) recruits in Yaoundé.")
        with model("publish", company="International Organization for Migration"):
            result = review_offer(offer, NOW)
        self.assertEqual((result["status"], result["company"]), ("published", "International Organization for Migration"))

    def test_same_company_returned_is_not_a_change(self):
        with model("publish", company="DHL Global Forwarding"):
            self.assertIsNone(review_offer(dict(OFFER), NOW)["company"])

    def test_same_posting_under_two_names_published_once(self):
        first = dict(OFFER, id="a", company="Smart Touch Design", title="Infographe Junior (H/F) - Stage Professionnel",
                     description="Smart Touch Design recrute un infographe junior à Yaoundé.")
        second = dict(first, id="b", company="SELETOO")
        store = FakeStore([first, second])
        with model("publish", company="Smart Touch Design"):
            counts = review_pending(store, now=NOW)
        self.assertEqual(counts, {"published": 1, "rejected": 1, "pending_review": 0})
        self.assertEqual([s[1] for s in store.settled], ["published", "rejected"])

    def test_review_pending_settles_and_skips_writes_in_dry_run(self):
        offers = [dict(OFFER), dict(OFFER, id="job-2", source_published_at=NOW - timedelta(days=80))]
        store = FakeStore(offers)
        with model("publish"):
            counts = review_pending(store, now=NOW)
        self.assertEqual(counts, {"published": 1, "rejected": 1, "pending_review": 0})
        self.assertEqual([s[:3] for s in store.settled],
                         [("job-1", "published", auto_review_agent.REVIEWER), ("job-2", "rejected", auto_review_agent.REVIEWER)])
        dry = FakeStore([dict(OFFER)])
        with model("publish"):
            review_pending(dry, dry_run=True, now=NOW)
        self.assertEqual(dry.settled, [])


if __name__ == "__main__":
    unittest.main()
