"""
Campus 360 — Agent 5: field check before an offer goes live.

Runs after the verifier and checks in the real world what a student would check by hand:
- the company exists: a Google search (Treg) finds its website, Facebook page or LinkedIn page;
- the offer is still open: the posting link answers and does not say the offer is closed;
- the place is in Cameroon, the posting is recent, and the contact (email, WhatsApp) is usable.

Only offers the verifier kept (published / pending_review) are checked, so nothing is spent
on rejects. A published offer that fails a check goes to human review; a closed offer is
rejected. Without `live` nothing is called and the decision is left as it is.
"""

import json
import logging
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from urllib.parse import urlparse

import config
from verifier_agent import normalize_company

logger = logging.getLogger("CompanyCheckAgent")

SEARCH_ENDPOINT = "anyapi.google.serp.organic"
QUOTA_STATUS = 429
MAX_OFFER_AGE_DAYS = 45
VERIFIED_SCORE = 60  # kyb_score from which a company counts as verified

CAMEROON_CITIES = {
    "douala", "yaounde", "bafoussam", "bamenda", "garoua", "maroua", "ngaoundere", "bertoua", "ebolowa",
    "kribi", "limbe", "buea", "kumba", "edea", "nkongsamba", "dschang", "foumban", "mbalmayo", "sangmelima",
    "kousseri", "loum", "mbouda", "tiko", "bafang", "bangangte", "obala", "meiganga", "guider", "yagoua",
    "mokolo", "batouri", "abong mbang", "ambam", "akonolinga", "manjo", "mbanga", "bafia",
}
# Job boards and aggregators: they mention a company, they do not prove it exists.
AGGREGATOR_DOMAINS = (
    "emploi.cm", "minajobs.net", "louma-jobs.com", "jobartis.com", "optioncarriere.com", "indeed.com",
    "glassdoor.com", "cameroondesks.com", "jobinfocamer.com", "emploicameroun.com", "kamerpower.com",
    "reliefweb.int", "africawork.com", "novojob.com", "talent.com", "jooble.org", "wikipedia.org",
    "google.com", "youtube.com", "tiktok.com", "instagram.com", "x.com", "twitter.com",
)
# Phrases a job page shows once the offer is closed.
CLOSED_MARKERS = (
    "no longer accepting applications", "n'accepte plus de candidatures", "this job is no longer available",
    "offre expirée", "offre expiree", "cette offre n'est plus disponible", "job has expired", "poste pourvu",
)
FREE_MAIL_DOMAINS = {"gmail.com", "yahoo.com", "yahoo.fr", "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.fr", "icloud.com"}
EMAIL_RE = re.compile(r"^[\w.+-]+@([\w-]+\.)+[a-z]{2,}$", re.IGNORECASE)
STOP_TOKENS = {"de", "du", "des", "la", "le", "les", "et", "the", "of", "and", "cie", "co"}


