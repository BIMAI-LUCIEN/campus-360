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
import config
from linkedin_agent import LinkedInScraperAgent
from treg_linkedin_agent import TregLinkedInAgent
from facebook_agent import FacebookScraperAgent
from apify_agent import ApifyScraperAgent
from web_academic_agent import WebAcademicAgent
from cameroon_jobs_agent import CameroonJobsAgent
from ocr_flyer_agent import OCRFlyerAgent
from ai_analyzer_agent import AIAnalyzerAgent
from database_ingestor import DatabaseIngestor
from job_store import JobStore
from offer_pipeline import process as process_offer
from company_check_agent import CompanyCheckAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ScraperOrchestrator")

class ScraperOrchestrator:
    def __init__(self):
        self.linkedin_agent = LinkedInScraperAgent()
        self.treg_linkedin_agent = TregLinkedInAgent()
        self.facebook_agent = FacebookScraperAgent()
        self.apify_agent = ApifyScraperAgent()
        self.web_agent = WebAcademicAgent()
        self.cameroon_agent = CameroonJobsAgent()
        self.ocr_agent = OCRFlyerAgent()
        self.ai_agent = AIAnalyzerAgent()
        self.db_ingestor = DatabaseIngestor()
        self.company_checker = CompanyCheckAgent()

    def run_full_pipeline(self, query: str = "informatique", platforms: list = None, limit_per_platform: int = 5, city: str = None, dry_run: bool = False, live: bool = False, use_db: bool = True, preloaded_items: list = None) -> dict:
        """
        Exécute le cycle complet : Collecte -> Analyse IA -> Sauvegarde.
        """
        if not platforms:
            platforms = list(config.DEFAULT_PLATFORMS)

        # Paid sources (Treg) are called only on a real run: never in dry-run, never without --live.
        self.treg_linkedin_agent.live = live and not dry_run
        self.treg_linkedin_agent.reset_run()

        loc_label = f" (Cible: {city})" if city else " (National / Toutes régions)"
        logger.info(f"🚀 Lancement mission multi-agents : Mot-clé='{query}', Région={loc_label}, Plateformes={platforms}")
        start_time = time.time()

        # 1. Vérification des tables de base
        if not dry_run:
            self.db_ingestor.ensure_tables()

        # Daily cap, expiry and run journal (decisions 11 to 13). The cap is checked before
        # collecting, so no paid call is made once today's offers are in.
        cap = config.DAILY_OFFER_CAP
        store = JobStore(dry_run=dry_run, connect=use_db or not dry_run)
        run_id = store.start_run(platforms) if not dry_run else None
        if not dry_run:
            store.expire_due_offers()
        added_today = store.count_added_today()
        cap_reached = added_today >= cap
        if cap_reached:
            logger.info(f"Plafond quotidien atteint ({added_today}/{cap} offres ajoutées aujourd'hui) : collecte sautée.")
        # Offline runs (tests, --from-fixture) bring their own items: no network collection.
        collect_platforms = [] if cap_reached or preloaded_items is not None else platforms

        collected_items = list(preloaded_items or [])

        # 2. Phase de Collecte
        if "CAMEROON_JOBS" in collect_platforms:
            try:
                cam_items = self.cameroon_agent.search_cameroon_jobs(query=query, city=city, max_results_per_query=limit_per_platform)
                collected_items.extend(cam_items)
            except Exception as e:
                logger.error(f"Erreur Agent Cameroun Jobs : {e}")

        # Requête ciblée avec ville si spécifiée
        city_suffix = f" {city}" if city else ""

        if "LINKEDIN" in collect_platforms:
            try:
                # Order (decision 17): Treg (internships, then jobs), then Apify, then the RSS fallback.
                li_items = []
                if self.treg_linkedin_agent.live and self.treg_linkedin_agent.is_configured():
                    li_items.extend(self.treg_linkedin_agent.search_jobs(query=query, kind="stage", max_results=limit_per_platform))
                    li_items.extend(self.treg_linkedin_agent.search_jobs(query=query, kind="emploi", max_results=limit_per_platform))
                    # Full posting, word for word (description, salary): one detail call per offer.
                    self.treg_linkedin_agent.fetch_details(li_items)
                elif "LINKEDIN" in platforms and not self.treg_linkedin_agent.is_configured():
                    logger.info("LinkedIn : Treg non configuré, passage aux sources de secours.")
                if not li_items and self.apify_agent.is_configured():
                    li_items = self.apify_agent.scrape_linkedin_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                if not li_items:
                    li_items = self.linkedin_agent.search_linkedin_reports(query=f"rapport de stage {query}{city_suffix}", max_results=limit_per_platform)
                collected_items.extend(li_items)
            except Exception as e:
                logger.error(f"Erreur Agent LinkedIn : {e}")

        if "FACEBOOK" in collect_platforms:
            try:
                fb_items = []
                if self.apify_agent.is_configured():
                    fb_items = self.apify_agent.scrape_facebook_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                if not fb_items:
                    fb_items = self.facebook_agent.search_facebook_reports(query=f"rapport de stage {query}{city_suffix}", max_results=limit_per_platform)
                collected_items.extend(fb_items)
            except Exception as e:
                logger.error(f"Erreur Agent Facebook : {e}")

        if "TIKTOK" in collect_platforms:
            try:
                if self.apify_agent.is_configured():
                    tt_items = self.apify_agent.scrape_tiktok_posts(query=f"stage {query}{city_suffix} Cameroun", limit=limit_per_platform)
                    collected_items.extend(tt_items)
            except Exception as e:
                logger.error(f"Erreur Agent TikTok : {e}")

        if "ACADEMIC_WEB" in collect_platforms:
            try:
                web_items = self.web_agent.search_academic_reports(field=query, max_results=limit_per_platform)
                collected_items.extend(web_items)
            except Exception as e:
                logger.error(f"Erreur Agent Web Académique : {e}")

        logger.info(f"📥 Total documents collectés bruts : {len(collected_items)}")

        # 3. Analysis: offers go through the 4-agent pipeline, academic documents through the report analyzer.
        reports_saved = 0
        statuses = {"published": 0, "pending_review": 0, "rejected": 0, "deferred": 0}
        existing = store.recent_offers()
        run_error = None
        # Field check (agent 5): paid Google search per company, so only on a real --live run.
        self.company_checker.live = live and not dry_run
        self.company_checker.known_company = getattr(store, "known_company", None)
        self.company_checker.reset_run()

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

                    if added_today >= cap:
                        cap_reached = True
                        logger.info(f"Plafond quotidien de {cap} offres atteint : éléments restants non traités.")
                        break
                    result = process_offer(item, store, existing, checker=self.company_checker)
                    statuses[result["status"]] = statuses.get(result["status"], 0) + 1
                    if result["status"] in ("published", "pending_review"):
                        added_today += 1
                    logger.info(f"   -> {result['status']} ({result.get('kind')}, {result.get('confidence')}) : {result.get('reason')}")
                    if result["status"] == "published" and not dry_run:
                        self._notify_published(result, item)
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de l'élément : {e}")
        except Exception as error:
            run_error = f"{type(error).__name__}: {error}"
            raise
        finally:
            store.finish_run(run_id, len(collected_items), statuses, cap_reached, run_error)
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
            "platforms": platforms,
            "added_today": added_today,
            "cap_reached": cap_reached,
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
