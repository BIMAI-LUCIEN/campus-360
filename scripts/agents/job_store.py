"""
Campus 360 — Persistence for the offer pipeline (direct Postgres, psycopg2).

Writes exactly what was extracted: no invented location, duration, stipend or email.
"""

import json
import logging
from datetime import date, datetime, timedelta, timezone

import psycopg2
import psycopg2.extras

from config import DATABASE_URL
from verifier_agent import normalize_company

logger = logging.getLogger("JobStore")
DEFAULT_LIFETIME_DAYS = 30
UNKNOWN_COMPANY = "Entreprise à identifier (voir la source)"


class JobStore:
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.conn = None if dry_run and not DATABASE_URL else psycopg2.connect(DATABASE_URL, sslmode="require")

    def close(self):
        if self.conn:
            self.conn.close()

    def recent_offers(self, days: int = 60) -> list:
        """Recent offers (any status) used for duplicate detection."""
        if not self.conn:
            return []
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """select j.title, c.name as company from public.stage_jobs j
                     join public.stage_companies c on c.id = j.company_id
                    where j.created_at > now() - make_interval(days => %s)""",
                (days,),
            )
            return [dict(row) for row in cur.fetchall()]

    def log_rejection(self, stage: str, reason: str, item: dict):
        if self.dry_run or not self.conn:
            return
        with self.conn, self.conn.cursor() as cur:
            cur.execute(
                """insert into public.stage_job_rejections (stage, reason, source_platform, source_url, source_title, source_text)
                   values (%s, %s, %s, %s, %s, %s)""",
                (stage, reason[:500], item.get("platform"), item.get("url"), (item.get("title") or "")[:300], (item.get("snippet") or "")[:4000]),
            )

    def _company_id(self, cur, name: str, fields: dict, industry: str) -> str:
        normalized = normalize_company(name)
        cur.execute("select id, name from public.stage_companies")
        for company_id, existing_name in cur.fetchall():
            if normalize_company(existing_name) == normalized:
                return company_id
        cur.execute(
            """insert into public.stage_companies (name, industry, address, contact_email, contact_whatsapp, status, kyb_score)
               values (%s, %s, %s, %s, %s, 'UNVERIFIED', 0) returning id""",
            (name, industry or "Non précisé", fields.get("city") or "", fields.get("contact_email") or "", fields.get("contact_whatsapp")),
        )
        return cur.fetchone()[0]

    def save_offer(self, item: dict, extraction: dict, decision: dict) -> str:
        """Inserts the offer with its pipeline status. Returns the job id (or 'dry_run')."""
        fields, evidence = extraction["fields"], extraction["evidence"]
        if self.dry_run:
            return "dry_run"
        if fields.get("contact_whatsapp"):
            apply_method = "WHATSAPP"
        elif fields.get("contact_email"):
            apply_method = "EMAIL"
        else:
            apply_method = "PHYSICAL"
        expires_at = datetime.now(timezone.utc) + timedelta(days=DEFAULT_LIFETIME_DAYS)
        if fields.get("deadline"):
            try:
                expires_at = datetime.combine(date.fromisoformat(fields["deadline"][:10]), datetime.max.time(), timezone.utc)
            except ValueError:
                pass
        with self.conn, self.conn.cursor() as cur:
            # Only pending offers can lack a company; the reviewer identifies it from the source.
            company_name = fields.get("company") or UNKNOWN_COMPANY
            company_id = self._company_id(cur, company_name, fields, item.get("field"))
            cur.execute(
                """insert into public.stage_jobs (
                     company_id, title, description, requirements, apply_method, source, location, duration, stipend,
                     flyer_url, expires_at, kind, status, confidence, review_reason, evidence, source_url,
                     source_published_at, company_normalized)
                   values (%s, %s, %s, %s, %s, 'SCRAPED', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   returning id""",
                (
                    company_id,
                    (fields.get("title") or item.get("title") or "")[:200],
                    (fields.get("summary") or item.get("snippet") or "")[:1900],
                    fields.get("skills") or [],
                    apply_method,
                    fields.get("city"),
                    fields.get("duration"),
                    fields.get("stipend"),
                    item.get("flyer_url"),
                    expires_at,
                    decision["kind"],
                    decision["status"],
                    decision["confidence"],
                    decision["reason"][:500] if decision["status"] != "published" else None,
                    json.dumps({**evidence, "contact_email": fields.get("contact_email"), "apply_url": fields.get("apply_url")}),
                    item.get("url"),
                    item.get("published_at"),
                    normalize_company(company_name),
                ),
            )
            return str(cur.fetchone()[0])
