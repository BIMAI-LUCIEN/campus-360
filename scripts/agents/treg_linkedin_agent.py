"""
Campus 360 — LinkedIn job search through Treg (https://treg.to).

Endpoint `anyapi.linkedin.search.jobs`, validated by real calls on 2026-10-20:
- internships: employmentType "internship" + location "Cameroon" (the word "stage"
  alone returns offers from outside Cameroon and is never used);
- jobs: location "Cameroon", no type filter.
The answer has no description, salary or contact: only id, title, company,
location, createdUtc, url. `fetch_details` then reads each posting in full
(`harvestapi.linkedin.job.get`, ~$0.001): the description is kept word for word,
never summarized. Nothing is ever invented to fill the gaps.

Every call costs money (~$0.00066), so the agent calls nothing unless `live` is set,
stops at `max_calls` per run and stops for the run after a quota answer (429).
"""

import json
import logging
import os
import shutil
import subprocess
from datetime import datetime, timezone

import config

logger = logging.getLogger("TregLinkedInAgent")

ENDPOINT = "anyapi.linkedin.search.jobs"
DETAIL_ENDPOINT = "harvestapi.linkedin.job.get"
MAX_DESCRIPTION_CHARS = 20000
QUOTA_STATUS = 429


def _is_cameroon(location: str) -> bool:
    text = (location or "").lower()
    return "cameroon" in text or "cameroun" in text


