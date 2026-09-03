"""
Campus 360 — Agent d'Acheminement Candidature RH (Direct Reach)
Formate et achemine le dossier de candidature de l'étudiant directement vers les RH :
1. Email de candidature professionnel hyper-qualifié (Objet, accroche, atouts, pièce jointe)
2. Message d'approche WhatsApp recruteur optimisé (+237 Cameroun) avec lien vers le CV certifié
3. Enregistrement automatique de la candidature dans Supabase (stage_applications)
"""

import requests
import json
import logging
import urllib.parse
import sys
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CompanyDirectReachAgent")

class CompanyDirectReachAgent:
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }

    def prepare_application_reach(
        self,
        student_name: str,
        student_phone: str,
        student_email: str,
        student_level: str,
        student_major: str,
        job_title: str,
        company_name: str,
        company_email: Optional[str] = None,
        company_whatsapp: Optional[str] = None,
        job_location: Optional[str] = "Douala, Cameroun"
    ) -> Dict[str, Any]:
        """
        Génère les canaux d'approche directe vers les RH.
        """
        # 1. Email de candidature officiel
        email_subject = f"Candidature Stage : {job_title} — {student_name} ({student_major})"
        email_body = f"""Madame, Monsieur le Responsable des Ressources Humaines de {company_name},

Actuellement étudiant(e) en {student_level} spécialité {student_major}, je vous soumets ma candidature pour le poste de « {job_title} » au sein de votre structure à {job_location}.

Au cours de mon cursus académique et de mes projets pratiques, j'ai développé une solide maîtrise des compétences attendues pour cette mission. Rigoureux(se), dynamique et immédiatement disponible, je souhaite mettre mon énergie au service de vos objectifs.

Je vous invite à consulter mon CV et mes références professionnelles vérifiées sur Campus 360.
Je reste à votre entière disposition pour un entretien.

Bien cordialement,
{student_name}
Téléphone : {student_phone}
Email : {student_email}
Plateforme : Campus 360 (https://campus360b.site)
"""
        mailto_link = f"mailto:{company_email or ''}?subject={urllib.parse.quote(email_subject)}&body={urllib.parse.quote(email_body)}"

        # 2. Message d'approche WhatsApp professionnel
        whatsapp_clean = re.sub(r'[^0-9+]', '', company_whatsapp or '')
        if whatsapp_clean.startswith('00237'):
            whatsapp_clean = '+237' + whatsapp_clean[5:]
        elif whatsapp_clean.startswith('237'):
            whatsapp_clean = '+237' + whatsapp_clean[3:]
        elif whatsapp_clean.startswith('6') and len(whatsapp_clean) == 9:
            whatsapp_clean = '+237' + whatsapp_clean

        whatsapp_pitch = f"""Bonjour {company_name} 👋

Je suis {student_name}, étudiant(e) en {student_level} ({student_major}).
Je postule avec enthousiasme à votre offre de stage : *{job_title}* ({job_location}).

Voici mes coordonnées directes :
📞 {student_phone}
📧 {student_email}

Mon profil et mes références certifiées sont consultables sur Campus 360.
Seriez-vous disponible pour un court échange sur ma candidature ? Merci !"""

        whatsapp_link = f"https://wa.me/{whatsapp_clean.replace('+', '')}?text={urllib.parse.quote(whatsapp_pitch)}" if whatsapp_clean else None

        return {
            "success": True,
            "email_subject": email_subject,
            "email_body": email_body,
            "mailto_url": mailto_link,
            "whatsapp_pitch": whatsapp_pitch,
            "whatsapp_url": whatsapp_link,
            "company_name": company_name,
            "job_title": job_title
        }

    def record_application_in_db(
        self,
        student_id: str,
        job_id: str,
        notes: str = "Candidature acheminée par l'agent Direct Reach"
    ) -> Dict[str, Any]:
        """
        Enregistre la candidature dans public.stage_applications.
        """
        if not self.supabase_url or not SUPABASE_SERVICE_ROLE_KEY:
            return {"status": "dry_run"}

        url = f"{self.supabase_url}/rest/v1/stage_applications"
        payload = {
            "student_id": student_id,
            "job_id": job_id,
            "status": "PENDING",
            "notes": notes
        }

        try:
            resp = requests.post(url, headers=self.headers, json=payload, timeout=10)
            if resp.status_code in [200, 201]:
                logger.info(f"✅ Candidature enregistrée en base pour l'étudiant {student_id} (offre {job_id})")
                return {"status": "success"}
            elif resp.status_code == 409:
                return {"status": "already_applied"}
            else:
                logger.warning(f"Réponse insertion candidature {resp.status_code} : {resp.text}")
                return {"status": "error", "code": resp.status_code}
        except Exception as e:
            logger.error(f"Erreur enregistrement candidature : {e}")
            return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import re
    agent = CompanyDirectReachAgent()
    reach = agent.prepare_application_reach(
        student_name="Marc Mbarga",
        student_phone="+237 690 12 34 56",
        student_email="marc.mbarga@univ-douala.cm",
        student_level="Licence 3",
        student_major="Génie Logiciel",
        job_title="Stagiaire Développeur Python / AI",
        company_name="Orange Cameroun",
        company_email="recrutement@orange.cm",
        company_whatsapp="+237699001122",
        job_location="Douala, Cameroun"
    )
    print("Acheminement préparé avec succès !")
    print("WhatsApp link:", reach.get("whatsapp_url"))
