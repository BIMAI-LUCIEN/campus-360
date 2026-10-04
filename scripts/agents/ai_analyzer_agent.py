"""
Campus 360 — Agent IA d'Analyse et de Structuration Multimodale
Utilise Gemini 2.0/Flash ou OpenRouter pour catégoriser, extraire et enrichir
les rapports de stage et offres de stage authentiques au Cameroun.
Inclut des filtres stricts anti-parasites (Profils CV, posts 'officiellement stagiaire', posts sans entreprise).
"""

import json
import logging
import re
import requests
from config import GEMINI_API_KEY, OPENROUTER_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AIAnalyzerAgent")

# Patterns stricts de détection d'éléments parasites et non éligibles
JUNK_PATTERNS = [
    r"profil\s*cv",
    r"cvth[èe]que",
    r"candidat\s*ayant\s*un\s*niveau",
    r"officiellement\s*stagiaire",
    r"trouv[ée]\s*mon\s*stage",
    r"j'ai\s*trouv[ée]\s*un\s*stage",
    r"je\s*cherche\s*un\s*stage",
    r"en\s*recherche\s*de\s*stage",
    r"recherche\s*active\s*de\s*stage",
    r"recherche\s*de\s*stage\s*en\s*comptabilit[ée]",
    r"demande\s*de\s*rapport\s*de\s*stage",
    r"cherche\s*rapport\s*de\s*stage",
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

class AIAnalyzerAgent:
    def __init__(self):
        self.gemini_key = GEMINI_API_KEY
        self.openrouter_key = OPENROUTER_API_KEY

    def is_junk_post(self, title: str, text: str) -> bool:
        """Vérifie si le texte ou titre correspond à un post parasite."""
        full_text = f"{title or ''} {text or ''}".lower()
        return any(re.search(pat, full_text, re.IGNORECASE) for pat in JUNK_PATTERNS)

    def analyze_document_content(self, text_snippet: str, source_title: str, source_url: str, platform: str) -> dict:
        """
        Analyse le texte d'un post ou d'un document pour déterminer s'il s'agit d'un
        rapport de stage, d'un mémoire ou d'une offre, et extrait les métadonnées.
        Rejette systématiquement tout post candidat, 'trouvé mon stage' ou sans entreprise.
        """
        # 1. Filtre pré-analyse strict anti-parasite
        if self.is_junk_post(source_title, text_snippet):
            logger.info(f"🚫 Post parasite rejeté immédiatement : '{source_title[:60]}'")
            return {
                "is_relevant": False,
                "document_type": "AUTRE",
                "title": source_title[:120],
                "theme": "Rejeté - Profil CV ou post personnel/parasite",
                "author": None,
                "school": None,
                "company": None,
                "field": "Autre",
                "level": None,
                "academic_year": None,
                "abstract": "Ce contenu a été rejeté car il s'agit d'un profil de candidat, d'une annonce personnelle ('trouvé mon stage', 'je cherche un stage') ou d'un post vague.",
                "table_of_contents": [],
                "tags": [],
                "quality_score": 0,
                "is_offer": False,
                "offer_details": {}
            }

        prompt = f"""
Tu es l'Agent IA d'analyse de Campus 360 pour le Cameroun et l'Afrique Francophone.
Analyse les informations suivantes extraites de {platform} :

Titre source : {source_title}
URL source : {source_url}
Contenu / Extrait :
{text_snippet[:3500]}

Détermine s'il s'agit :
1. D'une VRAIE OFFRE DE STAGE OU D'EMPLOI émise par une ENTREPRISE RÉELLE ET NOMMÉE au Cameroun (recrutement officiel de stagiaires).
2. D'un RAPPORT DE STAGE ACADÉMIQUE ou MÉMOIRE d'étudiant (travail universitaire de fin d'études).
3. D'autre chose hors-sujet ou d'un post parasite.

RÈGLES D'EXCLUSION ABSOLUES ET STRICTES (IMPORTANT) :
- REFUSE TOUT post de type "Profil CV", "CVthèque", ou profil de candidat cherchant un stage ("je cherche un stage", "en recherche de stage").
- REFUSE TOUT post personnel où une personne annonce avoir trouvé un stage ("officiellement stagiaire", "j'ai trouvé mon stage").
- REFUSE TOUTE publication où le nom de l'entreprise qui recrute n'est pas clairement mentionné ou est générique ("Entreprise Partenaire", "Entreprise anonyme", "Entreprise XYZ", "Non spécifiée").
- REFUSE TOUTE publication située hors du Cameroun (Madagascar, France, etc.).
- Dans TOUS ces cas d'exclusion, réponds STRICTEMENT avec "is_relevant": false, "is_offer": false, "company": null et "document_type": "AUTRE".

Réponds STRICTEMENT avec un objet JSON respectant exactement cette structure :

{{
  "is_relevant": true ou false,
  "document_type": "OFFRE_DE_STAGE" ou "RAPPORT_DE_STAGE" ou "MEMOIRE" ou "AUTRE",
  "title": "Titre explicite de l'offre ou du document",
  "theme": "Thématique ou secteur (ex: Informatique, Banque, etc.)",
  "author": "Auteur ou recruteur si disponible",
  "school": "École ou université si mentionnée",
  "company": "Entreprise réelle qui recrute ou entreprise d'accueil (ou null si inconnue)",
  "field": "Secteur (Informatique / Télécoms / Finance / Marketing / Énergie / Logistique / etc.)",
  "level": "Niveau d'études (BTS, Licence, Master)",
  "academic_year": "2024-2025",
  "abstract": "Description résumée des missions ou du travail (2 à 4 phrases)",
  "table_of_contents": [],
  "tags": ["stage", "cameroun", "emploi"],
  "quality_score": 85,
  "is_offer": true si c'est une offre de stage ou d'emploi émise par une entreprise sinon false,
  "offer_details": {{
    "requirements": ["Compétence requise 1", "Compétence requise 2"],
    "location": "Ville au Cameroun (ex: Douala, Yaoundé, Bafoussam) ou Cameroun",
    "duration": "3 à 6 mois",
    "stipend": "Indemnité de stage ou Rémunéré",
    "contact_whatsapp": "Numéro WhatsApp au format +237... ou null",
    "contact_email": "Email de candidature ou null"
  }}
}}
Réponds UNIQUEMENT avec le JSON valide, sans texte explicatif ni balises markdown.
"""

        result = None

        # 1. Essai avec Gemini API si disponible
        if self.gemini_key:
            try:
                res = self._call_gemini(prompt)
                if res:
                    result = res
            except Exception as e:
                logger.warning(f"Échec appel Gemini : {e}, passage au fallback OpenRouter...")

        # 2. Fallback avec OpenRouter
        if not result and self.openrouter_key:
            try:
                res = self._call_openrouter(prompt)
                if res:
                    result = res
            except Exception as e:
                logger.error(f"Échec appel OpenRouter : {e}")

        # 3. Fallback heuristique local
        if not result:
            result = self._heuristic_analysis(source_title, text_snippet, source_url, platform)

        # 4. Filtre post-analyse strict sur le JSON retourné
        return self._sanitize_and_validate(result, source_title, text_snippet)

    def _sanitize_and_validate(self, result: dict, title: str, text: str) -> dict:
        """Garantit l'absence d'incohérence, d'entreprise absente ou de faux positifs."""
        if not isinstance(result, dict):
            return {"is_relevant": False, "document_type": "AUTRE", "is_offer": False}

        # Vérification junk post résiduel
        if self.is_junk_post(result.get("title", title), result.get("abstract", text)):
            logger.info("🚫 Faux positif détecté lors du post-check : rejet de l'offre.")
            result["is_relevant"] = False
            result["is_offer"] = False
            result["document_type"] = "AUTRE"
            result["company"] = None
            return result

        # Si marqué comme offre de stage, l'entreprise doit être réelle et explicite
        if result.get("is_offer"):
            comp = (result.get("company") or "").strip().lower()
            if not comp or comp in GENERIC_INVALID_COMPANIES:
                logger.info(f"🚫 Offre rejetée : absence d'entreprise valide ('{comp}')")
                result["is_offer"] = False
                result["is_relevant"] = False
                result["document_type"] = "AUTRE"
                result["company"] = None

        return result

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
        """Analyse heuristique légère avec filtres de sécurité intégrés."""
        if self.is_junk_post(title, text):
            return {
                "is_relevant": False,
                "document_type": "AUTRE",
                "title": title[:120],
                "company": None,
                "is_offer": False
            }

        lower_t = f"{title} {text}".lower()
        is_report = "rapport de stage" in lower_t or "stage pfe" in lower_t or "fin d'étude" in lower_t
        is_job = ("offre de stage" in lower_t or "recrutement" in lower_t or "recherchons stagiaire" in lower_t) and not self.is_junk_post(title, text)

        doc_type = "RAPPORT_DE_STAGE" if is_report else ("OFFRE_DE_STAGE" if is_job else "AUTRE")

        # Détection de la filière
        field = "Informatique & Génie Logiciel"
        if any(w in lower_t for w in ["comptab", "financ", "audit", "gestion"]):
            field = "Audit, Finance & Comptabilité"
        elif any(w in lower_t for w in ["réseau", "telecom", "systeme"]):
            field = "Réseaux & Télécoms"
        elif any(w in lower_t for w in ["market", "vente", "commercial"]):
            field = "Marketing & Commerce"
        elif any(w in lower_t for w in ["solaire", "energie", "electr"]):
            field = "Énergie Solaire & Ingénierie"
        elif any(w in lower_t for w in ["audiovisuel", "video", "cinema"]):
            field = "Audiovisuel & Médias"
        elif any(w in lower_t for w in ["logist", "transit", "supply"]):
            field = "Logistique & Supply Chain"

        return {
            "is_relevant": is_report or is_job,
            "document_type": doc_type,
            "title": title[:120] or "Rapport de Stage Universitaire",
            "theme": "Stage professionnel et mise en application pratique",
            "author": None,
            "school": "Établissement Universitaire",
            "company": None,  # Ne jamais inventer une entreprise en mode heuristique
            "field": field,
            "level": "Licence",
            "academic_year": "2024-2025",
            "abstract": (text[:250] + "...") if len(text) > 250 else text,
            "table_of_contents": [
                "Introduction Générale",
                "Cadre Méthodologique",
                "Missions et Réalisations",
                "Bilan et Recommandations"
            ],
            "tags": ["stage", field.lower(), "cameroun"],
            "quality_score": 75,
            "is_offer": is_job,
            "offer_details": {
                "requirements": [],
                "location": "Douala, Cameroun",
                "duration": "3 à 6 mois",
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