def _host(url: str) -> str:
    host = (urlparse(url or "").hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def _ascii(text: str) -> str:
    return normalize_company(text)  # same normalization as duplicates: accents, case, legal suffixes


def _tokens(company: str) -> list:
    return [t for t in _ascii(company).split() if len(t) >= 3 and t not in STOP_TOKENS]


def _mentions(company_tokens: list, result: dict) -> bool:
    """The result names the company: all its significant words appear in title, snippet or link."""
    if not company_tokens:
        return False
    haystack = _ascii(f"{result.get('title', '')} {result.get('snippet', '')} {result.get('link', '')}")
    squashed = haystack.replace(" ", "")
    return all(t in haystack or t in squashed for t in company_tokens)


def company_presence(company: str, results: list) -> dict:
    """Reads Google results: official website, Facebook page, LinkedIn page, other mentions."""
    tokens = _tokens(company)
    squashed_name = "".join(tokens)
    presence = {"website": None, "facebook": None, "linkedin": None, "mentions": 0}
    for result in results:
        link = result.get("link") or ""
        host = _host(link)
        if not host or not _mentions(tokens, result):
            continue
        presence["mentions"] += 1
        path = urlparse(link).path.lower()
        if host.endswith("facebook.com"):
            # A page, not a group post or a share of someone else's post.
            if not presence["facebook"] and "/groups/" not in path and "/posts/" not in path:
                presence["facebook"] = link
        elif host.endswith("linkedin.com"):
            if not presence["linkedin"] and path.startswith(("/company/", "/school/")):
                presence["linkedin"] = link
        elif not any(host == d or host.endswith("." + d) for d in AGGREGATOR_DOMAINS):
            # Official site: the domain itself carries the company name ("cm.sanlamallianz.com").
            domain_text = host.replace("-", "").replace(".", "")
            if not presence["website"] and (squashed_name and squashed_name[:12] in domain_text
                                            or any(len(t) >= 4 and t in domain_text for t in tokens)):
                presence["website"] = link
    return presence


def presence_score(presence: dict, email_matches_site: bool) -> int:
    score = 0
    score += 35 if presence.get("website") else 0
    score += 20 if presence.get("facebook") else 0
    score += 20 if presence.get("linkedin") else 0
    score += 10 if presence.get("mentions", 0) >= 2 else 0
    score += 15 if email_matches_site else 0
    return min(score, 100)


def normalize_whatsapp(number: str):
    """+237 6XX XX XX XX (mobile) or 2XX (landline): returns 237XXXXXXXXX, else None."""
    digits = re.sub(r"\D", "", number or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 9:
        digits = "237" + digits
    return digits if re.fullmatch(r"237[62]\d{8}", digits) else None


def contact_check(fields: dict, website: str = None) -> dict:
    email = (fields.get("contact_email") or "").strip()
    email_ok = bool(EMAIL_RE.match(email))
    email_domain = email.split("@")[-1].lower() if email_ok else ""
    site_host = _host(website) if website else ""
    email_matches_site = bool(email_domain and site_host and email_domain not in FREE_MAIL_DOMAINS
                              and (site_host.endswith(email_domain) or email_domain.endswith(site_host.split(".", 1)[-1])))
    whatsapp_ok = normalize_whatsapp(fields.get("contact_whatsapp")) is not None
    return {"email_ok": email_ok, "free_mail": email_domain in FREE_MAIL_DOMAINS, "email_matches_site": email_matches_site,
            "whatsapp_ok": whatsapp_ok, "has_link": bool(fields.get("apply_url"))}


def location_ok(fields: dict, item: dict) -> bool:
    """The city is a known Cameroon city, or the source location says Cameroon."""
    city = _ascii(fields.get("city") or "")
    if city and any(c in city for c in CAMEROON_CITIES):
        return True
    location = (item.get("location") or "").lower()
    return "cameroun" in location or "cameroon" in location


def offer_age_days(item: dict, now: datetime = None):
    raw = item.get("published_at")
    if not raw:
        return None
    try:
        published = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    return ((now or datetime.now(timezone.utc)) - published).days


class CompanyCheckAgent:
    def __init__(self, live=False, api_key=None, cli_path=None, base_url=None, max_calls=None, max_cost_usd=None,
                 timeout=30, post=None, run_cli=None, fetch=None, known_company=None):
        """known_company(name) -> {'status', 'kyb_score'} or None: companies already verified are not searched again."""
        self.live = live
        self.api_key = config.TREG_API_KEY if api_key is None else api_key
        self.base_url = (base_url or config.TREG_BASE_URL).rstrip("/")
        self.max_calls = config.TREG_MAX_VERIFY_CALLS_PER_RUN if max_calls is None else max_calls
        self.max_cost_usd = max_cost_usd or config.TREG_MAX_COST_PER_CALL_USD
        self.timeout = timeout
        self._post, self._fetch = post, fetch
        self._run_cli = run_cli or subprocess.run
        self.cli_path = self._find_cli(cli_path)
        self.known_company = known_company
        self.reset_run()

    @staticmethod
    def _find_cli(cli_path):
        if cli_path is not None:
            return cli_path or None
        if config.TREG_CLI and os.path.exists(config.TREG_CLI):
            return config.TREG_CLI
        return shutil.which("treg")

    def reset_run(self):
        self.calls = 0
        self.exhausted = False
        self._cache = {}

    # --- decision ------------------------------------------------------------------

    def review(self, decision: dict, item: dict, extraction: dict, now: datetime = None) -> dict:
        """Returns the decision, changed when a check fails, with the evidence under 'company_check'."""
        if not self.live or decision.get("status") not in ("published", "pending_review") or not extraction:
            return decision
        fields = extraction.get("fields") or {}
        company = fields.get("company") or ""
        doubts = []

        link = self.link_status(fields.get("apply_url") or item.get("url"))
        if link == "closed":
            return {**decision, "status": "rejected", "confidence": 0.0, "reason": "offre fermée ou retirée par la source",
                    "company_check": {"link": link}}

        presence = self.check_company(company) if company else None
        if presence is None:
            doubts.append("entreprise non vérifiée en ligne (recherche indisponible)" if company else "entreprise absente")
            presence = {"website": None, "facebook": None, "linkedin": None, "mentions": 0, "unavailable": True}
        contact = contact_check(fields, presence.get("website"))
        score = presence.get("kyb_score")
        if score is None:
            score = presence_score(presence, contact["email_matches_site"])
        if company and not presence.get("unavailable") and score == 0 and presence.get("mentions", 0) == 0:
            doubts.append("entreprise introuvable en ligne (ni site, ni Facebook, ni LinkedIn)")
        elif company and not presence.get("unavailable") and score < 20:
            doubts.append("présence en ligne faible, vérifier l'entreprise")

        if not (contact["email_ok"] or contact["whatsapp_ok"] or (contact["has_link"] and link == "open")):
            doubts.append("aucun contact utilisable (email ou WhatsApp invalide, lien injoignable)")
        if not location_ok(fields, item):
            doubts.append("lieu non confirmé au Cameroun")
        age = offer_age_days(item, now)
        if age is not None and age > MAX_OFFER_AGE_DAYS and not fields.get("deadline"):
            doubts.append(f"annonce publiée il y a {age} jours, vérifier qu'elle est encore ouverte")

        check = {"link": link, "kyb_score": score, "website": presence.get("website"), "facebook": presence.get("facebook"),
                 "linkedin": presence.get("linkedin"), "mentions": presence.get("mentions", 0), "contact": contact,
                 "doubts": doubts}
        if not doubts:
            return {**decision, "company_check": check}
        reason = "; ".join(doubts)
        if decision["status"] == "pending_review":
            reason = f"{decision.get('reason', '')}; {reason}".strip("; ")
        return {**decision, "status": "pending_review", "confidence": min(decision.get("confidence", 0.5), 0.79),
                "reason": reason, "company_check": check}

    # --- company search --------------------------------------------------------------

    def check_company(self, company: str):
        """Presence dict, or None when no search could be made."""
        key = normalize_company(company)
        if key in self._cache:
            return self._cache[key]
        known = None
        if self.known_company:
            try:
                known = self.known_company(company)
            except Exception as error:
                logger.debug(f"Lecture entreprise connue impossible ({type(error).__name__}).")
        if known and known.get("status") == "VERIFIED" and (known.get("kyb_score") or 0) >= VERIFIED_SCORE:
            presence = {"website": None, "facebook": None, "linkedin": None, "mentions": 0, "known": True,
                        "kyb_score": known["kyb_score"]}
            self._cache[key] = presence
            return presence
        results = self.search(f"\"{company}\" Cameroun")
        presence = company_presence(company, results) if results is not None else None
        self._cache[key] = presence
        return presence

    def search(self, query: str):
        """Google organic results [{link, title, snippet}], or None when no call was possible."""
        if not (self.api_key or self.cli_path):
            logger.warning("Contrôle entreprise : Treg non configuré.")
            return None
        if self.exhausted or self.calls >= self.max_calls:
            logger.warning(f"Contrôle entreprise : plafond de {self.max_calls} recherches atteint pour ce passage.")
            return None
        self.calls += 1
        body = {"query": query, "gl": "cm", "hl": "fr", "limit": 10}
        payload = self._request_http(body) if self.api_key else self._request_cli(body)
        if payload is None:
            return None
        results = ((payload.get("output") or {}).get("data") or {}).get("results")
        return results if isinstance(results, list) else []

    def _request_http(self, body: dict):
        try:
            post = self._post
            if post is None:
                import requests
                post = requests.post
            response = post(
                f"{self.base_url}/call/{SEARCH_ENDPOINT}", json=body, timeout=self.timeout,
                headers={"X-Treg-Token": self.api_key, "X-Treg-Route-Max-Cost": str(self.max_cost_usd),
                         "Content-Type": "application/json"},
            )
        except Exception as error:
            logger.warning(f"Contrôle entreprise : échec de la recherche ({type(error).__name__}).")
            return None
        return self._read_answer(response.status_code, lambda: response.json())

    def _request_cli(self, body: dict):
        command = [self.cli_path, "--json", "call", SEARCH_ENDPOINT, "--method", "POST",
                   "--header", f"X-Treg-Route-Max-Cost: {self.max_cost_usd}", "--data", json.dumps(body)]
        try:
            done = self._run_cli(command, capture_output=True, text=True, timeout=self.timeout)
            wrapped = json.loads(done.stdout or "")
        except Exception as error:
            logger.warning(f"Contrôle entreprise : échec du CLI ({type(error).__name__}).")
            return None
        status = (wrapped.get("_treg") or {}).get("http_status") or (200 if done.returncode == 0 else 0)
        return self._read_answer(status, lambda: wrapped.get("result"))

    def _read_answer(self, status, read_body):
        if status == QUOTA_STATUS:
            self.exhausted = True
            logger.warning("Contrôle entreprise : quota Treg atteint (429), recherches arrêtées pour ce passage.")
            return None
        if status != 200:
            logger.warning(f"Contrôle entreprise : échec (HTTP {status}).")
            return None
        try:
            payload = read_body()
        except ValueError:
            return None
        return payload if isinstance(payload, dict) else None

    # --- posting link ------------------------------------------------------------------

    def link_status(self, url: str) -> str:
        """'open', 'closed' (404/410 or a closed marker) or 'unknown' (no link, login wall, network error)."""
        if not url or not url.startswith(("http://", "https://")):
            return "unknown"
        try:
            fetch = self._fetch
            if fetch is None:
                import requests
                fetch = requests.get
            response = fetch(url, timeout=self.timeout, allow_redirects=True,
                             headers={"User-Agent": config.USER_AGENTS[0], "Accept-Language": "fr,en;q=0.8"})
        except Exception as error:
            logger.debug(f"Lien de l'offre injoignable ({type(error).__name__}).")
            return "unknown"
        if response.status_code in (404, 410):
            return "closed"
        if response.status_code != 200:
            return "unknown"  # 403 / 999 (LinkedIn, Facebook login walls) prove nothing
        text = (getattr(response, "text", "") or "")[:300000].lower()
        if any(marker in text for marker in CLOSED_MARKERS):
            return "closed"
        return "open"
