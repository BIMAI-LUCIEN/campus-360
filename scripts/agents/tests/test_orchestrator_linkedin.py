"""Orchestrator LinkedIn wiring tests: fake agents, fake store, no network, no database.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import orchestrator  # noqa: E402
from orchestrator import ScraperOrchestrator  # noqa: E402
from company_check_agent import CompanyCheckAgent  # noqa: E402
from offer_page_reader import OfferPageReader  # noqa: E402


class FakeTreg:
    def __init__(self, configured=True, items=None):
        self.configured, self.items = configured, items or []
        self.live, self.calls, self.resets = False, [], 0

    def is_configured(self):
        return self.configured

    def reset_run(self):
        self.resets += 1

    def search_jobs(self, query, kind="emploi", max_results=10):
        self.calls.append(kind)
        return [dict(item, kind_hint=kind) for item in self.items]

    def fetch_details(self, items):
        self.detail_batches = getattr(self, "detail_batches", 0) + 1
        return items


class FakeSource:
    def __init__(self, items=None, configured=False):
        self.items, self.configured, self.calls = items or [], configured, 0

    def is_configured(self):
        return self.configured

    def __getattr__(self, name):
        # Any search_* / scrape_* method of a collector.
        def collect(*args, **kwargs):
            self.calls += 1
            return list(self.items)
        return collect


class FakeStore:
    added_today = 0
    instances = []

    def __init__(self, dry_run=False, connect=True):
        self.dry_run = dry_run
        self.expired = 0
        self.finished = None
        FakeStore.instances.append(self)

    def recent_offers(self):
        return []

    def count_added_today(self):
        return FakeStore.added_today

    def expire_due_offers(self):
        self.expired += 1
        return 0

    def start_run(self, sources):
        return "run-1"

    def finish_run(self, run_id, collected, statuses, cap_reached, error=None):
        self.finished = {"run_id": run_id, "collected": collected, "cap_reached": cap_reached, "error": error}

    def close(self):
        pass


def make(treg, linkedin_rss=None, cameroon=None):
    orch = ScraperOrchestrator.__new__(ScraperOrchestrator)
    orch.treg_linkedin_agent = treg
    orch.linkedin_agent = linkedin_rss or FakeSource()
    orch.apify_agent = FakeSource()
    orch.facebook_agent = FakeSource()
    orch.web_agent = FakeSource()
    orch.cameroon_agent = cameroon or FakeSource()
    orch.ocr_agent = FakeSource()
    orch.ai_agent = FakeSource()
    orch.db_ingestor = FakeSource()
    orch.company_checker = CompanyCheckAgent(api_key="", cli_path="")
    orch.page_reader = OfferPageReader(api_key="", cli_path="")
    return orch


OFFER = {"platform": "LINKEDIN", "title": "Supply Chain Intern", "company": "ReliefWeb",
         "location": "Cameroon", "url": "https://www.linkedin.com/jobs/view/2", "snippet": "x"}


@mock.patch.object(orchestrator, "JobStore", FakeStore)
class OrchestratorLinkedInTests(unittest.TestCase):
    def setUp(self):
        FakeStore.added_today = 0
        FakeStore.instances = []
    def run_pipeline(self, orch, **kwargs):
        decision = {"status": "pending_review", "kind": "stage", "confidence": 0.5, "reason": "test", "stage": "verifier"}
        with mock.patch.object(orchestrator, "process_offer", return_value=decision) as process:
            summary = orch.run_full_pipeline(query="informatique", platforms=kwargs.pop("platforms", ["LINKEDIN", "CAMEROON_JOBS"]),
                                             limit_per_platform=2, **kwargs)
        return summary, process

    def test_treg_not_configured_falls_back_and_other_sources_run(self):
        treg, rss, cameroon = FakeTreg(configured=False), FakeSource(), FakeSource()
        self.run_pipeline(make(treg, rss, cameroon), dry_run=True, live=False)
        self.assertEqual(treg.calls, [])
        self.assertEqual(rss.calls, 1)
        self.assertEqual(cameroon.calls, 1)

    def test_live_run_calls_treg_for_internships_then_jobs(self):
        treg, rss = FakeTreg(items=[OFFER]), FakeSource()
        summary, process = self.run_pipeline(make(treg, rss), live=True)
        self.assertEqual(treg.calls, ["stage", "emploi"])
        self.assertEqual(process.call_count, 2)
        self.assertEqual(rss.calls, 0)
        self.assertEqual(treg.detail_batches, 1)
        self.assertEqual(treg.resets, 1)

    def test_dry_run_never_enables_paid_source(self):
        treg = FakeTreg(items=[OFFER])
        orch = make(treg)
        self.run_pipeline(orch, dry_run=True, live=True)
        self.assertFalse(treg.live)
        self.assertEqual(treg.calls, [])

    def test_empty_treg_answer_uses_fallback(self):
        treg, rss = FakeTreg(items=[]), FakeSource()
        self.run_pipeline(make(treg, rss), live=True)
        self.assertEqual(treg.calls, ["stage", "emploi"])
        self.assertEqual(rss.calls, 1)

    def test_default_platforms_come_from_config(self):
        treg = FakeTreg(configured=False)
        summary, _ = self.run_pipeline(make(treg), platforms=None, dry_run=True)
        self.assertEqual(summary["platforms"], orchestrator.config.DEFAULT_PLATFORMS)


@mock.patch.object(orchestrator, "JobStore", FakeStore)
class DailyCapTests(unittest.TestCase):
    def setUp(self):
        FakeStore.instances = []

    def run_pipeline(self, orch, added_today, **kwargs):
        FakeStore.added_today = added_today
        decision = {"status": "published", "kind": "stage", "confidence": 0.85, "reason": "ok", "stage": "verifier"}
        with mock.patch.object(orchestrator, "process_offer", return_value=decision) as process, \
                mock.patch.object(orchestrator.ScraperOrchestrator, "_notify_published"), \
                mock.patch.object(orchestrator.config, "DAILY_OFFER_CAP", 20):
            summary = orch.run_full_pipeline(query="informatique", platforms=["LINKEDIN"], limit_per_platform=5, **kwargs)
        return summary, process

    def test_cap_already_reached_skips_paid_collection(self):
        treg = FakeTreg(items=[OFFER])
        summary, process = self.run_pipeline(make(treg), added_today=20, live=True)
        self.assertEqual(treg.calls, [])
        self.assertEqual(process.call_count, 0)
        self.assertTrue(summary["cap_reached"])
        self.assertTrue(FakeStore.instances[0].finished["cap_reached"])

    def test_one_slot_left_processes_one_offer(self):
        treg = FakeTreg(items=[OFFER])
        summary, process = self.run_pipeline(make(treg), added_today=19, live=True)
        self.assertEqual(process.call_count, 1)
        self.assertEqual(summary["added_today"], 20)
        self.assertTrue(summary["cap_reached"])

    def test_under_cap_processes_everything(self):
        treg = FakeTreg(items=[OFFER])
        summary, process = self.run_pipeline(make(treg), added_today=0, live=True)
        self.assertEqual(process.call_count, 2)
        self.assertFalse(summary["cap_reached"])

    def test_real_run_expires_and_journals_dry_run_does_not(self):
        self.run_pipeline(make(FakeTreg()), added_today=0, live=True)
        real = FakeStore.instances[-1]
        self.assertEqual(real.expired, 1)
        self.assertEqual(real.finished["run_id"], "run-1")
        self.run_pipeline(make(FakeTreg()), added_today=0, dry_run=True)
        dry = FakeStore.instances[-1]
        self.assertEqual(dry.expired, 0)
        self.assertIsNone(dry.finished["run_id"])


if __name__ == "__main__":
    unittest.main()
