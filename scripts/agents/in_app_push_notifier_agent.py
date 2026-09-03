"""
Campus 360 — Agent de Notifications Push In-App
Dispatche les alertes mobiles (offres de stage au Cameroun, nouveaux rapports)
directement sur l'application mobile via l'API Expo Push Notifications.
(Aucune notification WhatsApp : 100% In-App Mobile Push).
"""

import requests
import logging
import sys
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("InAppPushNotifierAgent")

EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"

class InAppPushNotifierAgent:
    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }

    def get_active_push_tokens(self) -> List[str]:
        """
        Récupère tous les tokens de notification push Expo enregistrés dans la base.
        """
        if not self.supabase_url or not SUPABASE_SERVICE_ROLE_KEY:
            return []

        try:
            url = f"{self.supabase_url}/rest/v1/app_user_push_tokens?select=push_token"
            resp = requests.get(url, headers=self.headers, timeout=10)
            if resp.status_code == 200:
                rows = resp.json()
                tokens = [r["push_token"] for r in rows if r.get("push_token") and ("ExponentPushToken" in r["push_token"] or "ExpoPushToken" in r["push_token"])]
                return list(set(tokens))
            else:
                logger.warning(f"Impossible de récupérer les tokens push : code {resp.status_code}")
                return []
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des tokens push : {e}")
            return []

    def send_push(self, title: str, body: str, data: Optional[Dict[str, Any]] = None, tokens: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Envoie une notification push vers l'application mobile via Expo Push Service.
        """
        target_tokens = tokens if tokens is not None else self.get_active_push_tokens()

        if not target_tokens:
            logger.info(f"ℹ️ Aucun appareil abonné aux push pour l'instant. Notification enregistrée localement : '{title}'")
            return {"status": "no_tokens", "delivered_count": 0}

        messages = []
        for token in target_tokens:
            messages.append({
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data or {},
                "channelId": "default",
                "priority": "high"
            })

        # Expo gère des paquets jusqu'à 100 messages
        delivered = 0
        chunk_size = 100
        for i in range(0, len(messages), chunk_size):
            chunk = messages[i:i + chunk_size]
            try:
                resp = requests.post(
                    EXPO_PUSH_ENDPOINT,
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                    json=chunk,
                    timeout=12
                )
                if resp.status_code == 200:
                    delivered += len(chunk)
                    logger.info(f"📲 Push mobile envoyé avec succès à {len(chunk)} appareils : '{title}'")
                else:
                    logger.warning(f"Réponse Expo Push code {resp.status_code} : {resp.text}")
            except Exception as e:
                logger.error(f"Erreur lors de l'envoi push Expo : {e}")

        return {"status": "success", "delivered_count": delivered}

    def notify_new_stage_job(self, job_title: str, company: str, location: str, job_id: Optional[str] = None):
        """
        Notifie l'arrivée d'une nouvelle offre de stage au Cameroun.
        """
        title = f"⚡ Nouveau stage : {job_title[:45]}"
        body = f"{company} recrute à {location}. Postule maintenant dans Campus 360 !"
        data = {
            "screen": "StagesScreen",
            "jobId": job_id,
            "type": "STAGE_OFFER"
        }
        return self.send_push(title=title, body=body, data=data)

    def notify_new_stage_report(self, report_title: str, field: str, school: Optional[str] = None):
        """
        Notifie la disponibilité d'un nouvel exemplaire de rapport de stage pour s'inspirer.
        """
        title = f"📄 Nouveau modèle de rapport ({field[:30]})"
        body = f"{report_title[:50]} ({school or 'Université'}) est disponible dans ta bibliothèque Campus 360."
        data = {
            "screen": "ResourcesScreen",
            "tab": "reports",
            "type": "STAGE_REPORT"
        }
        return self.send_push(title=title, body=body, data=data)

if __name__ == "__main__":
    agent = InAppPushNotifierAgent()
    tokens = agent.get_active_push_tokens()
    print(f"Tokens push actifs trouvés : {len(tokens)}")
    res = agent.notify_new_stage_job(
        job_title="Développeur Mobile Flutter / React Native",
        company="MTN Cameroon",
        location="Douala, Cameroun"
    )
    print("Résultat notification push :", res)
