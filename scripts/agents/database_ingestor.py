"""
Campus 360 — Agent d'Ingestion & Persistance Base de Données
Sauvegarde de manière idempotente et sécurisée les rapports de stage et offres
dans Supabase (PostgreSQL) via REST API et connexion directe.
Intègre des filtres stricts anti-parasites et la déduplication complète des entreprises.
"""

import logging
import re
import requests
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DatabaseIngestor")

# Patterns d'exclusion stricts pour les offres
JUNK_JOB_PATTERNS = [
    r"profil\s*cv",
    r"cvth[èe]que",
    r"candidat\s*ayant\s*un\s*niveau",
    r"officiellement\s*stagiaire",
    r"trouv[ée]\s*mon\s*stage",
    r"j'ai\s*trouv[ée]\s*un\s*stage",
    r"je\s*cherche\s*un\s*stage",
    r"en\s*recherche\s*de\s*stage",
    r"recherche\s*active\s*de\s*stage",
    r"recherche\s*de\s*stage",
    r"demande\s*de\s*rapport\s*de\s*stage",
    r"cette\s*vid[ée]o\s*pr[ée]sente",
    r"l'utilisateur\s*annonce\s*qu'il\s*est",
    r"partage\s*son\s*enthousiasme",
    r"invite\s*les\s*autres\s*à\s*deviner",
    r"sans\s*r[ée]v[ée]ler\s*le\s*nom",
    r"derni[èe]res\s*offres\s*/\s*stage",
    r"détails\s*spécifiques.*ne\s*sont\s*pas\s*fournis",
    r"ambositra",
    r"opportunit[ée]\s*d'emploi/stage\s*au\s*cameroun",
    r"obtenir\s*un\s*stage\s*dans\s*une\s*entreprise"
]

GENERIC_INVALID_COMPANIES = [
    "entreprise partenaire (cameroun)",
    "entreprise partenaire",
    "entreprise de la place",
    "entreprise xyz",
    "non spécifiée",
    "non précisée",
    "inconnu",
    "aucune",
    "particulier",
    "minajobs",
    "minajobs.net",
    "emploi.cm"
]

DEFAULT_SECTOR_FLYERS = {
    "informatique": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80",
    "réseaux": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&fit=crop&q=80",
    "télécoms": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80",
    "finance": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80",
    "audit": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
    "audiovisuel": "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1200&auto=format&fit=crop&q=80",
    "logistique": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&auto=format&fit=crop&q=80",
    "marketing": "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80",
    "solaire": "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=1200&auto=format&fit=crop&q=80",
    "énergie": "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=1200&auto=format&fit=crop&q=80",
    "éducation": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80",
    "rh": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80",
    "secrétariat": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80"
}

