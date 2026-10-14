"""
Campus 360 — Re-runs the offer pipeline on the offers already in stage_jobs.

Usage:
  python scripts/agents/reprocess_existing.py            # dry run: writes the CSV report only
  python scripts/agents/reprocess_existing.py --apply    # applies kind/status from a reviewed run

Only kind/status/confidence/review_reason are updated: titles and texts are left untouched.
Offers bulk-inserted with one shared timestamp (seeded, not scraped) always go to human review.
"""

import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2  # noqa: E402
import psycopg2.extras  # noqa: E402

from classifier_agent import classify_post  # noqa: E402
from config import DATABASE_URL  # noqa: E402
from filter_agent import filter_post  # noqa: E402
from llm_client import LLMUnavailable  # noqa: E402
from verifier_agent import decide, normalize_company  # noqa: E402

REPORT = Path(__file__).resolve().parents[2] / ".agent" / "m17-reprocess-report.csv"
# A real scraping run inserts offers one by one; 5+ offers sharing the exact same timestamp were bulk-inserted.
BULK_INSERT_MIN = 5
# The legacy ingestor invented "contact@<company>.cm" when no email was found.
INVENTED_EMAIL = re.compile(r"^contact@[a-z0-9]+\.cm$")
# The legacy ingestor and column defaults invented these values.
INVENTED_LOCATIONS = {"cameroun (national / hybride)", "abidjan / hybride", "douala, cameroun"}


def load_offers(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """select j.id, j.title, j.description, j.location, j.created_at, j.expires_at, j.source_url,
                      c.name as company, c.contact_email, c.contact_whatsapp
                 from public.stage_jobs j
                 join public.stage_companies c on c.id = j.company_id
                order by j.created_at asc"""
        )
        return [dict(row) for row in cur.fetchall()]


def evaluate(offer: dict, seen: list, bulk_timestamps: set) -> dict:
    title, text = offer["title"], offer["description"] or ""
    email = (offer["contact_email"] or "").strip().lower()
    email = None if not email or INVENTED_EMAIL.match(email) else email
    location = (offer["location"] or "").strip()
    city = None if location.lower() in INVENTED_LOCATIONS else location or None

    ok, reason = filter_post(title, text, offer["company"], has_contact=bool(email or offer["contact_whatsapp"]))
    if not ok:
        return {"status": "rejected", "kind": None, "confidence": 0.0, "reason": f"filtre : {reason}"}
    try:
        classification = classify_post(title, text, "LEGACY")
    except LLMUnavailable as error:
        return {"status": "pending_review", "kind": "stage", "confidence": 0.5, "reason": f"IA indisponible : {error}"[:200]}

    fields = {
        "company": offer["company"], "title": title, "city": city, "deadline": None,
        "contact_email": email, "contact_whatsapp": offer["contact_whatsapp"], "apply_url": offer["source_url"],
    }
    decision = decide(classification, {"fields": fields}, seen)
    if decision["status"] == "published" and offer["created_at"] in bulk_timestamps:
        decision = {**decision, "status": "pending_review",
                    "reason": "insérée en bloc (pas scrapée) : vérifier que l'entreprise et l'offre existent"}
    return decision


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write the decisions to the database")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    offers = load_offers(conn)
    timestamps = Counter(offer["created_at"] for offer in offers)
    bulk_timestamps = {ts for ts, count in timestamps.items() if count >= BULK_INSERT_MIN}
    seen, rows = [], []
    for index, offer in enumerate(offers, start=1):
        decision = evaluate(offer, seen, bulk_timestamps)
        if decision["status"] != "rejected" or "doublon" not in decision["reason"]:
            seen.append({"company": offer["company"], "title": offer["title"]})
        rows.append({
            "id": str(offer["id"]), "cree_le": offer["created_at"].date().isoformat(), "entreprise": offer["company"],
            "titre": offer["title"], "decision": decision["status"], "type": decision["kind"] or "",
            "confiance": decision["confidence"], "raison": decision["reason"],
        })
        print(f"[{index}/{len(offers)}] {decision['status']:<15} {decision['kind'] or '-':<7} {offer['title'][:60]} — {decision['reason'][:80]}")

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)
    counts = {status: sum(1 for row in rows if row["decision"] == status) for status in ("published", "pending_review", "rejected")}
    print(f"\nRapport : {REPORT}\nBilan : {counts}")

    if args.apply:
        with conn, conn.cursor() as cur:
            for row in rows:
                cur.execute(
                    """update public.stage_jobs
                          set status = %s, kind = coalesce(nullif(%s, ''), kind), confidence = %s,
                              review_reason = %s, company_normalized = %s
                        where id = %s""",
                    (row["decision"], row["type"], row["confiance"],
                     None if row["decision"] == "published" else row["raison"][:500],
                     normalize_company(row["entreprise"]), row["id"]),
                )
        print("Décisions appliquées en base.")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
