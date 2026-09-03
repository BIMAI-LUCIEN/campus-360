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
from web_academic_agent import WebAcademicAgent
from ai_analyzer_agent import AIAnalyzerAgent
from database_ingestor import DatabaseIngestor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ScraperOrchestrator")

class ScraperOrchestrator:
    def __init__(self):
        self.linkedin_agent = LinkedInScraperAgent()
        self.facebook_agent = FacebookScraperAgent()
        self.web_agent = WebAcademicAgent()
        self.ai_agent = AIAnalyzerAgent()
        self.db_ingestor = DatabaseIngestor()

    def run_full_pipeline(self, query: str = "informatique", platforms: list = None, limit_per_platform: int = 5) -> dict:
        """
        Exécute le cycle complet : Collecte -> Analyse IA -> Sauvegarde.
        """
        if not platforms:
            platforms = ["LINKEDIN", "FACEBOOK", "ACADEMIC_WEB"]

        logger.info(f"🚀 Lancement de la mission de scraping multi-agents : Mot-clé='{query}', Plateformes={platforms}")
        start_time = time.time()

        # 1. Vérification des tables de base
        self.db_ingestor.ensure_tables()

        collected_items = []

        # 2. Phase de Collecte
        if "LINKEDIN" in platforms:
            try:
                li_items = self.linkedin_agent.search_linkedin_reports(query=f"rapport de stage {query}", max_results=limit_per_platform)
                collected_items.extend(li_items)
            except Exception as e:
                logger.error(f"Erreur Agent LinkedIn : {e}")

        if "FACEBOOK" in platforms:
            try:
                fb_items = self.facebook_agent.search_facebook_reports(query=f"rapport de stage {query}", max_results=limit_per_platform)
                collected_items.extend(fb_items)
            except Exception as e:
                logger.error(f"Erreur Agent Facebook : {e}")

        if "ACADEMIC_WEB" in platforms:
            try:
                web_items = self.web_agent.search_academic_reports(field=query, max_results=limit_per_platform)
                collected_items.extend(web_items)
            except Exception as e:
                logger.error(f"Erreur Agent Web Académique : {e}")

        logger.info(f"📥 Total documents collectés bruts : {len(collected_items)}")

        # 3. Phase d'Analyse IA et d'Ingestion
        reports_saved = 0
        jobs_saved = 0
        analyzed_results = []

        for idx, item in enumerate(collected_items, start=1):
            logger.info(f"[{idx}/{len(collected_items)}] Analyse IA de : {item['title'][:50]} ({item['platform']})")
            
            try:
                analysis = self.ai_agent.analyze_document_content(
                    text_snippet=item.get("snippet", ""),
                    source_title=item.get("title", ""),
                    source_url=item.get("url", ""),
                    platform=item.get("platform", "WEB")
                )
                
                analyzed_results.append({
                    "source": item,
                    "analysis": analysis
                })

                if not analysis.get("is_relevant"):
                    logger.info("⏩ Élément ignoré par l'IA (hors-sujet ou non académique).")
                    continue

                if analysis.get("is_offer") or analysis.get("document_type") == "OFFRE_DE_STAGE":
                    res = self.db_ingestor.save_stage_job(analysis, item)
                    if res.get("status") in ["job_inserted", "dry_run"]:
                        jobs_saved += 1
                else:
                    res = self.db_ingestor.save_stage_report(analysis, item)
                    if res.get("status") in ["success", "dry_run"]:
                        reports_saved += 1

            except Exception as e:
                logger.error(f"Erreur lors du traitement IA / Ingestion de l'élément : {e}")

        duration = round(time.time() - start_time, 2)
        summary = {
            "query": query,
            "duration_seconds": duration,
            "total_collected": len(collected_items),
            "total_analyzed": len(analyzed_results),
            "reports_saved": reports_saved,
            "jobs_saved": jobs_saved,
            "platforms": platforms
        }

        logger.info(f"🏁 Mission terminée en {duration}s : {reports_saved} rapports enregistrés, {jobs_saved} offres enregistrées.")
        return summary
