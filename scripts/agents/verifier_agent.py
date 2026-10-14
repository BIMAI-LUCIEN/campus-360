"""
Campus 360 — Agent 4: verifier + final decision.

Checks company, duplicates and deadline, then decides:
  published (score >= 0.8), pending_review (0.5 - 0.8, with a reason), rejected (< 0.5).
Pure functions: the caller passes the recent offers used for duplicate detection.
"""

import re
import unicodedata
from datetime import date
from difflib import SequenceMatcher

PUBLISH_THRESHOLD = 0.8
REVIEW_THRESHOLD = 0.5
DUPLICATE_SIMILARITY = 0.85

GENERIC_COMPANIES = {
    "entreprise partenaire", "entreprise de la place", "entreprise xyz", "non specifiee", "non precisee",
    "inconnu", "aucune", "particulier", "minajobs", "emploi.cm", "confidentiel", "notre client", "une entreprise",
}
LEGAL_SUFFIXES = r"\b(s\.?a\.?r\.?l\.?|s\.?a\.?s?\.?|sarl|sa|sas|inc|ltd|plc|group|groupe|cameroun|cameroon|consulting)\b"


def _ascii(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(ch for ch in text if not unicodedata.combining(ch)).lower()


def normalize_company(name: str) -> str:
    text = re.sub(LEGAL_SUFFIXES, " ", _ascii(name))
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def normalize_title(title: str) -> str:
    text = _ascii(title)
    text = re.sub(r"\bat\b.*$", " ", text)  # "... at COMPANY" suffix of aggregators
    text = re.sub(r"(avis de recrutement|offre de stage|jobs? opportunities?|recrutement)\s*:?", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _similar_titles(a: str, b: str) -> bool:
    if SequenceMatcher(None, a, b).ratio() >= DUPLICATE_SIMILARITY:
        return True
    # One title is a shortened form of the other ("RH" vs "Ressources Humaines (RH)").
    tokens_a, tokens_b = set(a.split()), set(b.split())
    small, large = sorted((tokens_a, tokens_b), key=len)
    return len(small) >= 3 and len(small & large) / len(small) >= 0.9


def is_duplicate(company: str, title: str, existing: list) -> bool:
    """existing: list of dicts with 'company' and 'title' (recent offers)."""
    company_n, title_n = normalize_company(company), normalize_title(title)
    if not company_n:
        return False
    for offer in existing:
        other_company = normalize_company(offer.get("company", ""))
        same_company = other_company == company_n or (
            min(len(other_company), len(company_n)) >= 4 and (other_company in company_n or company_n in other_company)
        )
        if same_company and _similar_titles(title_n, normalize_title(offer.get("title", ""))):
            return True
    return False


def decide(classification: dict, extraction: dict, existing: list, today: date = None) -> dict:
    """Returns {status, kind, confidence, reason}."""
    today = today or date.today()
    category = classification.get("category")
    if category not in ("stage", "emploi"):
        return {"status": "rejected", "kind": None, "confidence": 0.0, "reason": f"catégorie {category}"}

    fields = extraction.get("fields", {})
    score = float(classification.get("confidence", 0))
    doubts = []

    company = fields.get("company") or ""
    if company and normalize_company(company) in {normalize_company(c) for c in GENERIC_COMPANIES}:
        return {"status": "rejected", "kind": category, "confidence": 0.0, "reason": "entreprise générique"}
    if not company:
        if fields.get("apply_url") and score >= PUBLISH_THRESHOLD:
            # The excerpt is too short to name the company: a human checks the source.
            return {"status": "pending_review", "kind": category, "confidence": REVIEW_THRESHOLD,
                    "reason": "entreprise non visible dans l'extrait, vérifier la source"}
        return {"status": "rejected", "kind": category, "confidence": 0.0, "reason": "entreprise absente"}

    if is_duplicate(company, fields.get("title") or "", existing):
        return {"status": "rejected", "kind": category, "confidence": 0.0, "reason": "doublon d'une offre existante"}

    deadline = fields.get("deadline")
    if deadline:
        try:
            if date.fromisoformat(deadline[:10]) < today:
                return {"status": "rejected", "kind": category, "confidence": 0.0, "reason": "date limite dépassée"}
        except ValueError:
            doubts.append("date limite illisible")
            score -= 0.05

    if not any(fields.get(key) for key in ("contact_email", "contact_whatsapp", "apply_url")):
        doubts.append("aucun moyen de postuler trouvé")
        score -= 0.2
    if not fields.get("city"):
        doubts.append("ville non précisée")
        score -= 0.05

    score = round(max(0.0, min(1.0, score)), 3)
    if score >= PUBLISH_THRESHOLD:
        status = "published"
    elif score >= REVIEW_THRESHOLD:
        status = "pending_review"
    else:
        status = "rejected"
    reason = "; ".join(doubts) or classification.get("reason", "ok")
    if status == "pending_review" and not doubts:
        reason = f"confiance du classifieur {score:.2f} : {classification.get('reason', '')}"
    return {"status": status, "kind": category, "confidence": score, "reason": reason}
