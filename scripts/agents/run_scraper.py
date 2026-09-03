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

from orchestrator import ScraperOrchestrator

def main():
    parser = argparse.ArgumentParser(description="Campus 360 — Agent IA de Scraping de Rapports et Stages")
    parser.add_argument("--query", type=str, default="informatique", help="Mot-clé ou filière recherchée")
    parser.add_argument("--platforms", type=str, default="LINKEDIN,FACEBOOK,ACADEMIC_WEB", help="Plateformes séparées par des virgules")
    parser.add_argument("--limit", type=int, default=5, help="Nombre max de résultats par plateforme")

    args = parser.parse_args()
    selected_platforms = [p.strip().upper() for p in args.platforms.split(",") if p.strip()]

    print("================================================================")
    print("🤖 CAMPUS 360 — DÉPLOIEMENT DES AGENTS DE SCRAPING RÉSEAUX")
    print(f"🎯 Filière / Requête : {args.query}")
    print(f"🌐 Plateformes cibles : {', '.join(selected_platforms)}")
    print(f"📊 Limite par source : {args.limit}")
    print("================================================================\n")

    orchestrator = ScraperOrchestrator()
    summary = orchestrator.run_full_pipeline(
        query=args.query,
        platforms=selected_platforms,
        limit_per_platform=args.limit
    )

    print("\n================================================================")
    print("✨ RAPPORT D'EXÉCUTION DE LA MISSION")
    print(f"⏱️ Durée totale        : {summary['duration_seconds']}s")
    print(f"📥 Documents collectés : {summary['total_collected']}")
    print(f"🧠 Analyses IA faites  : {summary['total_analyzed']}")
    print(f"📚 Rapports sauvegardés: {summary['reports_saved']}")
    print(f"💼 Offres sauvegardées : {summary['jobs_saved']}")
    print("================================================================")

if __name__ == "__main__":
    main()
