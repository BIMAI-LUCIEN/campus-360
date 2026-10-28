"""
Campus 360 — Configuration pour les Agents de Scraping Réseaux & Web
"""

import os
from pathlib import Path

# Résolution automatique des fichiers d'environnement
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILES = [
    BASE_DIR / ".env.local",
    BASE_DIR / "mobile-api" / ".env.local",
    BASE_DIR / ".env",
]

def load_local_env():
    """Charge les variables d'environnement depuis les fichiers .env locaux sans dépendance externe."""
    for env_file in ENV_FILES:
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key not in os.environ and val:
                        os.environ[key] = val

load_local_env()

# Clés d'API & Endpoints
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")


def _positive_int(name: str, default: int) -> int:
    """Reads a positive integer setting; a missing or invalid value keeps the default."""
    raw = os.getenv(name, "").strip()
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


# Treg (https://treg.to): one gateway for paid data APIs, used for LinkedIn job search.
# Access, in this order: TREG_API_KEY over HTTP, else the `treg` CLI already signed in
# on the server (TREG_CLI). Values are never printed or logged.
TREG_API_KEY = os.getenv("TREG_API_KEY", "")
TREG_BASE_URL = os.getenv("TREG_BASE_URL", "https://treg.to").rstrip("/")
TREG_CLI = os.getenv("TREG_CLI", "/opt/treg-cli/bin/treg")
TREG_MAX_CALLS_PER_RUN = _positive_int("TREG_MAX_CALLS_PER_RUN", 4)
TREG_MAX_COST_PER_CALL_USD = os.getenv("TREG_MAX_COST_PER_CALL_USD", "0.01")
# Full posting (description, salary) fetched per LinkedIn offer: ~$0.001 per call, capped per run.
TREG_MAX_DETAIL_CALLS_PER_RUN = _positive_int("TREG_MAX_DETAIL_CALLS_PER_RUN", 20)
# Google search per company by the field-check agent (company_check_agent.py): ~$0.0009 per call, capped per run.
TREG_MAX_VERIFY_CALLS_PER_RUN = _positive_int("TREG_MAX_VERIFY_CALLS_PER_RUN", 20)
# Full offer page read through Exa when the site blocks robots (offer_page_reader.py): $0.001 per page, capped per run.
TREG_MAX_PAGE_READS_PER_RUN = _positive_int("TREG_MAX_PAGE_READS_PER_RUN", 30)

# Reference list of sources, shared by the orchestrator, run_scraper and the scheduler.
# TikTok is left out: its videos are neither verifiable offers nor report documents.
DEFAULT_PLATFORMS = ["CAMEROON_JOBS", "LINKEDIN", "FACEBOOK", "ACADEMIC_WEB"]

# At most this many offers added per Cameroon day, internships and jobs together.
DAILY_OFFER_CAP = _positive_int("DAILY_OFFER_CAP", 20)

# Headers de requêtes furtifs (User-Agent rotation)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
]

# Mots-clés cibles de recherche de rapports de stage en Afrique Francophone
DEFAULT_STAGE_REPORT_QUERIES = [
    "rapport de stage informatique filetype:pdf",
    "rapport de stage génie logiciel BTS licence",
    "rapport de stage fin d études pdf Cameroun Côte d Ivoire",
    "rapport de stage réseau et télécom IUT",
    "rapport de stage comptabilité gestion finance",
    "site:linkedin.com/posts 'rapport de stage' 'pdf'",
    "site:linkedin.com/posts 'mon rapport de stage'",
    "site:facebook.com 'rapport de stage' pdf",
    "filetype:pdf 'rapport de stage' 'université' 'mention'",
]

DEFAULT_STAGE_JOB_QUERIES = [
    "site:linkedin.com/posts 'offre de stage' 'Abidjan' OR 'Douala' OR 'Yaoundé' OR 'Dakar'",
    "site:linkedin.com/posts 'stagiaire' 'candidature' 'WhatsApp'",
    "site:facebook.com 'recrutement stagiaire' 'envoyer CV'",
]
