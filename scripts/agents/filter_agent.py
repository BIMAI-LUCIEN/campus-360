"""
Campus 360 — Agent 1: hard-rule filter (no AI, deterministic, free).

Drops posts that can never be a valid internship/job offer before any model call.
Returns (ok, reason).
"""

import re
import unicodedata
from datetime import date

MIN_TEXT_LENGTH = 80

# Personal posts, candidate profiles and other noise.
NOISE_PATTERNS = [
    r"profil\s*cv", r"cvth[èe]que", r"candidat\s*ayant\s*un\s*niveau",
    r"officiellement\s*stagiaire", r"j'ai\s*trouv[ée]\s*(un|mon)\s*stage", r"trouv[ée]\s*mon\s*stage",
    r"je\s*cherche\s*un\s*(stage|emploi)", r"en\s*recherche\s*(active\s*)?de\s*stage",
    r"demande\s*de\s*rapport\s*de\s*stage", r"cherche\s*rapport\s*de\s*stage",
    r"nouvelle\s*aventure\s*commence",
]
# Public competitive exams are not offers.
EXAM_PATTERNS = [
    r"\bconcours\b", r"[ée]l[èe]ves?[\s-]*ma[îi]tres?", r"\bENIET\b", r"\bENS\b.*\badmission",
    r"avis\s*de\s*concours", r"recrutement\s*de\s*\d[\d\s]*\s*[ée]l[èe]ves",
]
# Paid trainings dressed up as offers.
TRAINING_PATTERNS = [
    r"formation\s*(payante|en\s*\w+\s*avec\s*immersion)", r"frais\s*de\s*(formation|inscription)",
    r"inscription\s*:\s*\d", r"co[uû]t\s*de\s*la\s*formation",
]
FOREIGN_PATTERNS = [r"\bmadagascar\b", r"\bambositra\b", r"\bc[ôo]te\s*d'ivoire\b", r"\babidjan\b", r"\bdakar\b", r"\bs[ée]n[ée]gal\b"]
CONTACT_PATTERNS = [
    r"[\w.+-]+@[\w-]+\.[\w.]+", r"(\+?237)?\s*6[\d\s]{8,}", r"https?://", r"postuler", r"candidature",
    r"envoy(er|ez)\s*(votre\s*)?(cv|dossier)", r"whatsapp",
]


def _matches(patterns: list, text: str) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)


def _has_past_year_only(text: str, today: date) -> bool:
    """True when the post mentions years and all of them are in the past."""
    years = {int(y) for y in re.findall(r"\b(20[12]\d)\b", text)}
    return bool(years) and max(years) < today.year


def filter_post(title: str, text: str, company: str = None, today: date = None, has_contact: bool = False) -> tuple:
    """has_contact: the collector already found a link, email or WhatsApp number for this post."""
    today = today or date.today()
    # NFKC turns the decorative bold letters of social posts back into plain letters.
    full = unicodedata.normalize("NFKC", f"{title or ''}\n{text or ''}")
    if len(full.strip()) < MIN_TEXT_LENGTH:
        return False, "texte trop court"
    if _matches(NOISE_PATTERNS, full):
        return False, "post personnel ou bruit"
    if _matches(EXAM_PATTERNS, full):
        return False, "concours"
    if _matches(TRAINING_PATTERNS, full):
        return False, "formation payante"
    if _matches(FOREIGN_PATTERNS, full) and not re.search(r"cameroun|douala|yaound", full, re.IGNORECASE):
        return False, "hors Cameroun"
    if _has_past_year_only(full, today):
        return False, "annonce datée d'une année passée"
    if not (company and company.strip()) and not has_contact and not _matches(CONTACT_PATTERNS, full):
        return False, "ni entreprise ni moyen de postuler"
    return True, "ok"
