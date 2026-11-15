"""
Campus 360 — One-off / idempotent cleanup of TikTok & video-only offers in stage_jobs.

Usage:
  python scripts/agents/cleanup_video_offers.py --dry-run   # default: list matches without deleting
  python scripts/agents/cleanup_video_offers.py --apply     # delete matched rows in a transaction
"""

import argparse
import sys
from pathlib import Path
from typing import Iterable, List, Tuple

import psycopg2

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import DATABASE_URL  # noqa: E402
from filter_agent import is_video_source  # noqa: E402

VIDEO_SQL_PATTERNS = (
    "%tiktok.com%",
    "%tiktokcdn%",
    "%facebook.com/reel/%",
    "%facebook.com/%/reels/%",
    "%fb.watch%",
    "%instagram.com/reel/%",
    "%instagram.com/reels/%",
    "%youtube.com/shorts/%",
    "%youtu.be/%",
)
TIKTOK_FALLBACK_TITLE = "Vidéo TikTok Offre de Stage"


def is_video_job_row(title: str, source_url: str, flyer_url: str) -> bool:
    """Confirm in Python that a DB row is truly a TikTok or video-only offer."""
    if is_video_source(source_url=source_url or ""):
        return True
    if flyer_url and "tiktokcdn" in flyer_url.lower():
        return True
    return (title or "").strip() == TIKTOK_FALLBACK_TITLE


def find_video_offers(conn) -> List[Tuple[str, str, str, str]]:
    """Return [(id, status, title, source_url), ...] for all TikTok/video offers in stage_jobs."""
    like_clauses = " OR ".join(["source_url ILIKE %s"] * len(VIDEO_SQL_PATTERNS))
    sql = f"""
        SELECT id::text, status, title, COALESCE(source_url, ''), COALESCE(flyer_url, '')
        FROM public.stage_jobs
        WHERE ({like_clauses})
           OR flyer_url ILIKE %s
           OR title = %s
        ORDER BY created_at DESC
    """
    params = (*VIDEO_SQL_PATTERNS, "%tiktokcdn%", TIKTOK_FALLBACK_TITLE)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return [
        (job_id, status, title, source_url)
        for job_id, status, title, source_url, flyer_url in rows
        if is_video_job_row(title, source_url, flyer_url)
    ]


def count_linked_applications(conn, job_ids: Iterable[str]) -> int:
    """Count rows in stage_applications referencing any of job_ids."""
    ids = list(job_ids)
    if not ids:
        return 0
    with conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM public.stage_applications WHERE job_id = ANY(%s::uuid[])",
            (ids,),
        )
        return int(cur.fetchone()[0])


def delete_video_offers(conn, job_ids: Iterable[str]) -> int:
    """Delete the given stage_jobs IDs in a single transaction."""
    ids = list(job_ids)
    if not ids:
        return 0
    with conn, conn.cursor() as cur:
        cur.execute("DELETE FROM public.stage_jobs WHERE id = ANY(%s::uuid[])", (ids,))
        return cur.rowcount


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Nettoyage des offres TikTok / vidéo dans stage_jobs")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Lister sans supprimer (défaut)")
    mode.add_argument("--apply", action="store_true", help="Supprimer les offres trouvées")
    args = parser.parse_args(argv)

    if not DATABASE_URL:
        print("ERREUR: DATABASE_URL non configurée.", file=sys.stderr)
        return 2

    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    try:
        matches = find_video_offers(conn)
        ids = [m[0] for m in matches]
        app_count = count_linked_applications(conn, ids)
        print(f"Offres vidéo trouvées : {len(matches)} (candidatures liées : {app_count})")
        for job_id, status, title, source_url in matches:
            print(f"  - [{status}] {job_id} | {title[:70]} | {source_url}")

        if not args.apply:
            print("Mode --dry-run : aucune suppression effectuée.")
            return 0

        deleted = delete_video_offers(conn, ids)
        print(f"Suppression effectuée : {deleted} offre(s) retirée(s) de stage_jobs.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