class DatabaseIngestor:
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.service_key = SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=representation"
        }

    def ensure_tables(self):
        """Vérifie ou initialise la table scraped_stage_reports dans PostgreSQL."""
        if not DATABASE_URL:
            logger.info("DATABASE_URL non configuré en direct, utilisation de l'API Supabase REST.")
            return

        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL, sslmode="require")
            cur = conn.cursor()
            cur.execute("""
            CREATE TABLE IF NOT EXISTS public.scraped_stage_reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                theme TEXT,
                author TEXT,
                school TEXT,
                company TEXT,
                field TEXT NOT NULL DEFAULT 'Informatique / Génie Logiciel',
                level TEXT DEFAULT 'Licence',
                academic_year TEXT,
                abstract TEXT,
                table_of_contents JSONB DEFAULT '[]',
                file_url TEXT NOT NULL,
                source_platform TEXT NOT NULL,
                source_url TEXT UNIQUE NOT NULL,
                tags TEXT[] DEFAULT '{}',
                quality_score INTEGER DEFAULT 80 CHECK (quality_score BETWEEN 0 AND 100),
                view_count INTEGER DEFAULT 0,
                download_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_scraped_reports_field ON public.scraped_stage_reports(field);
            CREATE INDEX IF NOT EXISTS idx_scraped_reports_source ON public.scraped_stage_reports(source_platform);
            """)
            conn.commit()
            cur.close()
            conn.close()
            logger.info("Table public.scraped_stage_reports vérifiée/créée avec succès.")
        except Exception as e:
            logger.info(f"Initialisation via psycopg2 non disponible ({e}), fallback vers Supabase REST.")

    def save_stage_report(self, report_data: dict, source_item: dict) -> dict:
        """
        Enregistre un rapport de stage analysé dans la base Supabase.
        """
        if not self.supabase_url or not self.service_key:
            logger.warning("Supabase URL ou Service Key manquant, sauvegarde en mode DRY-RUN simulé.")
            return {"status": "dry_run", "title": report_data.get("title")}

        payload = {
            "title": report_data.get("title") or source_item.get("title") or "Rapport de Stage",
            "theme": report_data.get("theme") or "Rapport de stage académique",
            "author": report_data.get("author") or "Étudiant stagiaire",
            "school": report_data.get("school") or "Établissement d'Enseignement Supérieur",
            "company": report_data.get("company") or "Entreprise d'accueil",
            "field": report_data.get("field") or "Informatique / Général",
            "level": report_data.get("level") or "Licence",
            "academic_year": report_data.get("academic_year") or "2024-2025",
            "abstract": report_data.get("abstract") or source_item.get("snippet", ""),
            "table_of_contents": report_data.get("table_of_contents") or [],
            "file_url": source_item.get("file_url") or source_item.get("url"),
            "source_platform": source_item.get("platform", "WEB"),
            "source_url": source_item.get("url"),
            "tags": report_data.get("tags") or ["stage", "rapport"],
            "quality_score": report_data.get("quality_score", 80)
        }

        url = f"{self.supabase_url}/rest/v1/scraped_stage_reports"
        try:
            resp = requests.post(url, headers=self.headers, json=payload, timeout=15)
            if resp.status_code in [200, 201]:
                logger.info(f"✅ Rapport enregistré : {payload['title'][:60]}")
                try:
                    from in_app_push_notifier_agent import InAppPushNotifierAgent
                    InAppPushNotifierAgent().notify_new_stage_report(
                        report_title=payload['title'],
                        field=payload['field'],
                        school=payload.get('school')
                    )
                except Exception as push_err:
                    logger.debug(f"Push notification ignorée : {push_err}")
                return {"status": "success", "data": resp.json() if resp.text else payload}
            elif resp.status_code == 409:
                logger.info(f"ℹ️ Rapport déjà existant (doublon ignoré) : {payload['source_url']}")
                return {"status": "duplicate"}
            else:
                logger.warning(f"Réponse Supabase code {resp.status_code} : {resp.text}")
                return {"status": "error", "code": resp.status_code, "msg": resp.text}
        except Exception as e:
            logger.error(f"Erreur lors de l'insertion dans Supabase : {e}")
            return {"status": "error", "exception": str(e)}

    def is_valid_stage_job(self, job_data: dict, source_item: dict) -> tuple[bool, str]:
        """Vérifie la légitimité stricte de l'offre de stage avant ingestion."""
        if not job_data.get("is_relevant") or not job_data.get("is_offer"):
            return False, "Non qualifié comme offre de stage par l'IA"

        company = (job_data.get("company") or source_item.get("company") or "").strip()
        if not company or company.lower() in GENERIC_INVALID_COMPANIES:
            return False, f"Entreprise absente ou générique invalide : '{company}'"

        text_to_check = f"{job_data.get('title', '')} {job_data.get('abstract', '')} {source_item.get('title', '')}".lower()
        for pat in JUNK_JOB_PATTERNS:
            if re.search(pat, text_to_check, re.IGNORECASE):
                return False, f"Motif parasite détecté : {pat}"

        loc = (source_item.get("location") or job_data.get("offer_details", {}).get("location") or "").lower()
        if any(w in loc for w in ["madagascar", "ambositra", "france", "paris", "abidjan"]):
            if "cameroun" not in loc:
                return False, f"Localisation hors Cameroun : {loc}"

        return True, "Valide"

    def _get_sector_flyer(self, field: str, title: str) -> str:
        """Sélectionne un flyer HD Unsplash adapté au métier si non fourni."""
        combined = f"{field or ''} {title or ''}".lower()
        for key, url in DEFAULT_SECTOR_FLYERS.items():
            if key in combined:
                return url
        return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80"

    def save_stage_job(self, job_data: dict, source_item: dict) -> dict:
        """
        Enregistre une offre de stage avec déduplication stricte des entreprises
        et assignation systématique d'images de haute qualité (logo + flyer).
        """
        if not self.supabase_url or not self.service_key:
            return {"status": "dry_run", "title": job_data.get("title")}

        is_valid, reason = self.is_valid_stage_job(job_data, source_item)
        if not is_valid:
            logger.info(f"🚫 Offre de stage rejetée par l'ingestor : {reason} (Titre: {job_data.get('title', '')[:50]})")
            return {"status": "rejected", "reason": reason}

        offer = job_data.get("offer_details", {})
        company_name = (job_data.get("company") or source_item.get("company")).strip()
        location = source_item.get("location") or offer.get("location") or "Douala, Cameroun"
        field = job_data.get("field", "Informatique & Technologies")
        flyer_url = source_item.get("flyer_url") or job_data.get("flyer_url") or self._get_sector_flyer(field, job_data.get("title", ""))
        logo_url = source_item.get("logo_url") or job_data.get("logo_url") or "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80"
        whatsapp = source_item.get("contact_whatsapp") or offer.get("contact_whatsapp")
        email = source_item.get("contact_email") or offer.get("contact_email") or f"contact@{re.sub(r'[^a-z0-9]', '', company_name.lower())}.cm"

        try:
            # 1. Déduplication de l'entreprise : Vérifier si l'entreprise existe déjà
            comp_search_url = f"{self.supabase_url}/rest/v1/stage_companies?name=ilike.{requests.utils.quote(company_name)}&select=id,logo_url"
            comp_search_resp = requests.get(comp_search_url, headers=self.headers, timeout=10)
            
            company_id = None
            if comp_search_resp.status_code == 200 and comp_search_resp.json():
                company_id = comp_search_resp.json()[0]["id"]
                logger.info(f"ℹ️ Entreprise existante réutilisée : '{company_name}' (ID: {company_id})")
            else:
                # Créer une nouvelle entreprise uniquement si elle n'existe pas
                comp_payload = {
                    "name": company_name,
                    "industry": field,
                    "address": location,
                    "contact_email": email,
                    "contact_whatsapp": whatsapp,
                    "logo_url": logo_url,
                    "status": "VERIFIED",
                    "kyb_score": 90,
                    "is_premium": False
                }
                comp_url = f"{self.supabase_url}/rest/v1/stage_companies"
                c_resp = requests.post(comp_url, headers=self.headers, json=comp_payload, timeout=15)
                if c_resp.status_code in [200, 201] and c_resp.json():
                    company_id = c_resp.json()[0]["id"]
                    logger.info(f"✅ Nouvelle entreprise enregistrée : '{company_name}'")

            if not company_id:
                logger.warning(f"Impossible d'obtenir un company_id pour '{company_name}'")
                return {"status": "error_company"}

            # 2. Déduplication de l'offre pour cette entreprise
            title = job_data.get("title", "Offre de Stage").strip()
            job_search_url = f"{self.supabase_url}/rest/v1/stage_jobs?company_id=eq.{company_id}&title=ilike.{requests.utils.quote(title)}&select=id"
            job_search_resp = requests.get(job_search_url, headers=self.headers, timeout=10)

            if job_search_resp.status_code == 200 and job_search_resp.json():
                logger.info(f"ℹ️ Offre déjà existante chez '{company_name}' (doublon ignoré) : {title[:60]}")
                return {"status": "duplicate_job"}

            # 3. Insérer la nouvelle offre vérifiée
            job_payload = {
                "company_id": company_id,
                "title": title,
                "description": (job_data.get("abstract") or source_item.get("snippet", ""))[:1900],
                "requirements": offer.get("requirements") or ["Motivation", "Rigueur"],
                "apply_method": "WHATSAPP" if whatsapp else "EMAIL",
                "location": location,
                "duration": offer.get("duration", "3 à 6 mois"),
                "stipend": offer.get("stipend", "Indemnité de stage"),
                "flyer_url": flyer_url,
                "is_sponsored": False,
                "source": "SCRAPED"
            }
            job_url = f"{self.supabase_url}/rest/v1/stage_jobs"
            j_resp = requests.post(job_url, headers=self.headers, json=job_payload, timeout=15)
            if j_resp.status_code in [200, 201]:
                logger.info(f"✅ Offre de stage insérée avec succès : {title} chez {company_name}")
                try:
                    from in_app_push_notifier_agent import InAppPushNotifierAgent
                    InAppPushNotifierAgent().notify_new_stage_job(
                        job_title=title,
                        company=company_name,
                        location=location
                    )
                except Exception as push_err:
                    logger.debug(f"Push notification job ignorée : {push_err}")
                return {"status": "job_inserted"}
            else:
                logger.warning(f"Réponse Supabase job {j_resp.status_code} : {j_resp.text}")
                return {"status": "error_job", "msg": j_resp.text}

        except Exception as e:
            logger.warning(f"Impossible d'insérer l'offre : {e}")
            return {"status": "exception", "msg": str(e)}
