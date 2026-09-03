"""
Campus 360 — Agent Spécialisé de Scraping d'Offres d'Emploi et Stages au Cameroun
Cible toutes les villes du Cameroun (Douala, Yaoundé, Bafoussam, Garoua, etc.)
et extrait les détails, contacts WhatsApp/Email et images de flyers.
"""

import re
import urllib.parse
import logging
import random
import xml.etree.ElementTree as ET
import requests
from config import USER_AGENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CameroonJobsAgent")

CAMEROON_CITIES = [
    "Douala",
    "Yaoundé",
    "Bafoussam",
    "Garoua",
    "Maroua",
    "Bamenda",
    "Buea",
    "Limbe",
    "Kribi",
    "Ngaoundéré",
    "Bertoua",
    "Ebolowa",
    "Dschang"
]

class CameroonJobsAgent:
    def __init__(self):
        self.session = requests.Session()

    def search_cameroon_jobs(self, query: str = "stage", max_results_per_query: int = 8) -> list:
        """
        Recherche des offres de stage et d'emploi spécifiquement localisées au Cameroun
        sur de multiples portails et réseaux sociaux.
        """
        results = []
        search_queries = [
            # Portails camerounais réputés
            f'site:emploi.cm ("{query}" OR "stage") Cameroun',
            f'site:minajobs.net ("{query}" OR "stage") Cameroun',
            f'site:cameroondesk.com ("{query}" OR "recrutement")',
            f'site:akwajobs.com ("{query}" OR "stage" OR "internship")',
            # LinkedIn Cameroun
            f'site:linkedin.com/posts ("offre de stage" OR "recrutement") "{query}" ("Douala" OR "Yaoundé" OR "Cameroun")',
            # Facebook Cameroun
            f'site:facebook.com ("offre de stage" OR "recrutement") "{query}" ("Douala" OR "Yaoundé" OR "Bafoussam")',
            # Dorks généraux avec contacts WhatsApp (très fréquents au Cameroun)
            f'"{query}" ("Douala" OR "Yaoundé") "Cameroun" ("WhatsApp" OR "envoyer CV") ("stage" OR "emploi")'
        ]

        for sq in search_queries:
            found = self._query_syndication(sq, limit=max_results_per_query)
            results.extend(found)

        # Déduplication par URL
        seen = set()
        deduped = []
        for r in results:
            if r["url"] not in seen:
                seen.add(r["url"])
                deduped.append(r)

        logger.info(f"Cameroon Jobs Agent : {len(deduped)} offres qualifiées identifiées au Cameroun.")
        return deduped

    def _query_syndication(self, query: str, limit: int) -> list:
        items = []
        encoded = urllib.parse.quote(query)
        rss_url = f"https://news.google.com/rss/search?q={encoded}&hl=fr&gl=CM&ceid=CM:fr"

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

                    title = title_el.text if title_el is not None else "Offre d'emploi au Cameroun"
                    raw_link = link_el.text if link_el is not None else ""
                    desc = desc_el.text if desc_el is not None else ""
                    pub_date = date_el.text if date_el is not None else ""

                    clean_title = re.sub(r" - [^-]+$", "", title).strip()
                    clean_desc = re.sub(r"<[^>]+>", "", desc).strip()

                    full_text = f"{clean_title} {clean_desc}"

                    # Extraction de la ville au Cameroun
                    city = self._detect_cameroon_city(full_text)

                    # Extraction de l'image / flyer si présente
                    flyer_url = self._extract_flyer_image_url(desc, full_text)

                    # Extraction du contact WhatsApp
                    whatsapp = self._extract_cameroon_phone(full_text)

                    # Extraction de l'email
                    email = self._extract_email(full_text)

                    items.append({
                        "platform": "CAMEROON_WEB",
                        "title": clean_title,
                        "url": raw_link,
                        "snippet": f"Lieu: {city}, Cameroun. Publié: {pub_date}. {clean_desc}"[:1200],
                        "location": f"{city}, Cameroun",
                        "city": city,
                        "flyer_url": flyer_url,
                        "contact_whatsapp": whatsapp,
                        "contact_email": email,
                        "pub_date": pub_date
                    })
        except Exception as e:
            logger.warning(f"Erreur de recherche d'offres Cameroun : {e}")

        return items

    def _detect_cameroon_city(self, text: str) -> str:
        """Détecte la ville camerounaise mentionnée dans l'offre."""
        for city in CAMEROON_CITIES:
            if re.search(r"\b" + re.escape(city) + r"\b", text, re.IGNORECASE):
                return city
        return "Douala" # Ville économique principale par défaut

    def _extract_flyer_image_url(self, raw_html: str, text: str) -> str:
        """Extrait l'URL d'un flyer ou d'une image d'offre."""
        # Dans les balises img
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+\.(?:png|jpg|jpeg|webp)[^"\']*)["\']', raw_html, re.IGNORECASE)
        if img_match:
            return img_match.group(1)
        # Dans le texte brut
        raw_img = re.search(r'https?://[^\s"\'<>]+\.(?:png|jpg|jpeg|webp)', text, re.IGNORECASE)
        if raw_img:
            return raw_img.group(0)
        return None

    def _extract_cameroon_phone(self, text: str) -> str:
        """Détecte un numéro de téléphone ou WhatsApp camerounais (+237 ou 6xxxxxxxx)."""
        # Format +237 6xx xx xx xx ou 2376xxxxxxxx ou 6xx-xx-xx-xx
        match = re.search(r"(?:\+?237\s*)?(6[5-9][0-9](?:[\s.-]?[0-9]{2}){3})", text)
        if match:
            clean_num = re.sub(r"[\s.-]", "", match.group(1))
            return f"+237{clean_num}"
        return None

    def _extract_email(self, text: str) -> str:
        match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
        if match:
            return match.group(0)
        return None
