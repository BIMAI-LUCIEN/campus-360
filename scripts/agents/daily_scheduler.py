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

import config
from daily_cap import CAMEROON_TZ
from orchestrator import ScraperOrchestrator

WINDOW_START_HOUR = 10
WINDOW_END_HOUR = 12

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

def _window_end(started: datetime.datetime, duration_minutes: int) -> datetime.datetime:
    """The window closes at started + duration, and never after 12:00 Cameroon time."""
    noon = started.replace(hour=WINDOW_END_HOUR, minute=0, second=0, microsecond=0)
    return min(started + datetime.timedelta(minutes=duration_minutes), noon)


def run_harvesting_window(duration_minutes: int = 120, now_fn=None, sleep_fn=time.sleep, orchestrator=None, rng=random):
    """
    One scraping window: cycles over random sectors until 12:00 (Cameroon time), the end of
    `duration_minutes`, or the daily cap of added offers, whichever comes first.
    Each cycle is a real run (live=True): paid sources are allowed, capped per run.
    """
    now_fn = now_fn or (lambda: datetime.datetime.now(CAMEROON_TZ))
    orchestrator = orchestrator or ScraperOrchestrator()
    started = now_fn()
    end = _window_end(started, duration_minutes)
    logger.info(f"🚀 Fenêtre de scraping ouverte jusqu'à {end.strftime('%H:%M')} (heure du Cameroun).")

    cycle, total_reports, total_jobs = 1, 0, 0
    reason = "12 h atteint"
    while now_fn() < end:
        sector = rng.choice(CAMEROON_SECTORS)
        logger.info(f"\n--- [Cycle #{cycle}] Secteur : '{sector}' ---")
        summary = {}
        try:
            summary = orchestrator.run_full_pipeline(
                query=sector,
                platforms=list(config.DEFAULT_PLATFORMS),
                limit_per_platform=3,
                live=True,  # scheduled real run: paid sources allowed, capped per run
            )
            total_reports += summary.get("reports_saved", 0)
            total_jobs += summary.get("jobs_saved", 0)
            logger.info(f"Bilan Cycle #{cycle} : +{summary.get('jobs_saved', 0)} offres, +{summary.get('reports_saved', 0)} rapports.")
        except Exception as e:
            logger.error(f"Erreur durant le cycle #{cycle} : {e}")
        cycle += 1

        if summary.get("cap_reached"):
            reason = "plafond quotidien atteint"
            break
        if now_fn() < end:
            sleep_fn(rng.randint(20, 40))  # polite pause between cycles

    logger.info(f"🎉 Fenêtre close : {reason}. Total : {total_jobs} offres publiées, {total_reports} rapports indexés.")
    return {"cycles": cycle - 1, "reason": reason, "jobs": total_jobs, "reports": total_reports}


def should_start_window(now: datetime.datetime, last_run_date) -> bool:
    """True inside 10:00-12:00 (Cameroon time) when today's window has not run yet."""
    return WINDOW_START_HOUR <= now.hour < WINDOW_END_HOUR and last_run_date != now.date()


def start_scheduler_daemon(now_fn=None, sleep_fn=time.sleep, window_fn=None, max_checks=None):
    """
    Single daily trigger (decision of 2026-10-20): this daemon, running on the VPS.
    It reads Cameroon time itself, so the server's own time zone does not matter, and it
    starts the window once per day as soon as it is inside 10:00-12:00 (a restart at 10:35
    still runs today's window). The GitHub Actions schedule must stay off to avoid a
    second run.
    """
    now_fn = now_fn or (lambda: datetime.datetime.now(CAMEROON_TZ))
    window_fn = window_fn or run_harvesting_window
    logger.info("🕒 Planificateur Campus 360 actif : une fenêtre par jour, 10 h à 12 h (heure du Cameroun).")
    last_run_date, checks = None, 0
    while max_checks is None or checks < max_checks:
        checks += 1
        now = now_fn()
        if should_start_window(now, last_run_date):
            last_run_date = now.date()
            window_fn()
        else:
            sleep_fn(30)
    return last_run_date


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Campus 360 — Planificateur Quotidien de Scraping 10h-12h")
    parser.add_argument("--run-now", action="store_true", help="Lance immédiatement la session de 10h-12h sans attendre l'heure")
    parser.add_argument("--duration", type=int, default=120, help="Durée de la session en minutes (défaut: 120)")
    args = parser.parse_args()

    if args.run_now:
        run_harvesting_window(duration_minutes=args.duration)
    else:
        start_scheduler_daemon()
