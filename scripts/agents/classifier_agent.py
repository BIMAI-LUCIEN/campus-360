"""
Campus 360 — Agent 2: classifier (stage | emploi | concours | formation | bruit + confidence).
"""

from llm_client import call_json

CATEGORIES = ["stage", "emploi", "concours", "formation", "bruit"]

SYSTEM = (
    "Tu classes des publications collectées sur les réseaux sociaux et sites d'emploi au Cameroun. "
    "Catégories : 'stage' = une organisation nommée recrute des stagiaires (académique, professionnel, pré-emploi) ; "
    "'emploi' = une organisation nommée recrute pour un poste salarié (CDI, CDD, junior, consultant) ; "
    "'concours' = concours administratif ou d'entrée en école ; 'formation' = formation ou programme payant ; "
    "'bruit' = tout le reste (témoignage personnel, candidat qui cherche, publicité, annonce vague, hors Cameroun). "
    "La confiance (0 à 1) baisse si l'organisation, le poste ou le moyen de postuler sont flous. "
    "Ne devine jamais : en cas de doute, baisse la confiance."
)

SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
    "required": ["category", "confidence", "reason"],
    "additionalProperties": False,
}


def classify_post(title: str, text: str, platform: str = "WEB") -> dict:
    prompt = f"Plateforme : {platform}\nTitre : {title}\nTexte :\n{(text or '')[:4000]}"
    result = call_json(SYSTEM, prompt, "classification", SCHEMA)
    result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0))))
    return result
