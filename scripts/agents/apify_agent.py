"""
Campus 360 — Agent de Scraping Réseaux Sociaux via Apify Cloud
Récupère automatiquement les publications Facebook, LinkedIn & TikTok avec extraction d'images (flyers de stage/emploi).
"""

import os
import logging
import requests
from typing import List, Dict, Any
from config import APIFY_API_TOKEN, USER_AGENTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ApifyScraperAgent")

class ApifyScraperAgent:
    def __init__(self, api_token: str = None):
        self.api_token = api_token or APIFY_API_TOKEN or os.getenv("APIFY_API_TOKEN", "")
        self.session = requests.Session()

    def is_configured(self) -> bool:
        """Vérifie si le jeton API Apify est renseigné."""
        return bool(self.api_token and self.api_token.strip())

    def scrape_linkedin_posts(self, query: str = "stage informatique Douala Yaounde", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Exécute l'Actor Apify pour extraire posts et images sur LinkedIn.
        """
        if not self.is_configured():
            logger.warning("⚠️ APIFY_API_TOKEN non configuré. Veuillez l'ajouter dans .env.local pour le scraping Cloud.")
            return []

        logger.info(f"🌐 Lancement du scraping LinkedIn Cloud via Apify (requête: '{query}', max: {limit})...")
        
        # Test des endpoints d'Actors Apify LinkedIn (curious_coder/clockworks/apify)
        actors = ["clockworks~linkedin-post-scraper", "apify~linkedin-post-scraper"]
        
        for actor_id in actors:
            url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={self.api_token}&timeout=120"
            payload = {
                "queries": [query],
                "searchQueries": [query],
                "urls": [f"https://www.linkedin.com/search/results/content/?keywords={query}"],
                "maxPosts": limit,
                "deepScrape": True
            }

            try:
                resp = self.session.post(url, json=payload, timeout=130)
                if resp.status_code in [200, 201]:
                    raw_items = resp.json()
                    if raw_items and isinstance(raw_items, list):
                        return self._parse_linkedin_items(raw_items)
            except Exception as e:
                logger.debug(f"Essai actor {actor_id} LinkedIn non concluant : {e}")

        logger.info("ℹ️ Aucun résultat Apify direct pour LinkedIn. Passage au scraper de syndication natif.")
        return []

    def scrape_facebook_posts(self, query: str = "recrutement stagiaire Douala Yaounde", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Exécute l'Actor Apify pour extraire posts, flyers et images sur Facebook.
        """
        if not self.is_configured():
            logger.warning("⚠️ APIFY_API_TOKEN non configuré.")
            return []

        logger.info(f"🌐 Lancement du scraping Facebook Cloud via Apify (requête: '{query}', max: {limit})...")

        actor_id = "apify~facebook-posts-scraper"
        url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={self.api_token}&timeout=120"

        payload = {
            "startUrls": [{"url": f"https://www.facebook.com/search/posts?q={query}"}],
            "searchTerms": [query],
            "maxPosts": limit,
            "resultsType": "posts"
        }

        try:
            resp = self.session.post(url, json=payload, timeout=130)
            if resp.status_code in [200, 201]:
                raw_items = resp.json()
                if raw_items and isinstance(raw_items, list):
                    return self._parse_facebook_items(raw_items)
        except Exception as e:
            logger.error(f"❌ Exception lors du scraping Apify Facebook : {e}")

        return []

    def scrape_tiktok_posts(self, query: str = "stage Cameroun Douala Yaounde", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Exécute l'Actor Apify TikTok Scraper pour extraire les vidéos, textes et miniatures (flyers/couvertures) sur TikTok.
        """
        if not self.is_configured():
            logger.warning("⚠️ APIFY_API_TOKEN non configuré pour TikTok.")
            return []

        logger.info(f"🎵 Lancement du scraping TikTok Cloud via Apify (requête: '{query}', max: {limit})...")

        actor_id = "clockworks~free-tiktok-scraper"
        url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={self.api_token}&timeout=120"

        payload = {
            "searchQueries": [query],
            "resultsPerPage": limit,
            "searchType": "video"
        }

        try:
            resp = self.session.post(url, json=payload, timeout=130)
            if resp.status_code in [200, 201]:
                raw_items = resp.json()
                if raw_items and isinstance(raw_items, list):
                    return self._parse_tiktok_items(raw_items)
            else:
                logger.error(f"❌ Erreur HTTP Apify TikTok ({resp.status_code}) : {resp.text[:300]}")
        except Exception as e:
            logger.error(f"❌ Exception lors du scraping Apify TikTok : {e}")

        return []

    def _parse_linkedin_items(self, raw_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in raw_items:
            post_url = item.get("postUrl") or item.get("url") or item.get("link") or ""
            text = item.get("text") or item.get("postText") or item.get("title") or ""
            
            # Extraction des images / flyers du post
            images = []
            if item.get("images") and isinstance(item["images"], list):
                images = item["images"]
            elif item.get("media") and isinstance(item["media"], list):
                images = [m.get("url") for m in item["media"] if isinstance(m, dict) and m.get("url")]
            elif item.get("attachedImage") or item.get("fullImage"):
                images = [item.get("attachedImage") or item.get("fullImage")]

            primary_image = images[0] if images else None

            results.append({
                "platform": "LINKEDIN",
                "title": text[:120].strip() or "Publication LinkedIn",
                "url": post_url,
                "snippet": text,
                "flyer_url": primary_image,
                "images": images,
                "author": item.get("authorName") or item.get("author") or "Inconnu",
                "pub_date": item.get("publishedAt") or item.get("time") or ""
            })
        logger.info(f"✅ Apify LinkedIn : {len(results)} posts extraits ({sum(1 for r in results if r['flyer_url'])} avec images).")
        return results

    def _parse_facebook_items(self, raw_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in raw_items:
            post_url = item.get("url") or item.get("postUrl") or ""
            text = item.get("text") or item.get("message") or ""
            
            images = []
            if item.get("media") and isinstance(item["media"], list):
                for m in item["media"]:
                    if isinstance(m, dict) and m.get("thumbnail"):
                        images.append(m["thumbnail"])
                    elif isinstance(m, str):
                        images.append(m)
            elif item.get("image") or item.get("attachedImage"):
                images = [item.get("image") or item.get("attachedImage")]

            primary_image = images[0] if images else None

            results.append({
                "platform": "FACEBOOK",
                "title": text[:120].strip() or "Publication Facebook",
                "url": post_url,
                "snippet": text,
                "flyer_url": primary_image,
                "images": images,
                "author": item.get("user", {}).get("name") if isinstance(item.get("user"), dict) else item.get("author", "Inconnu"),
                "pub_date": item.get("time") or item.get("date") or ""
            })
        logger.info(f"✅ Apify Facebook : {len(results)} posts extraits ({sum(1 for r in results if r['flyer_url'])} avec images).")
        return results

    def _parse_tiktok_items(self, raw_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in raw_items:
            post_url = item.get("webVideoUrl") or item.get("url") or item.get("videoUrl") or ""
            text = item.get("text") or item.get("desc") or item.get("title") or ""
            
            # Extraction des images de couverture / vignettes TikTok (convertibles en OCR)
            cover_url = item.get("video", {}).get("cover") or item.get("video", {}).get("originCover") or item.get("cover") or item.get("thumbnail")
            
            author = item.get("authorMeta", {}).get("name") if isinstance(item.get("authorMeta"), dict) else item.get("author", "TikTok User")

            results.append({
                "platform": "TIKTOK",
                "title": text[:120].strip() or "Vidéo TikTok Offre de Stage",
                "url": post_url,
                "snippet": text,
                "flyer_url": cover_url,
                "images": [cover_url] if cover_url else [],
                "author": author,
                "pub_date": item.get("createTime") or ""
            })
        logger.info(f"✅ Apify TikTok : {len(results)} vidéos extraites ({sum(1 for r in results if r['flyer_url'])} avec miniatures/images).")
        return results
