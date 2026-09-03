"""
Campus 360 — Agent Coach IA de Soutenance Académique
Génère pour un rapport de stage ou mémoire :
1. Le plan de diapositives / slides complet (12-15 slides chronométrées avec notes orales)
2. La simulation des questions pièges du jury avec réponses modèles
3. La grille d'évaluation académique pour maximiser la note finale
"""

import requests
import json
import logging
import re
import sys
from typing import Dict, Any, List, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from config import OPENROUTER_API_KEY

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DefenseCoachAgent")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

class DefenseCoachAgent:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.primary_model = "openai/gpt-4o-mini"
        self.fallback_model = "meta-llama/llama-3.3-70b-instruct:free"

    def generate_defense_coaching(
        self,
        title: str,
        field: str,
        company: Optional[str] = None,
        level: Optional[str] = "Licence",
        abstract: Optional[str] = "",
        table_of_contents: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Génère un coaching de soutenance complet adapté au rapport de stage ou mémoire.
        """
        if not self.api_key:
            return self._fallback_coaching(title, field, company, level)

        toc_str = "\n".join([f"- {t}" for t in (table_of_contents or [])])
        default_toc = "- Introduction Générale\n- Contexte de stage\n- Analyse du problème\n- Réalisation de la solution\n- Bilan et Conclusion"
        content_toc = toc_str if toc_str else default_toc
        abstract_snippet = abstract[:1000] if abstract else "Projet de stage professionnel"

        prompt = f"""
Tu es l'Agent Coach IA de Soutenance Académique de Campus 360 en Afrique Francophone (Cameroun, Côte d'Ivoire, Sénégal, etc.).
Un étudiant en {level} ({field}) prépare sa soutenance de stage.

Informations sur le travail :
Titre : {title}
Filière / Spécialité : {field}
Entreprise d'accueil : {company or 'Entreprise'}
Niveau d'études : {level}
Résumé / Contexte : {abstract_snippet}
Sommaire / Chapitres :
{content_toc}

Génère un guide de soutenance d'élite comprenant :
1. "presentation_plan": Une liste de 10 à 12 diapositives (slides). Pour chaque slide :
   - "slide_number": numéro (ex: 1)
   - "title": Titre de la slide
   - "timing_minutes": Temps alloué (total = 15 minutes)
   - "bullet_points": 3 à 4 points clés à afficher
   - "speaker_notes": Ce que l'étudiant doit DIRE à l'oral au jury (discours fluide et percutant)
