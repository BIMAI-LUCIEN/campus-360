"""
Campus 360 — Agent IA d'Analyse et de Structuration Multimodale
Utilise Gemini 2.0/Flash ou OpenRouter pour catégoriser, extraire et enrichir
les rapports de stage et offres de stage trouvés sur les réseaux sociaux.
"""

import json
import logging
import requests
from config import GEMINI_API_KEY, OPENROUTER_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AIAnalyzerAgent")

class AIAnalyzerAgent:
    def __init__(self):
        self.gemini_key = GEMINI_API_KEY
        self.openrouter_key = OPENROUTER_API_KEY

    def analyze_document_content(self, text_snippet: str, source_title: str, source_url: str, platform: str) -> dict:
        """
        Analyse le texte d'un post ou d'un document pour déterminer s'il s'agit d'un
        rapport de stage, d'un mémoire ou d'une offre, et extrait les métadonnées.
        """
        prompt = f"""
Tu es l'Agent IA d'analyse académique de Campus 360 en Afrique Francophone.
Analyse les informations suivantes extraites de {platform} :

Titre source : {source_title}
URL source : {source_url}
Contenu / Extrait :
{text_snippet[:3500]}

Détermine s'il s'agit d'un VRAI rapport de stage académique (ou mémoire), ou bien d'une OFFRE de stage, ou d'autre chose.
Réponds STRICTEMENT avec un objet JSON respectant exactement cette structure :

{{
  "is_relevant": true ou false,
  "document_type": "RAPPORT_DE_STAGE" ou "MEMOIRE" ou "OFFRE_DE_STAGE" ou "AUTRE",
  "title": "Titre explicite et soigné du document",
  "theme": "Sujet ou problématique centrale traitée",
  "author": "Nom complet de l'étudiant/auteur si identifié, ou null",
  "school": "Nom de l'université, école ou institut (ex: Université de Douala, INP-HB, etc.) ou null",
  "company": "Nom de l'entreprise d'accueil ou partenaire ou null",
  "field": "Filière / Spécialité (ex: Informatique / Génie Logiciel, Réseaux & Télécoms, Comptabilité & Gestion, Marketing, etc.)",
  "level": "Niveau académique estimé (BTS, DUT, Licence, Master, Ingénieur)",
  "academic_year": "Année académique (ex: 2023-2024) ou null",
  "abstract": "Résumé concis de 2 à 4 phrases expliquant le travail réalisé",
  "table_of_contents": [
    "Introduction Générale",
    "Chapitre 1 : Présentation du cadre de stage",
    "Chapitre 2 : Étude préalable et analyse",
    "Chapitre 3 : Réalisation et résultats",
    "Conclusion Générale"
  ],
  "tags": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
  "quality_score": 85 (score de 0 à 100 estimant la valeur pédagogique pour les étudiants),
  "is_offer": false,
  "offer_details": {{
    "requirements": ["Compétence 1", "Compétence 2"],
    "location": "Ville ou Pays",
    "duration": "Durée",
    "contact_whatsapp": "Numéro WhatsApp ou null",
    "contact_email": "Email ou null"
  }}
}}
Réponds UNIQUEMENT avec le JSON valide, sans texte explicatif ni balises markdown.
"""

        # 1. Essai avec Gemini API si disponible
        if self.gemini_key:
            try:
                res = self._call_gemini(prompt)
                if res:
                    return res
            except Exception as e:
                logger.warning(f"Échec appel Gemini : {e}, passage au fallback OpenRouter...")

        # 2. Fallback avec OpenRouter
        if self.openrouter_key:
            try:
                res = self._call_openrouter(prompt)
                if res:
                    return res
            except Exception as e:
                logger.error(f"Échec appel OpenRouter : {e}")

        # 3. Fallback heuristique local en cas d'absence d'API key
        return self._heuristic_analysis(source_title, text_snippet, source_url, platform)

    def _call_gemini(self, prompt: str) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        resp = requests.post(url, json=payload, timeout=25)
        resp.raise_for_status()
        data = resp.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(self._clean_json(raw_text))

    def _call_openrouter(self, prompt: str) -> dict:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://campus360b.site",
            "X-Title": "Campus 360 Scraper Agent"
        }
        candidate_models = [
            "openai/gpt-4o-mini",
            "meta-llama/llama-3.3-70b-instruct:free",
            "minimax/minimax-01"
        ]
        last_err = None
        for model in candidate_models:
            try:
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    return json.loads(self._clean_json(raw_text))
                else:
                    last_err = f"Status {resp.status_code}: {resp.text[:100]}"
            except Exception as e:
                last_err = str(e)
                continue
        raise RuntimeError(f"All OpenRouter candidate models failed. Last error: {last_err}")

    def _heuristic_analysis(self, title: str, text: str, url: str, platform: str) -> dict:
        """Analyse heuristique légère sans dépendance réseau externe."""
        lower_t = f"{title} {text}".lower()
        is_report = "rapport de stage" in lower_t or "stage pfe" in lower_t or "fin d'étude" in lower_t
        is_job = "offre de stage" in lower_t or "recrutement" in lower_t or "recherchons stagiaire" in lower_t

        doc_type = "RAPPORT_DE_STAGE" if is_report else ("OFFRE_DE_STAGE" if is_job else "AUTRE")

        # Détection de la filière
        field = "Informatique / Génie Logiciel"
        if any(w in lower_t for w in ["comptab", "financ", "audit", "gestion"]):
            field = "Comptabilité & Gestion"
        elif any(w in lower_t for w in ["réseau", "telecom", "systeme"]):
            field = "Réseaux & Télécoms"
        elif any(w in lower_t for w in ["market", "vente", "commercial"]):
            field = "Marketing & Commerce"
        elif any(w in lower_t for w in ["droit", "jurid"]):
            field = "Droit des Affaires"

        return {
            "is_relevant": is_report or is_job,
            "document_type": doc_type,
            "title": title[:120] or "Rapport de Stage Universitaire",
            "theme": "Stage professionnel et mise en application pratique",
            "author": None,
            "school": "Établissement Universitaire",
            "company": "Entreprise Partenaire",
            "field": field,
            "level": "Licence",
            "academic_year": "2023-2024",
            "abstract": (text[:250] + "...") if len(text) > 250 else text,
            "table_of_contents": [
                "Introduction Générale",
                "Cadre Méthodologique",
                "Missions et Réalisations",
                "Bilan et Recommandations"
            ],
            "tags": ["stage", field.lower(), platform.lower()],
            "quality_score": 75,
            "is_offer": is_job,
            "offer_details": {
                "requirements": [],
                "location": "Afrique Francophone",
                "duration": "3 mois",
                "contact_whatsapp": None,
                "contact_email": None
            }
        }

    def _clean_json(self, raw: str) -> str:
        s = raw.strip()
        if s.startswith("```json"):
            s = s[7:]
        elif s.startswith("```"):
            s = s[3:]
        if s.endswith("```"):
            s = s[:-3]
        return s.strip()
