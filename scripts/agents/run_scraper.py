"""
Campus 360 — Point d'Entrée CLI pour les Agents de Scraping Réseaux & Web
Exemple d'utilisation :
  python scripts/agents/run_scraper.py --query "génie logiciel" --limit 5
  python scripts/agents/run_scraper.py --platforms linkedin,facebook --query "comptabilité"
"""

import argparse
import sys
import os

# Ajout du dossier au PYTHONPATH et encodage UTF-8 pour Windows
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import config
import json
from contextlib import nullcontext
from pathlib import Path

from orchestrator import ScraperOrchestrator

def main(argv=None):
    parser = argparse.ArgumentParser(description="Campus 360 — Agent IA de Scraping de Rapports et Stages")
    parser.add_argument("--query", type=str, default="informatique", help="Mot-clé ou filière recherchée")
    parser.add_argument("--platforms", type=str, default=",".join(config.DEFAULT_PLATFORMS), help="Plateformes séparées par des virgules")
    parser.add_argument("--limit", type=int, default=5, help="Nombre max de résultats par plateforme")
    parser.add_argument("--dry-run", action="store_true", help="Analyse sans rien écrire en base")
    parser.add_argument("--live", action="store_true", help="Autorise les sources payantes (Treg) pour ce passage")
    parser.add_argument("--no-db", action="store_true", help="Dry-run sans aucune connexion à la base (ni lecture)")
    parser.add_argument("--from-fixture", type=Path, default=None, help="Items lus dans un jeu étiqueté au lieu de la collecte réseau")
    parser.add_argument("--offline-llm", action="store_true", help="Faux modèle : aucun appel au modèle (payant)")
    parser.add_argument("--city", type=str, default=None, help="Ville ou région ciblée au Cameroun (ex: Bafoussam, Buea, Garoua, Douala, Yaoundé, Kribi)")

    args = parser.parse_args(argv)
    if args.live and args.dry_run:
        print("--live est incompatible avec --dry-run.")
        return 2
    if args.no_db and not args.dry_run:
        print("--no-db exige --dry-run.")
        return 2
    selected_platforms = [p.strip().upper() for p in args.platforms.split(",") if p.strip()]

    print("================================================================")
    print("🤖 CAMPUS 360 — DÉPLOIEMENT DES AGENTS DE SCRAPING RÉSEAUX")
    print(f"🎯 Filière / Requête : {args.query}")
    if args.city:
        print(f"📍 Ville / Région     : {args.city}")
    print(f"🌐 Plateformes cibles : {', '.join(selected_platforms)}")
    print(f"📊 Limite par source : {args.limit}")
    print("================================================================\n")

    preloaded = None
    if args.from_fixture:
        from evaluate_pipeline import fixture_items
        preloaded = fixture_items(json.loads(args.from_fixture.read_text(encoding="utf-8")))
    llm_guard = nullcontext()
    if args.offline_llm:
        from evaluate_pipeline import offline_llm
        llm_guard = offline_llm()

    orchestrator = ScraperOrchestrator()
    with llm_guard:
        summary = orchestrator.run_full_pipeline(
            query=args.query,
            city=args.city,
            platforms=selected_platforms,
            limit_per_platform=args.limit,
            dry_run=args.dry_run,
            live=args.live,
            use_db=not args.no_db,
            preloaded_items=preloaded,
        )

    print("\n================================================================")
    print("✨ RAPPORT D'EXÉCUTION DE LA MISSION")
    print(f"⏱️ Durée totale        : {summary['duration_seconds']}s")
    print(f"📥 Documents collectés : {summary['total_collected']}")
    print(f"🧠 Analyses IA faites  : {summary['total_analyzed']}")
    print(f"📚 Rapports sauvegardés: {summary['reports_saved']}")
    print(f"💼 Offres par statut   : {summary['offers_by_status']}")
    statuses = summary["offers_by_status"]
    print(f"collected: {summary['total_collected']}")
    for key in ("published", "pending_review", "rejected", "deferred"):
        print(f"{key}: {statuses.get(key, 0)}")
    print(f"cap_reached: {summary.get('cap_reached')}")
    print(f"added_today: {summary.get('added_today')}")
    if args.dry_run:
        print("Dry-run : aucune écriture en base.")
    print("================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
