"""
Campus 360 — Agent 3: field extractor with evidence.

Every field must come with the exact quote of the source it was read from. The code
checks that the quote really exists in the source; otherwise the field is set to null.
No default value is ever invented.
"""

import re
import unicodedata

from llm_client import call_json

FIELDS = ["title", "company", "city", "deadline", "duration", "stipend", "contact_email", "contact_whatsapp", "apply_url"]

SYSTEM = (
    "Tu extrais les informations d'une offre de stage ou d'emploi au Cameroun. "
    "Pour chaque champ, donne la valeur ET la citation exacte (copiée mot pour mot) du texte qui la justifie. "
    "Si l'information n'est pas écrite dans le texte, mets value et quote à \"\" (chaîne vide). "
    "N'invente jamais de durée, de rémunération, de ville ou de contact. "
    "deadline au format AAAA-MM-JJ si une date limite est écrite. "
    "skills : compétences explicitement demandées (liste vide sinon). "
    "summary : 2 phrases factuelles sur les missions, sans rien ajouter au texte."
)

_FIELD_SCHEMA = {
    "type": "object",
    "properties": {"value": {"type": "string"}, "quote": {"type": "string"}},
    "required": ["value", "quote"],
    "additionalProperties": False,
}

SCHEMA = {
    "type": "object",
    "properties": {
        **{field: _FIELD_SCHEMA for field in FIELDS},
        "skills": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
    },
    "required": FIELDS + ["skills", "summary"],
    "additionalProperties": False,
}


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[\s’'`\"]+", " ", text).strip().lower()


def quote_in_source(quote: str, source: str) -> bool:
    quote_n = _normalize(quote)
    return len(quote_n) >= 2 and quote_n in _normalize(source)


def extract_fields(title: str, text: str) -> dict:
    source = f"{title or ''}\n{text or ''}"
    raw = call_json(SYSTEM, f"Titre : {title}\nTexte :\n{(text or '')[:5000]}", "extraction", SCHEMA)
    fields, evidence = {}, {}
    for field in FIELDS:
        item = raw.get(field) or {}
        value, quote = item.get("value"), item.get("quote")
        if value and quote and quote_in_source(quote, source):
            fields[field] = value.strip()
            evidence[field] = quote.strip()
        else:
            fields[field] = None
    fields["skills"] = [s.strip() for s in raw.get("skills", []) if s and s.strip()][:10]
    fields["summary"] = (raw.get("summary") or "").strip()
    return {"fields": fields, "evidence": evidence}
