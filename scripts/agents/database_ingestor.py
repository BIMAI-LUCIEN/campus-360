"""
Campus 360 — Agent d'Ingestion & Persistance Base de Données
Sauvegarde de manière idempotente et sécurisée les rapports de stage et offres
dans Supabase (PostgreSQL) via REST API et connexion directe.
"""

import logging
import requests
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DatabaseIngestor")

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
            "academic_year": report_data.get("academic_year") or "2023-2024",
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

    def save_stage_job(self, job_data: dict, source_item: dict) -> dict:
        """
        Enregistre une offre de stage dans stage_jobs et stage_companies.
        """
        if not self.supabase_url or not self.service_key:
            return {"status": "dry_run", "title": job_data.get("title")}

        offer = job_data.get("offer_details", {})
        company_name = job_data.get("company") or "Entreprise Partenaire (Cameroun)"
        location = source_item.get("location") or offer.get("location") or "Douala, Cameroun"
        flyer_url = source_item.get("flyer_url") or job_data.get("flyer_url")
        whatsapp = source_item.get("contact_whatsapp") or offer.get("contact_whatsapp")
        email = source_item.get("contact_email") or offer.get("contact_email") or "contact@campus360b.site"

        try:
            # 1. Entreprise
            comp_payload = {
                "name": company_name,
                "industry": job_data.get("field", "Multi-secteur"),
                "address": location,
                "contact_email": email,
                "contact_whatsapp": whatsapp,
                "logo_url": flyer_url,
                "status": "UNVERIFIED"
            }
            comp_url = f"{self.supabase_url}/rest/v1/stage_companies"
            c_resp = requests.post(comp_url, headers=self.headers, json=comp_payload, timeout=15)
            company_id = c_resp.json()[0]["id"] if c_resp.status_code in [200, 201] and c_resp.json() else None

            # 2. Offre
            job_payload = {
                "company_id": company_id,
                "title": job_data.get("title", "Offre de Stage"),
                "description": job_data.get("abstract", "")[:1500],
                "requirements": offer.get("requirements", []),
                "apply_method": "WHATSAPP" if whatsapp else "EMAIL",
                "location": location,
                "duration": offer.get("duration", "3 à 6 mois"),
                "stipend": offer.get("stipend", "Indemnité de stage"),
                "flyer_url": flyer_url,
                "is_sponsored": False,
                "source": "SCRAPED"
            }
            if company_id:
                job_url = f"{self.supabase_url}/rest/v1/stage_jobs"
                requests.post(job_url, headers=self.headers, json=job_payload, timeout=15)
                logger.info(f"✅ Offre de stage insérée ({location}) : {job_payload['title']}")
                return {"status": "job_inserted"}
        except Exception as e:
            logger.warning(f"Impossible d'insérer l'offre : {e}")

        return {"status": "skipped"}
