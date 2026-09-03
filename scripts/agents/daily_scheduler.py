"""
Campus 360 — Planificateur Quotidien Autonome (10h00 -> 12h00)
Exécute chaque jour une session de scraping intensif ciblant le Cameroun (toutes les villes)
et les rapports de stage entre 10h et 12h.
"""

import time
import datetime
import logging
import sys
import argparse
import random

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from orchestrator import ScraperOrchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DailyScheduler")

CAMEROON_SECTORS = [
    "informatique génie logiciel",
    "réseaux télécommunications",
    "comptabilité gestion finance",
    "marketing communication vente",
    "génie civil BTP",
    "ressources humaines",
    "logistique transport",
    "droit des affaires",
    "agroalimentaire agronomie",
    "santé sciences infirmières",
    "banque microfinance assurance"
]

def run_harvesting_window(duration_minutes: int = 120):
    """
    Exécute une session continue de scraping pendant duration_minutes (par défaut 2 heures).
    Alterne intelligemment les secteurs, mots-clés et plateformes avec des pauses de courtoisie.
    """
    orchestrator = ScraperOrchestrator()
    end_time = time.time() + (duration_minutes * 60)

    logger.info(f"🚀 Démarrage de la fenêtre de scraping intensif Cameroun ({duration_minutes} minutes)...")

    cycle = 1
    total_reports = 0
    total_jobs = 0

    while time.time() < end_time:
        remaining_minutes = max(0, int((end_time - time.time()) / 60))
        # Sélection aléatoire de 2 secteurs pour varier la couverture
        sector = random.choice(CAMEROON_SECTORS)

        logger.info(f"\n--- [Cycle #{cycle}] Secteur : '{sector}' | Temps restant : {remaining_minutes} min ---")
        
        try:
            summary = orchestrator.run_full_pipeline(
                query=sector,
                platforms=["CAMEROON_JOBS", "LINKEDIN", "FACEBOOK", "ACADEMIC_WEB"],
                limit_per_platform=3
            )
            total_reports += summary.get("reports_saved", 0)
            total_jobs += summary.get("jobs_saved", 0)
            logger.info(f"Bilan Cycle #{cycle} : +{summary.get('jobs_saved', 0)} offres, +{summary.get('reports_saved', 0)} rapports.")
        except Exception as e:
            logger.error(f"Erreur durant le cycle #{cycle} : {e}")

        cycle += 1

        # Pause polie entre 20 et 40 secondes pour éviter tout blocage réseau
        if time.time() < end_time:
            sleep_time = random.randint(20, 40)
            logger.info(f"⏳ Pause de {sleep_time}s avant la prochaine itération...")
            time.sleep(sleep_time)

    logger.info(f"🎉 Fenêtre quotidienne de 10h-12h terminée ! Total cumulé : {total_jobs} offres insérées, {total_reports} rapports indexés.")

def start_scheduler_daemon():
    """
    Boucle infinie surveillant l'heure locale. Déclenche automatiquement le scraping à 10h00 chaque jour.
    """
    logger.info("🕒 Démon de planification Campus 360 activé. En attente du créneau quotidien 10h00 - 12h00...")
    while True:
        now = datetime.datetime.now()
        # Heure de déclenchement : 10h00 (heure locale Cameroun UTC+1)
        if now.hour == 10 and now.minute == 0:
            logger.info("🔔 IL EST 10H00 ! Démarrage de la session quotidienne de 2 heures...")
            run_harvesting_window(duration_minutes=120)
            logger.info("Session terminée. Repos jusqu'au lendemain 10h00.")
            # Attendre 1 heure pour ne pas redéclencher dans la même minute
            time.sleep(3600)
        else:
            # Vérification toutes les 30 secondes
            time.sleep(30)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Campus 360 — Planificateur Quotidien de Scraping 10h-12h")
    parser.add_argument("--run-now", action="store_true", help="Lance immédiatement la session de 10h-12h sans attendre l'heure")
    parser.add_argument("--duration", type=int, default=120, help="Durée de la session en minutes (défaut: 120)")
    args = parser.parse_args()

    if args.run_now:
        run_harvesting_window(duration_minutes=args.duration)
    else:
        start_scheduler_daemon()
