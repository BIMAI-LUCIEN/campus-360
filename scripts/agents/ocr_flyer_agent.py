"""
Campus 360 — Agent OCR & Vision de Flyers de Recrutement
Lit et retranscrit les affiches, flyers scannés et communiqués de stage/emploi
au Cameroun pour extraire le texte et les coordonnées même si l'annonce n'a pas de texte tapé.
"""

import requests
import json
import logging
import re
import sys
import base64
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import OPENROUTER_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("OCRFlyerAgent")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

class OCRFlyerAgent:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.model = "openai/gpt-4o-mini"

    def read_flyer(self, image_url: str, context_snippet: str = "") -> Dict[str, Any]:
        """
        Lit une affiche/flyer de recrutement via Vision IA et extrait les métadonnées de l'offre.
        """
        if not image_url or not image_url.startswith("http"):
            return {"success": False, "reason": "invalid_url"}

        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY non configurée pour l'agent OCR.")
            return {"success": False, "reason": "no_api_key"}

        prompt = f"""
Tu es l'Agent OCR et Vision de Campus 360 pour le Cameroun.
Analyse cette image de flyer ou d'affiche de recrutement / stage au Cameroun.

Contexte textuel associé (si dispo) :
{context_snippet[:500]}

Extrait fidèlement toutes les informations visibles sur le flyer :
1. Intitulé du stage ou de l'emploi
2. Nom de l'entreprise ou de l'organisme recruteur
3. Ville(s) ou région au Cameroun (ex: Douala, Yaoundé, Bafoussam, Kribi, etc.)
4. Niveau d'études requis (ex: BTS, Licence, Master) et filière
5. Compétences clés requises (liste)
6. Coordonnées de contact : Email et Numéro WhatsApp (si camerounais, format +237...)
7. Date limite de dépôt de dossier (si mentionnée)
8. Rémunération / Indemnité de stage (si mentionnée)

Réponds STRICTEMENT avec un JSON valide :
{{
  "is_valid_flyer": true ou false,
  "title": "Intitulé précis du poste",
  "company": "Nom de l'entreprise",
  "location": "Ville, Cameroun",
  "level": "Niveau requis",
  "field": "Filière",
  "requirements": ["Compétence 1", "Compétence 2"],
  "contact_email": "email@domaine.cm ou null",
  "contact_whatsapp": "+237... ou null",
  "deadline": "Date ou null",
  "stipend": "Indemnité ou Rémunéré ou Non précisé",
  "raw_text_extracted": "Résumé du texte lisible sur l'affiche"
}}
Réponds UNIQUEMENT avec le JSON, sans texte autour ni balises markdown.
"""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://campus360b.site",
            "X-Title": "Campus 360 OCR Flyer Agent"
        }

        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers=headers,
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 1200
                },
                timeout=30
            )

            if resp.status_code == 200:
                raw_content = resp.json()["choices"][0]["message"]["content"].strip()
                # Nettoyage JSON markdown
                cleaned = re.sub(r'^```json\s*', '', raw_content)
                cleaned = re.sub(r'\s*```$', '', cleaned).strip()
                data = json.loads(cleaned)
                logger.info(f"🔍 OCR Flyer réussi : {data.get('title')} chez {data.get('company')}")
                return {"success": True, "data": data}
            else:
                logger.warning(f"Réponse OCR code {resp.status_code} : {resp.text[:200]}")
                return {"success": False, "code": resp.status_code}
        except Exception as e:
            logger.error(f"Erreur durant l'OCR du flyer : {e}")
            return {"success": False, "error": str(e)}

if __name__ == "__main__":
    agent = OCRFlyerAgent()
    # Test avec un flyer publicitaire d'exemple
    sample_url = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500"
    print("Test OCR Flyer...")
    res = agent.read_flyer(sample_url, context_snippet="Recrutement stagiaire génie logiciel Douala")
    print("Résultat :", res)