class TregLinkedInAgent:
    def __init__(self, api_key=None, live=False, max_calls=None, post=None, run_cli=None,
                 cli_path=None, base_url=None, max_cost_usd=None, timeout=60, get=None,
                 max_detail_calls=None):
        self.api_key = config.TREG_API_KEY if api_key is None else api_key
        self.live = live
        self.max_calls = config.TREG_MAX_CALLS_PER_RUN if max_calls is None else max_calls
        self.base_url = (base_url or config.TREG_BASE_URL).rstrip("/")
        self.max_cost_usd = max_cost_usd or config.TREG_MAX_COST_PER_CALL_USD
        self.timeout = timeout
        self._post = post
        self._get = get
        self.max_detail_calls = config.TREG_MAX_DETAIL_CALLS_PER_RUN if max_detail_calls is None else max_detail_calls
        self.detail_calls = 0
        self._run_cli = run_cli or subprocess.run
        self.cli_path = self._find_cli(cli_path)
        self.calls = 0
        self.exhausted = False

    @staticmethod
    def _find_cli(cli_path):
        if cli_path is not None:
            return cli_path or None
        if config.TREG_CLI and os.path.exists(config.TREG_CLI):
            return config.TREG_CLI
        return shutil.which("treg")

    def is_configured(self) -> bool:
        return bool(self.api_key) or bool(self.cli_path)

    def reset_run(self):
        self.calls = 0
        self.detail_calls = 0
        self.exhausted = False

    def search_jobs(self, query: str, kind: str = "emploi", location: str = "Cameroon", max_results: int = 10) -> list:
        """kind: 'stage' (internship filter) or 'emploi'. Returns collector items, [] on any failure."""
        if not self.live:
            logger.info("Treg LinkedIn ignoré : mode sans --live.")
            return []
        if not self.is_configured():
            logger.warning("Treg non configuré (TREG_API_KEY absente et CLI treg introuvable).")
            return []
        if self.exhausted:
            logger.warning("Treg : quota atteint plus tôt dans ce passage, appel non émis.")
            return []
        if self.calls >= self.max_calls:
            logger.warning(f"Treg : plafond de {self.max_calls} appels atteint pour ce passage.")
            return []

        body = {"query": (query or "").strip() or ("stagiaire" if kind == "stage" else "emploi"), "location": location}
        if kind == "stage":
            body["employmentType"] = "internship"
        self.calls += 1
        payload = self._request(body)
        if payload is None:
            return []

        items, seen = [], set()
        raw_items = ((payload.get("output") or {}).get("data") or {}).get("items")
        if not isinstance(raw_items, list):
            logger.warning("Treg LinkedIn : réponse sans liste d'offres.")
            return []
        for raw in raw_items:
            item = self._normalize(raw, kind)
            if item and item["source_id"] not in seen:
                seen.add(item["source_id"])
                items.append(item)
            if len(items) >= max_results:
                break
        logger.info(f"Treg LinkedIn ({kind}) : {len(items)} offre(s) au Cameroun sur {len(raw_items)} reçue(s).")
        return items

    def fetch_details(self, items: list) -> list:
        """Adds the full posting (description, salary) to each LinkedIn item, in place.
        An item whose detail cannot be read is kept as it was."""
        for item in items:
            if not self.live or self.exhausted or self.detail_calls >= self.max_detail_calls:
                if self.detail_calls >= self.max_detail_calls:
                    logger.warning(f"Treg : plafond de {self.max_detail_calls} fiches détaillées atteint pour ce passage.")
                break
            job_id = (item.get("source_id") or "").split("linkedin:", 1)[-1]
            if not job_id.isdigit():
                continue
            self.detail_calls += 1
            element = self._detail(job_id)
            if element:
                self._apply_detail(item, element)
        return items

    @staticmethod
    def _apply_detail(item: dict, element: dict):
        description = (element.get("descriptionText") or "").strip()
        if description:
            item["description"] = description[:MAX_DESCRIPTION_CHARS]
            item["snippet"] = f"{item.get('snippet', '')}\n{description}"[:MAX_DESCRIPTION_CHARS]
        salary = element.get("salary") or {}
        if isinstance(salary, dict) and (salary.get("text") or "").strip():
            item["stipend"] = salary["text"].strip()

    def _detail(self, job_id: str):
        if self.api_key:
            payload = self._request_http_get(DETAIL_ENDPOINT, {"jobId": job_id})
        else:
            payload = self._request_cli_detail(job_id)
        if not isinstance(payload, dict):
            return None
        element = payload.get("element")
        if not isinstance(element, dict):
            element = ((payload.get("output") or {}).get("element")) if isinstance(payload.get("output"), dict) else None
        return element if isinstance(element, dict) else None

    def _request_http_get(self, endpoint: str, params: dict):
        try:
            get = self._get
            if get is None:
                import requests
                get = requests.get
            response = get(
                f"{self.base_url}/call/{endpoint}",
                params=params,
                headers={"X-Treg-Token": self.api_key, "X-Treg-Route-Max-Cost": str(self.max_cost_usd)},
                timeout=self.timeout,
            )
        except Exception as error:
            logger.warning(f"Treg LinkedIn (fiche) : échec ({type(error).__name__}).")
            return None
        return self._read_answer(response.status_code, lambda: response.json())

    def _request_cli_detail(self, job_id: str):
        command = [
            self.cli_path, "--json", "call", DETAIL_ENDPOINT, "--query", f"jobId={job_id}",
            "--header", f"X-Treg-Route-Max-Cost: {self.max_cost_usd}",
        ]
        try:
            done = self._run_cli(command, capture_output=True, text=True, timeout=self.timeout)
            wrapped = json.loads(done.stdout or "")
        except Exception as error:
            logger.warning(f"Treg LinkedIn (fiche) : échec du CLI ({type(error).__name__}).")
            return None
        status = (wrapped.get("_treg") or {}).get("http_status") or (200 if done.returncode == 0 else 0)
        return self._read_answer(status, lambda: wrapped.get("result"))

    # --- transport ---------------------------------------------------------------

    def _request(self, body: dict):
        if self.api_key:
            return self._request_http(body)
        return self._request_cli(body)

    def _request_http(self, body: dict):
        try:
            post = self._post
            if post is None:
                import requests
                post = requests.post
            response = post(
                f"{self.base_url}/call/{ENDPOINT}",
                json=body,
                headers={
                    "X-Treg-Token": self.api_key,
                    "X-Treg-Route-Max-Cost": str(self.max_cost_usd),
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        except Exception as error:  # network error, timeout
            logger.warning(f"Treg LinkedIn : échec ({type(error).__name__}).")
            return None
        return self._read_answer(response.status_code, lambda: response.json())

    def _request_cli(self, body: dict):
        command = [
            self.cli_path, "--json", "call", ENDPOINT, "--method", "POST",
            "--header", f"X-Treg-Route-Max-Cost: {self.max_cost_usd}", "--data", json.dumps(body),
        ]
        try:
            done = self._run_cli(command, capture_output=True, text=True, timeout=self.timeout)
        except Exception as error:
            logger.warning(f"Treg LinkedIn : échec du CLI ({type(error).__name__}).")
            return None
        try:
            wrapped = json.loads(done.stdout or "")
        except ValueError:
            logger.warning(f"Treg LinkedIn : sortie du CLI illisible (code {done.returncode}).")
            return None
        status = (wrapped.get("_treg") or {}).get("http_status") or (200 if done.returncode == 0 else 0)
        return self._read_answer(status, lambda: wrapped.get("result"))

    def _read_answer(self, status, read_body):
        if status == QUOTA_STATUS:
            self.exhausted = True
            logger.warning("Treg LinkedIn : quota atteint (429), source arrêtée pour ce passage.")
            return None
        if status != 200:
            logger.warning(f"Treg LinkedIn : échec (HTTP {status}).")
            return None
        try:
            payload = read_body()
        except ValueError:
            logger.warning("Treg LinkedIn : réponse JSON illisible.")
            return None
        return payload if isinstance(payload, dict) else None

    # --- normalization -----------------------------------------------------------

    @staticmethod
    def _normalize(raw, kind: str):
        if not isinstance(raw, dict):
            return None
        title = (raw.get("title") or "").strip()
        url = (raw.get("url") or "").strip()
        location = (raw.get("location") or "").strip()
        if not title or not url or not _is_cameroon(location):
            return None
        company = (raw.get("company") or "").strip() or None
        published_at = None
        created = raw.get("createdUtc")
        if isinstance(created, (int, float)) and created > 0:
            published_at = datetime.fromtimestamp(created, tz=timezone.utc).isoformat()
        label = "stage" if kind == "stage" else "emploi"
        # Only real fields: the filter needs text, and LinkedIn gives no description.
        parts = [title, company, location]
        snippet = " — ".join(p for p in parts if p) + f". Offre LinkedIn ({label}). Postuler : {url}"
        return {
            "platform": "LINKEDIN",
            "title": title,
            "company": company,
            "location": location,
            "url": url,
            "snippet": snippet,
            "description": None,
            "stipend": None,
            "flyer_url": None,
            "contact_email": None,
            "contact_whatsapp": None,
            "published_at": published_at,
            "source_id": f"linkedin:{raw.get('id') or url}",
            "kind_hint": label,
        }
