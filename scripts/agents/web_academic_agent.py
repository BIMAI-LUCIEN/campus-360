"""
Campus 360 — Agent Spécialisé de Scraping Web Académique & Archives
Extrait des rapports de stage complets depuis GitHub, MemoireOnline et les dépôts ouverts.
"""

import re
import urllib.parse
import logging
import random
import xml.etree.ElementTree as ET
import requests
from config import USER_AGENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WebAcademicAgent")

class WebAcademicAgent:
    def __init__(self):
        self.session = requests.Session()

    def search_academic_reports(self, field: str = "informatique", max_results: int = 15) -> list:
        """
        Recherche des rapports de stage académiques complets via GitHub et dépôts ouverts.
        """
        results = []

        # 1. GitHub Repositories (Rapports complets réels rédigés par des étudiants)
        try:
            gh_items = self._query_github(field, limit=max_results // 2 + 1)
            results.extend(gh_items)
        except Exception as e:
            logger.warning(f"Erreur GitHub Search : {e}")

        # 2. Dépôts PDF et universités via Syndication
        try:
            pdf_items = self._query_pdf_syndication(field, limit=max_results - len(results))
            results.extend(pdf_items)
        except Exception as e:
            logger.warning(f"Erreur PDF Syndication : {e}")

        # Déduplication
        seen = set()
        deduped = []
        for r in results:
            if r["url"] not in seen:
                seen.add(r["url"])
                deduped.append(r)

        logger.info(f"Web Academic Agent : {len(deduped)} documents académiques qualifiés trouvés.")
        return deduped

    def _query_github(self, field: str, limit: int) -> list:
        """Interroge l'API GitHub pour récupérer des dépôts de rapports de stage."""
        items = []
        query = f"rapport de stage {field}"
        url = "https://api.github.com/search/repositories"
        params = {"q": query, "sort": "updated", "order": "desc", "per_page": min(limit, 30)}
        headers = {
            "User-Agent": "Campus360-Academic-Crawler",
            "Accept": "application/vnd.github.v3+json"
        }

        resp = self.session.get(url, params=params, headers=headers, timeout=12)
        if resp.status_code == 200:
            data = resp.json().get("items", [])
            for repo in data[:limit]:
                name = repo.get("name", "rapport-de-stage")
                desc = repo.get("description") or f"Rapport de stage académique {field} déposé sur GitHub."
                repo_url = repo.get("html_url")
                owner = repo.get("owner", {}).get("login", "")

                items.append({
                    "platform": "GITHUB_ACADEMIC",
                    "title": f"Rapport de Stage : {name.replace('-', ' ').title()}",
                    "url": repo_url,
                    "file_url": f"{repo_url}/archive/refs/heads/main.zip",
                    "snippet": f"Auteur: {owner}. Description: {desc}",
                    "author": owner
                })
        return items

    def _query_pdf_syndication(self, field: str, limit: int) -> list:
        """Interroge le flux d'archives PDF et universités."""
        items = []
        query = f'filetype:pdf "rapport de stage" "{field}"'
        encoded = urllib.parse.quote(query)
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=fr&gl=FR&ceid=FR:fr"

        resp = self.session.get(
            rss_url,
            headers={"User-Agent": random.choice(USER_AGENTS)},
            timeout=12
        )
        if resp.status_code == 200:
            root = ET.fromstring(resp.content)
            xml_items = root.findall(".//item")
            for item in xml_items[:limit]:
                title_el = item.find("title")
                link_el = item.find("link")
                desc_el = item.find("description")

                title = title_el.text if title_el is not None else "Rapport académique"
                raw_link = link_el.text if link_el is not None else ""
                desc = desc_el.text if desc_el is not None else ""

                clean_title = re.sub(r" - [^-]+$", "", title).strip()
                clean_desc = re.sub(r"<[^>]+>", "", desc).strip()

                items.append({
                    "platform": "ACADEMIC_ARCHIVE",
                    "title": clean_title,
                    "url": raw_link,
                    "file_url": raw_link,
                    "snippet": clean_desc[:1200]
                })
        return items
