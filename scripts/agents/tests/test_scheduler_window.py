"""Scheduler window tests: simulated clock, fake orchestrator, no real sleep.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import random
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import daily_scheduler  # noqa: E402

CM = timezone(timedelta(hours=1))


class Clock:
    def __init__(self, start):
        self.now = start

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += timedelta(seconds=seconds)


class FakeOrchestrator:
    def __init__(self, clock, cycle_minutes=25, cap_on_cycle=None):
        self.clock, self.cycle_minutes, self.cap_on_cycle = clock, cycle_minutes, cap_on_cycle
        self.runs = []

    def run_full_pipeline(self, **kwargs):
        self.runs.append(self.clock())
        self.clock.now += timedelta(minutes=self.cycle_minutes)
        return {"jobs_saved": 1, "reports_saved": 0, "cap_reached": len(self.runs) == self.cap_on_cycle}


def window(start, **kwargs):
    clock = Clock(start)
    orch = FakeOrchestrator(clock, **kwargs)
    result = daily_scheduler.run_harvesting_window(120, now_fn=clock, sleep_fn=clock.sleep,
                                                   orchestrator=orch, rng=random.Random(1))
    return result, orch


class WindowTests(unittest.TestCase):
    def test_full_window_stops_before_noon(self):
        result, orch = window(datetime(2026, 10, 20, 10, 0, tzinfo=CM))
        self.assertTrue(all(run.hour < 12 for run in orch.runs))
        self.assertEqual(result["reason"], "12 h atteint")
        self.assertGreaterEqual(len(orch.runs), 3)

    def test_late_start_runs_a_single_cycle(self):
        result, orch = window(datetime(2026, 10, 20, 11, 50, tzinfo=CM))
        self.assertEqual(len(orch.runs), 1)

    def test_cap_closes_the_window(self):
        result, orch = window(datetime(2026, 10, 20, 10, 0, tzinfo=CM), cap_on_cycle=2)
        self.assertEqual(len(orch.runs), 2)
        self.assertEqual(result["reason"], "plafond quotidien atteint")

    def test_window_end_is_noon_at_most(self):
        start = datetime(2026, 10, 20, 11, 0, tzinfo=CM)
        self.assertEqual(daily_scheduler._window_end(start, 120), datetime(2026, 10, 20, 12, 0, tzinfo=CM))


class DaemonTests(unittest.TestCase):
    def test_restart_at_10_35_runs_today_once(self):
        times = iter([datetime(2026, 10, 20, 10, 35, tzinfo=CM), datetime(2026, 10, 20, 10, 36, tzinfo=CM)])
        runs = []
        last = daily_scheduler.start_scheduler_daemon(now_fn=lambda: next(times), sleep_fn=lambda s: None,
                                                      window_fn=lambda: runs.append(1), max_checks=2)
        self.assertEqual(runs, [1])
        self.assertEqual(str(last), "2026-10-20")

    def test_outside_window_never_runs(self):
        self.assertFalse(daily_scheduler.should_start_window(datetime(2026, 10, 20, 9, 59, tzinfo=CM), None))
        self.assertFalse(daily_scheduler.should_start_window(datetime(2026, 10, 20, 12, 0, tzinfo=CM), None))
        self.assertTrue(daily_scheduler.should_start_window(datetime(2026, 10, 20, 11, 59, tzinfo=CM), None))


if __name__ == "__main__":
    unittest.main()
