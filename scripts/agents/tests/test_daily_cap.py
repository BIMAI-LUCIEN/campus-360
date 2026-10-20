"""Daily cap and JobStore journal tests: fake connection, no database.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from daily_cap import cameroon_day_start_utc, cap_reached  # noqa: E402
from job_store import JobStore  # noqa: E402


class CameroonDayTests(unittest.TestCase):
    def test_day_starts_at_midnight_cameroon(self):
        # 13:05 UTC = 14:05 in Cameroon -> the day started at 23:00 UTC the day before.
        start = cameroon_day_start_utc(datetime(2026, 10, 20, 13, 5, tzinfo=timezone.utc))
        self.assertEqual(start, datetime(2026, 10, 19, 23, 0, tzinfo=timezone.utc))

    def test_just_after_midnight_cameroon(self):
        # 23:30 UTC = 00:30 the next day in Cameroon.
        start = cameroon_day_start_utc(datetime(2026, 10, 20, 23, 30, tzinfo=timezone.utc))
        self.assertEqual(start, datetime(2026, 10, 20, 23, 0, tzinfo=timezone.utc))

    def test_cap(self):
        self.assertFalse(cap_reached(19, 20))
        self.assertTrue(cap_reached(20, 20))


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.rowcount = 0

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.conn.executed.append((" ".join(sql.split()), params))
        if self.conn.fail:
            raise RuntimeError("relation does not exist")
        self.rowcount = self.conn.rowcount

    def fetchone(self):
        return (self.conn.fetch,)


class FakeConn:
    def __init__(self, fetch=0, rowcount=0, fail=False):
        self.fetch, self.rowcount, self.fail = fetch, rowcount, fail
        self.executed, self.rolled_back = [], False

    def cursor(self, *args, **kwargs):
        return FakeCursor(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def rollback(self):
        self.rolled_back = True

    def close(self):
        pass


def store(conn, dry_run=False):
    instance = JobStore.__new__(JobStore)
    instance.dry_run = dry_run
    instance.conn = conn
    return instance


class JobStoreJournalTests(unittest.TestCase):
    def test_count_added_today_counts_scraped_published_and_pending(self):
        conn = FakeConn(fetch=7)
        self.assertEqual(store(conn).count_added_today(datetime(2026, 10, 20, 13, 5, tzinfo=timezone.utc)), 7)
        sql, params = conn.executed[0]
        self.assertIn("source = 'SCRAPED'", sql)
        self.assertIn("'published', 'pending_review'", sql)
        self.assertEqual(params[0], datetime(2026, 10, 19, 23, 0, tzinfo=timezone.utc))

    def test_count_failure_never_blocks(self):
        conn = FakeConn(fail=True)
        self.assertEqual(store(conn).count_added_today(), 0)
        self.assertTrue(conn.rolled_back)

    def test_expire_only_published_past_offers(self):
        conn = FakeConn(rowcount=3)
        self.assertEqual(store(conn).expire_due_offers(), 3)
        sql = conn.executed[0][0]
        self.assertIn("set status = 'expired'", sql)
        self.assertIn("status = 'published'", sql)
        self.assertIn("expires_at < now()", sql)

    def test_dry_run_writes_nothing(self):
        conn = FakeConn()
        s = store(conn, dry_run=True)
        self.assertEqual(s.expire_due_offers(), 0)
        self.assertIsNone(s.start_run(["LINKEDIN"]))
        s.finish_run("x", 1, {}, False)
        self.assertEqual(conn.executed, [])

    def test_run_journal_and_missing_table(self):
        conn = FakeConn(fetch="run-uuid")
        s = store(conn)
        self.assertEqual(s.start_run(["LINKEDIN"]), "run-uuid")
        s.finish_run("run-uuid", 4, {"published": 2, "pending_review": 1, "rejected": 1}, True, "x" * 900)
        update_sql, params = conn.executed[-1]
        self.assertIn("update public.stage_scrape_runs", update_sql)
        self.assertEqual(params[:6], (4, 2, 1, 1, 0, True))
        self.assertEqual(len(params[6]), 500)
        # Before migration 0014 the table does not exist: logged, never raised.
        broken = store(FakeConn(fail=True))
        self.assertIsNone(broken.start_run(["LINKEDIN"]))
        self.assertEqual(broken.expire_due_offers(), 0)


if __name__ == "__main__":
    unittest.main()
