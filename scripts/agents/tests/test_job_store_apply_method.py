"""save_offer picks the apply method from the fields it really has (task 25.17).

Fake cursor only: no database, no network.
Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from job_store import JobStore  # noqa: E402


class FakeCursor:
    def __init__(self, recorder):
        self.recorder = recorder

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.recorder.append((" ".join(sql.split()), params))

    def fetchall(self):
        return []

    def fetchone(self):
        return ("00000000-0000-0000-0000-000000000001",)


class FakeConn:
    def __init__(self):
        self.executed = []

    def cursor(self, *args, **kwargs):
        return FakeCursor(self.executed)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def saved_apply_method(**field_overrides) -> str:
    fields = {"title": "Stagiaire", "company": "FAYAT Group", "city": "Yaoundé", "deadline": None,
              "duration": None, "stipend": None, "contact_email": None, "contact_whatsapp": None,
              "apply_url": None, "skills": [], "summary": ""}
    fields.update(field_overrides)
    store = JobStore.__new__(JobStore)
    store.dry_run = False
    store.conn = FakeConn()
    item = {"platform": "LINKEDIN", "title": "Stagiaire", "url": "https://www.linkedin.com/jobs/view/1",
            "snippet": "x", "flyer_url": None, "published_at": None}
    decision = {"status": "published", "kind": "stage", "confidence": 0.85, "reason": "ok"}
    store.save_offer(item, {"fields": fields, "evidence": {}}, decision)
    insert = next(params for sql, params in store.conn.executed if "insert into public.stage_jobs" in sql)
    return insert[4]  # apply_method, 5th placeholder of the insert


class ApplyMethodTests(unittest.TestCase):
    def test_whatsapp_wins(self):
        self.assertEqual(saved_apply_method(contact_whatsapp="+237699999999",
                                            contact_email="rh@x.cm", apply_url="https://x/1"), "WHATSAPP")

    def test_email_when_no_whatsapp(self):
        self.assertEqual(saved_apply_method(contact_email="rh@x.cm", apply_url="https://x/1"), "EMAIL")

    def test_link_when_only_a_url(self):
        self.assertEqual(saved_apply_method(apply_url="https://www.linkedin.com/jobs/view/1"), "LINK")

    def test_physical_when_nothing(self):
        self.assertEqual(saved_apply_method(), "PHYSICAL")


if __name__ == "__main__":
    unittest.main()
