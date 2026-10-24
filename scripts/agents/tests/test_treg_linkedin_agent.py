"""Treg LinkedIn adapter tests: fake transports only, no network, no cost.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import json
import logging
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from treg_linkedin_agent import TregLinkedInAgent  # noqa: E402

FAKE_KEY = "fake-treg-key-for-tests"

# Shapes taken from the real answers of 2026-10-20 (public job cards).
SAMPLE = {
    "output": {
        "data": {
            "items": [
                {"id": "1", "title": "Stagiaire Ingénieur Travaux", "company": "FAYAT Group",
                 "location": "Yaoundé, Centre, Cameroon", "createdUtc": 1792368000,
                 "url": "https://www.linkedin.com/jobs/view/1"},
                {"id": "2", "title": "Supply Chain Intern", "company": "ReliefWeb",
                 "location": "Cameroon", "createdUtc": 1791244800,
                 "url": "https://www.linkedin.com/jobs/view/2"},
                {"id": "1", "title": "Stagiaire Ingénieur Travaux", "company": "FAYAT Group",
                 "location": "Yaoundé, Centre, Cameroon", "createdUtc": 1792368000,
                 "url": "https://www.linkedin.com/jobs/view/1"},
                {"id": "3", "title": "Account Manager EMEA", "company": "Runpod",
                 "location": "EMEA (Remote)", "createdUtc": 1792452392,
                 "url": "https://www.linkedin.com/jobs/view/3"},
                {"id": "4", "title": "", "company": "X", "location": "Cameroon", "url": "https://x"},
            ]
        },
        "found": True,
    }
}


class FakePost:
    def __init__(self, status=200, body=None, error=None):
        self.status, self.body, self.error = status, body, error
        self.calls = []

    def __call__(self, url, json=None, headers=None, timeout=None):
        self.calls.append({"url": url, "json": json, "headers": headers})
        if self.error:
            raise self.error
        body = self.body

        def read():
            if isinstance(body, Exception):
                raise body
            return body
        return SimpleNamespace(status_code=self.status, json=read)


def http_agent(post, **kwargs):
    kwargs.setdefault("live", True)
    return TregLinkedInAgent(api_key=FAKE_KEY, post=post, cli_path="", **kwargs)


class GuardTests(unittest.TestCase):
    def test_not_live_makes_no_call(self):
        post = FakePost(body=SAMPLE)
        self.assertEqual(http_agent(post, live=False).search_jobs("stagiaire", kind="stage"), [])
        self.assertEqual(post.calls, [])

    def test_not_configured_makes_no_call(self):
        post = FakePost(body=SAMPLE)
        agent = TregLinkedInAgent(api_key="", post=post, cli_path="", live=True)
        self.assertFalse(agent.is_configured())
        self.assertEqual(agent.search_jobs("emploi"), [])
        self.assertEqual(post.calls, [])

    def test_call_cap_per_run(self):
        post = FakePost(body=SAMPLE)
        agent = http_agent(post, max_calls=2)
        for _ in range(3):
            agent.search_jobs("emploi")
        self.assertEqual(len(post.calls), 2)
        agent.reset_run()
        agent.search_jobs("emploi")
        self.assertEqual(len(post.calls), 3)

    def test_quota_stops_the_run(self):
        post = FakePost(status=429, body={})
        agent = http_agent(post)
        self.assertEqual(agent.search_jobs("emploi"), [])
        self.assertEqual(agent.search_jobs("emploi"), [])
        self.assertEqual(len(post.calls), 1)


class HttpTests(unittest.TestCase):
    def test_failures_return_empty(self):
        cases = [
            FakePost(status=500, body={}),
            FakePost(error=TimeoutError("slow")),
            FakePost(body={}),
            FakePost(body=ValueError("not json")),
        ]
        for post in cases:
            with self.subTest(status=post.status, error=post.error):
                self.assertEqual(http_agent(post).search_jobs("emploi"), [])

    def test_request_shape_and_secret_handling(self):
        post = FakePost(body=SAMPLE)
        with self.assertLogs("TregLinkedInAgent", level=logging.INFO) as logs:
            http_agent(post).search_jobs("stagiaire", kind="stage")
        call = post.calls[0]
        self.assertTrue(call["url"].endswith("/call/anyapi.linkedin.search.jobs"))
        self.assertNotIn("token=", call["url"])
        self.assertEqual(call["headers"]["X-Treg-Token"], FAKE_KEY)
        self.assertIn("X-Treg-Route-Max-Cost", call["headers"])
        self.assertEqual(call["json"]["employmentType"], "internship")
        self.assertEqual(call["json"]["location"], "Cameroon")
        self.assertNotIn(FAKE_KEY, "\n".join(logs.output))

    def test_job_search_has_no_type_filter(self):
        post = FakePost(body=SAMPLE)
        http_agent(post).search_jobs("informatique", kind="emploi")
        self.assertNotIn("employmentType", post.calls[0]["json"])


class NormalizeTests(unittest.TestCase):
    def test_keeps_cameroon_dedupes_and_drops_incomplete(self):
        items = http_agent(FakePost(body=SAMPLE)).search_jobs("stagiaire", kind="stage")
        self.assertEqual([i["source_id"] for i in items], ["linkedin:1", "linkedin:2"])

    def test_item_uses_only_real_fields(self):
        item = http_agent(FakePost(body=SAMPLE)).search_jobs("stagiaire", kind="stage")[0]
        self.assertEqual(item["platform"], "LINKEDIN")
        self.assertEqual(item["company"], "FAYAT Group")
        self.assertIsNone(item["contact_email"])
        self.assertIsNone(item["contact_whatsapp"])
        self.assertEqual(item["kind_hint"], "stage")
        self.assertTrue(item["published_at"].startswith("2026-"))
        self.assertIn("https://www.linkedin.com/jobs/view/1", item["snippet"])
        # Long enough for the hard-rule filter, made of real fields only.
        self.assertGreaterEqual(len(item["title"] + "\n" + item["snippet"]), 80)

    def test_max_results(self):
        self.assertEqual(len(http_agent(FakePost(body=SAMPLE)).search_jobs("x", kind="stage", max_results=1)), 1)


class CliTests(unittest.TestCase):
    def test_cli_transport_reads_wrapped_result(self):
        seen = {}

        def fake_run(command, capture_output, text, timeout):
            seen["command"] = command
            out = json.dumps({"result": SAMPLE, "_treg": {"http_status": 200, "charged_micro": 660}})
            return SimpleNamespace(returncode=0, stdout=out)

        agent = TregLinkedInAgent(api_key="", cli_path="/opt/treg-cli/bin/treg", run_cli=fake_run, live=True)
        self.assertTrue(agent.is_configured())
        items = agent.search_jobs("emploi")
        self.assertEqual(len(items), 2)
        self.assertIn("anyapi.linkedin.search.jobs", seen["command"])
        self.assertNotIn(FAKE_KEY, " ".join(seen["command"]))

    def test_cli_quota_and_garbage(self):
        def quota(*args, **kwargs):
            return SimpleNamespace(returncode=1, stdout=json.dumps({"result": {}, "_treg": {"http_status": 429}}))

        agent = TregLinkedInAgent(api_key="", cli_path="/x/treg", run_cli=quota, live=True)
        self.assertEqual(agent.search_jobs("emploi"), [])
        self.assertTrue(agent.exhausted)

        def garbage(*args, **kwargs):
            return SimpleNamespace(returncode=1, stdout="not json")

        agent = TregLinkedInAgent(api_key="", cli_path="/x/treg", run_cli=garbage, live=True)
        self.assertEqual(agent.search_jobs("emploi"), [])



class FakeGet:
    def __init__(self, status=200, body=None):
        self.status, self.body, self.calls = status, body, []

    def __call__(self, url, params=None, headers=None, timeout=None):
        self.calls.append({"url": url, "params": params})
        return SimpleNamespace(status_code=self.status, json=lambda: self.body)


class DetailTests(unittest.TestCase):
    ITEM = {"source_id": "linkedin:4465308031", "snippet": "Stagiaire — ACME — Douala", "description": None, "stipend": None}

    def test_full_description_and_salary_are_kept_word_for_word(self):
        text = "Missions :\n- Développer l'API\n- Rédiger les tests\n" + "x" * 3000
        get = FakeGet(body={"output": {"element": {"descriptionText": text, "salary": {"text": "150 000 FCFA/mois"}}}})
        agent = TregLinkedInAgent(api_key=FAKE_KEY, get=get, cli_path="", live=True)
        item = dict(self.ITEM)
        agent.fetch_details([item])
        self.assertEqual(item["description"], text)
        self.assertIn(text, item["snippet"])
        self.assertEqual(item["stipend"], "150 000 FCFA/mois")
        self.assertTrue(get.calls[0]["url"].endswith("/call/harvestapi.linkedin.job.get"))
        self.assertEqual(get.calls[0]["params"], {"jobId": "4465308031"})

    def test_detail_cap_and_not_live(self):
        get = FakeGet(body={"element": {"descriptionText": "texte"}})
        agent = TregLinkedInAgent(api_key=FAKE_KEY, get=get, cli_path="", live=True, max_detail_calls=1)
        items = [dict(self.ITEM), dict(self.ITEM)]
        agent.fetch_details(items)
        self.assertEqual(len(get.calls), 1)
        self.assertIsNone(items[1]["description"])
        offline = TregLinkedInAgent(api_key=FAKE_KEY, get=get, cli_path="", live=False)
        offline.fetch_details([dict(self.ITEM)])
        self.assertEqual(len(get.calls), 1)

    def test_failed_detail_keeps_item(self):
        agent = TregLinkedInAgent(api_key=FAKE_KEY, get=FakeGet(status=500), cli_path="", live=True)
        item = dict(self.ITEM)
        agent.fetch_details([item])
        self.assertIsNone(item["description"])


if __name__ == "__main__":
    unittest.main()
