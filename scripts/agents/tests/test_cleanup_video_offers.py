"""Unit tests for cleanup_video_offers.py (no network, no live DB)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from cleanup_video_offers import is_video_job_row, delete_video_offers  # noqa: E402


class _FakeCursor:
    def __init__(self, rowcount=2):
        self.executed = []
        self.rowcount = rowcount

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))


class _FakeConn:
    def __init__(self, rowcount=2):
        self.cur = _FakeCursor(rowcount=rowcount)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def cursor(self):
        return self.cur


class CleanupVideoOffersTests(unittest.TestCase):
    def test_detects_tiktok_and_video_urls(self):
        self.assertTrue(is_video_job_row("Stage", "https://www.tiktok.com/@a/video/123", ""))
        self.assertTrue(is_video_job_row("Stage", "https://vm.tiktok.com/Zabc/", ""))
        self.assertTrue(is_video_job_row("Stage", "https://www.facebook.com/reel/999", ""))
        self.assertTrue(is_video_job_row("Stage", "https://fb.watch/xyz/", ""))
        self.assertTrue(is_video_job_row("Stage", "https://www.youtube.com/shorts/abc", ""))

    def test_detects_tiktok_cdn_and_fallback_title(self):
        self.assertTrue(is_video_job_row("Stage", "https://example.com", "https://p16-sign.tiktokcdn.com/img.jpg"))
        self.assertTrue(is_video_job_row("Vidéo TikTok Offre de Stage", "https://example.com", ""))

    def test_ignores_legitimate_non_video_offers(self):
        self.assertFalse(is_video_job_row("Stage Développeur", "https://www.linkedin.com/jobs/view/123", ""))
        self.assertFalse(is_video_job_row("Stage RH", "https://www.facebook.com/posts/123456", ""))

    def test_delete_video_offers_empty_is_noop(self):
        conn = _FakeConn()
        self.assertEqual(delete_video_offers(conn, []), 0)
        self.assertEqual(conn.cur.executed, [])

    def test_delete_video_offers_executes_delete(self):
        conn = _FakeConn(rowcount=2)
        deleted = delete_video_offers(conn, ["uuid-1", "uuid-2"])
        self.assertEqual(deleted, 2)
        self.assertIn("DELETE FROM public.stage_jobs", conn.cur.executed[0][0])


if __name__ == "__main__":
    unittest.main()
