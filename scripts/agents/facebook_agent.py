"""
Campus 360 — Agent Spécialisé de Scraping Facebook
Cible les publications, groupes universitaires et documents de stage partagés sur Facebook.
"""

import re
import urllib.parse
import logging
import random
import xml.etree.ElementTree as ET
import requests
from config import USER_AGENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("FacebookAgent")

class FacebookScraperAgent:
    def __init__(self):
        self.session = requests.Session()

    def search_facebook_reports(self, query: str = "rapport de stage", max_results: int = 10) -> list:
        """
        Recherche des publications Facebook partageant des rapports de stage ou offres.
        """
        results = []
        search_terms = [
            f'site:facebook.com "rapport de stage" {query}',
            f'site:facebook.com/groups "rapport de stage" "{query}"',
            f'site:facebook.com "stage" "{query}" "recrutement"'
        ]

        for term in search_terms:
            if len(results) >= max_results:
                break
            found = self._query_syndication(term, max_results - len(results))
            results.extend(found)

        seen = set()
        deduped = []
        for r in results:
            if r["url"] not in seen:
                seen.add(r["url"])
                deduped.append(r)

        logger.info(f"Facebook Agent : {len(deduped)} publications qualifiées récupérées.")
        return deduped

    def _query_syndication(self, query: str, limit: int) -> list:
        items = []
        encoded = urllib.parse.quote(query)
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=fr&gl=FR&ceid=FR:fr"

        try:
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
                    date_el = item.find("pubDate")

                    title = title_el.text if title_el is not None else "Publication Facebook"
                    raw_link = link_el.text if link_el is not None else ""
                    desc = desc_el.text if desc_el is not None else ""
                    pub_date = date_el.text if date_el is not None else ""

                    clean_title = re.sub(r" - [^-]+$", "", title).strip()
                    clean_desc = re.sub(r"<[^>]+>", "", desc).strip()
                    file_url = self._extract_file_url(f"{clean_title} {clean_desc}", raw_link)

                    items.append({
                        "platform": "FACEBOOK",
                        "title": clean_title,
                        "url": raw_link,
                        "file_url": file_url,
                        "snippet": f"Publié le {pub_date}. {clean_desc}"[:1200],
                        "pub_date": pub_date
                    })
        except Exception as e:
            logger.warning(f"Erreur de syndication Facebook : {e}")

        return items

    def _extract_file_url(self, text: str, fallback_url: str) -> str:
        drive_match = re.search(r"https://drive\.google\.com/[^\s\"'>]+", text)
        if drive_match:
            return drive_match.group(0)
        pdf_match = re.search(r"https?://[^\s\"'>]+\.pdf", text)
        if pdf_match:
            return pdf_match.group(0)
        return fallback_url