2. "jury_simulation": Une liste de 6 questions pièges du jury réalistes et pointues :
   - "question": La question piège posée par le président du jury
   - "trap_context": Pourquoi le jury pose cette question (ce qu'il cherche à tester)
   - "recommended_answer": La réponse modèle intelligente et argumentée pour obtenir 18/20
3. "defense_tips": 5 conseils clés (gestion du temps, tenue, gestion des questions sans réponse, non-verbal).

Réponds STRICTEMENT avec un JSON valide respectant cette structure. Pas de markdown autour.
"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://campus360b.site",
            "X-Title": "Campus 360 Defense Coach"
        }

        for model in [self.primary_model, self.fallback_model]:
            try:
                resp = requests.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.4,
                        "max_tokens": 2500
                    },
                    timeout=30
                )
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"].strip()
                    cleaned = re.sub(r'^```json\s*', '', raw)
                    cleaned = re.sub(r'\s*```$', '', cleaned).strip()
                    data = json.loads(cleaned)
                    logger.info(f"🎓 Coaching de soutenance généré avec succès ({model}) pour : {title[:40]}")
                    return {"success": True, "coaching": data}
            except Exception as e:
                logger.warning(f"Modèle {model} échoué pour le coaching : {e}")

        return {"success": True, "coaching": self._fallback_coaching(title, field, company, level)}

    def _fallback_coaching(self, title: str, field: str, company: Optional[str], level: Optional[str]) -> Dict[str, Any]:
        """Génère un template de soutenance éprouvé en cas de coupure API."""
        return {
            "presentation_plan": [
                {
                    "slide_number": 1,
                    "title": "Page de Garde & Introduction",
                    "timing_minutes": 1.5,
                    "bullet_points": ["Titre du rapport", f"Entreprise : {company or 'Structure d accueil'}", "Encadreurs", "Filière & Année"],
                    "speaker_notes": "Monsieur le Président du jury, chers membres du jury, bonjour. J'ai l'honneur de vous présenter aujourd'hui les résultats de mon stage..."
                },
                {
                    "slide_number": 2,
                    "title": "Cadre & Présentation de l'Entreprise",
                    "timing_minutes": 2.0,
                    "bullet_points": ["Secteur d'activité", "Positionnement géographique", "Missions de la direction d'accueil"],
                    "speaker_notes": "Pour situer le contexte, mon stage s'est déroulé au sein de..."
                },
                {
                    "slide_number": 3,
                    "title": "Problématique & Objectifs",
                    "timing_minutes": 2.5,
                    "bullet_points": ["Constat initial et limites existantes", "Problématique centrale", "Objectifs assignés"],
                    "speaker_notes": "Lors de mon intégration, un dysfonctionnement majeur a été identifié..."
                },
                {
                    "slide_number": 4,
                    "title": "Méthodologie & Démarche Adoptée",
                    "timing_minutes": 3.0,
                    "bullet_points": ["Cahier des charges", "Outils et technologies retenus", "Étapes de conception"],
                    "speaker_notes": "Pour répondre rigoureusement à cette problématique, notre démarche s'est articulée autour de..."
                },
                {
                    "slide_number": 5,
                    "title": "Réalisation & Résultats Obtenus",
                    "timing_minutes": 4.0,
                    "bullet_points": ["Démonstration de la solution", "Gains mesurables pour l'entreprise", "Validation des tests"],
                    "speaker_notes": "Venons-en au cœur de notre réalisation. La solution mise en œuvre a permis de..."
                },
                {
                    "slide_number": 6,
                    "title": "Bilan Personnel & Conclusion",
                    "timing_minutes": 2.0,
                    "bullet_points": ["Apports techniques et humains", "Limites rencontrées", "Perspectives d'évolution"],
                    "speaker_notes": "En conclusion, ce stage a été une passerelle décisive vers le monde professionnel..."
                }
            ],
            "jury_simulation": [
                {
                    "question": "Pourquoi avez-vous choisi cette solution technique plutôt qu'une solution alternative déjà éprouvée sur le marché ?",
                    "trap_context": "Le jury veut vérifier si vous avez fait une vraie étude comparée ou si vous avez juste choisi votre outil préféré sans rigueur.",
                    "recommended_answer": "Nous avons comparé trois solutions selon des critères précis de coût, de maintenabilité locale et de rapidité de déploiement..."
                },
                {
                    "question": "Quelle a été votre contribution personnelle exacte par rapport à ce que l'équipe en place faisait déjà ?",
                    "trap_context": "Le jury veut s'assurer que vous n'avez pas simplement observé ou signé le travail de votre encadreur.",
                    "recommended_answer": "Mon rôle a été central sur la phase d'analyse des besoins et sur l'implémentation du module X..."
                },
                {
                    "question": "Si votre entreprise devait déployer cette solution à l'échelle nationale demain, quel serait le principal goulot d'étranglement ?",
                    "trap_context": "Teste votre vision critique et votre capacité à anticiper la montée en charge.",
                    "recommended_answer": "Le principal facteur critique concernerait la bande passante et la formation des utilisateurs finaux..."
                }
            ],
            "defense_tips": [
                "Regardez tous les membres du jury dans les yeux, ne lisez jamais l'écran.",
                "Réglez un chronomètre discret à 14 minutes pour ne jamais vous faire couper par le président.",
                "Si vous ne connaissez pas une réponse : dites 'C'est un angle très pertinent que nous n'avons pas investigué lors de ce périmètre de 3 mois, mais qui constituerait une excellente perspective'."
            ]
        }

if __name__ == "__main__":
    coach = DefenseCoachAgent()
    res = coach.generate_defense_coaching(
        title="Mise en place d'une infrastructure réseau sécurisée et d'une application de gestion des stocks",
        field="Génie Logiciel & Réseaux",
        company="Société Camerounaise de Raffinage",
        level="Licence Professionnelle"
    )
    print("Coaching généré avec succès :", len(res.get("coaching", {}).get("presentation_plan", [])), "slides.")
