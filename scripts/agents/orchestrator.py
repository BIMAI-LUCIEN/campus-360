"""
Campus 360 — Orchestrateur Multi-Agents
Coordonne les agents de collecte (LinkedIn, Facebook, Web Académique),
l'agent d'analyse IA et l'agent d'ingestion en base de données.
"""

import time
import logging
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from linkedin_agent import LinkedInScraperAgent
from facebook_agent import FacebookScraperAgent
from apify_agent import ApifyScraperAgent
from web_academic_agent import WebAcademicAgent
from cameroon_jobs_agent import CameroonJobsAgent
from ocr_flyer_agent import OCRFlyerAgent
from ai_analyzer_agent import AIAnalyzerAgent
from database_ingestor import DatabaseIngestor
from job_store import JobStore
from offer_pipeline import process as process_offer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ScraperOrchestrator")

class ScraperOrchestrator:
    def __init__(self):
        self.linkedin_agent = LinkedInScraperAgent()
        self.facebook_agent = FacebookScraperAgent()
        self.apify_agent = ApifyScraperAgent()
        self.web_agent = WebAcademicAgent()
        self.cameroon_agent = CameroonJobsAgent()
        self.ocr_agent = OCRFlyerAgent()
        self.ai_agent = AIAnalyzerAgent()
        self.db_ingestor = DatabaseIngestor()

    def run_full_pipeline(self, query: str = "informatique", platforms: list = None, limit_per_platform: int = 5, city: str = None, dry_run: bool = False) -> dict:
        """
        Exécute le cycle complet : Collecte -> Analyse IA -> Sauvegarde.
        """
        if not platforms:
            platforms = ["CAMEROON_JOBS", "LINKEDIN", "FACEBOOK", "TIKTOK", "ACADEMIC_WEB"]

        loc_label = f" (Cible: {city})" if city else " (National / Toutes régions)"
        logger.info(f"🚀 Lancement mission multi-agents : Mot-clé='{query}', Région={loc_label}, Plateformes={platforms}")
        start_time = time.time()

        # 1. Vérification des tables de base
        if not dry_run:
            self.db_ingestor.ensure_tables()

        collected_items = []

        # 2. Phase de Collecte
        if "CAMEROON_JOBS" in platforms:
            try:
                cam_items = self.cameroon_agent.search_cameroon_jobs(query=query, city=city, max_results_per_query=limit_per_platform)
                collected_items.extend(cam_items)
            except Exception as e:
                logger.error(f"Erreur Agent Cameroun Jobs : {e}")

        # Requête ciblée avec ville si spécifiée
        city_suffix = f" {city}" if city else ""

        if "LINKEDIN" in platforms:
            try:
                li_items = []
                if self.apify_agent.is_configured():
                    li_items = self.apify_agent.scrape_linkedin_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                if not li_items:
                    li_items = self.linkedin_agent.search_linkedin_reports(query=f"rapport de stage {query}{city_suffix}", max_results=limit_per_platform)
                collected_items.extend(li_items)
            except Exception as e:
                logger.error(f"Erreur Agent LinkedIn : {e}")

        if "FACEBOOK" in platforms:
            try:
                fb_items = []
                if self.apify_agent.is_configured():
                    fb_items = self.apify_agent.scrape_facebook_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                if not fb_items:
                    fb_items = self.facebook_agent.search_facebook_reports(query=f"rapport de stage {query}{city_suffix}", max_results=limit_per_platform)
                collected_items.extend(fb_items)
            except Exception as e:
                logger.error(f"Erreur Agent Facebook : {e}")

        if "TIKTOK" in platforms:
            try:
                if self.apify_agent.is_configured():
                    tt_items = self.apify_agent.scrape_tiktok_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                    collected_items.extend(tt_items)
            except Exception as e:
                logger.error(f"Erreur Agent TikTok : {e}")

        if "ACADEMIC_WEB" in platforms:
            try:
                web_items = self.web_agent.search_academic_reports(field=query, max_results=limit_per_platform)
                collected_items.extend(web_items)
            except Exception as e:
                logger.error(f"Erreur Agent Web Académique : {e}")

        logger.info(f"📥 Total documents collectés bruts : {len(collected_items)}")

        # 3. Analysis: offers go through the 4-agent pipeline, academic documents through the report analyzer.
        reports_saved = 0
        statuses = {"published": 0, "pending_review": 0, "rejected": 0, "deferred": 0}
        store = JobStore(dry_run=dry_run)
        existing = store.recent_offers()

        try:
            for idx, item in enumerate(collected_items, start=1):
                logger.info(f"[{idx}/{len(collected_items)}] {item.get('title', '')[:50]} ({item.get('platform')})")
                self._enrich_with_flyer(item)
                try:
                    if self._is_report_candidate(item):
                        analysis = self.ai_agent.analyze_document_content(
                            text_snippet=item.get("snippet", ""),
                            source_title=item.get("title", ""),
                            source_url=item.get("url", ""),
                            platform=item.get("platform", "WEB"),
                        )
                        if analysis.get("is_relevant") and analysis.get("document_type") in ("RAPPORT_DE_STAGE", "MEMOIRE"):
                            if dry_run:
                                reports_saved += 1
                            elif self.db_ingestor.save_stage_report(analysis, item).get("status") == "success":
                                reports_saved += 1
                        continue

                    result = process_offer(item, store, existing)
                    statuses[result["status"]] = statuses.get(result["status"], 0) + 1
                    logger.info(f"   -> {result['status']} ({result.get('kind')}, {result.get('confidence')}) : {result.get('reason')}")
                    if result["status"] == "published" and not dry_run:
                        self._notify_published(result, item)
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de l'élément : {e}")
        finally:
            store.close()

        duration = round(time.time() - start_time, 2)
        summary = {
            "query": query,
            "duration_seconds": duration,
            "total_collected": len(collected_items),
            "total_analyzed": len(collected_items),
            "reports_saved": reports_saved,
            "jobs_saved": statuses["published"],
            "offers_by_status": statuses,
            "dry_run": dry_run,
            "platforms": platforms
        }

        logger.info(f"🏁 Mission terminée en {duration}s : {reports_saved} rapports, offres {statuses}.")
        return summary

    def _is_report_candidate(self, item: dict) -> bool:
        text = f"{item.get('title', '')} {item.get('snippet', '')}".lower()
        return item.get("platform") == "ACADEMIC_WEB" or "rapport de stage" in text or "mémoire" in text

    def _enrich_with_flyer(self, item: dict):
        """Reads the flyer when the post text is too short to analyze."""
        if not item.get("flyer_url") or len(item.get("snippet", "")) >= 200:
            return
        try:
            ocr_res = self.ocr_agent.read_flyer(item["flyer_url"], item.get("snippet", ""))
            if ocr_res.get("success") and ocr_res.get("data"):
                extracted = ocr_res["data"].get("raw_text_extracted", "")
                item["snippet"] = f"{item.get('snippet', '')}\n{extracted}"
        except Exception as ocr_err:
            logger.debug(f"Erreur OCR flyer ignorée : {ocr_err}")

    def _notify_published(self, result: dict, item: dict):
        try:
            from in_app_push_notifier_agent import InAppPushNotifierAgent
            InAppPushNotifierAgent().notify_new_stage_job(
                job_title=result.get("title", ""), company=item.get("company") or "", location=item.get("location") or "Cameroun",
                job_id=result.get("job_id"),
            )
        except Exception as push_err:
            logger.debug(f"Push notification ignorée : {push_err}")
