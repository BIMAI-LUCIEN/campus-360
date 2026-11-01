"""
Campus 360 — Agent 6: automatic reviewer.

Takes the scraped offers left in `pending_review` and settles each one, so no offer waits
for a human: published when it is reliable, rejected otherwise. Fixed rules first (free),
then one model call per remaining offer. When the models are down the offer stays pending
and the next run tries again.
"""

import logging
from datetime import datetime, timezone

from llm_client import LLMUnavailable, call_json
from verifier_agent import is_duplicate, normalize_company

logger = logging.getLogger("AutoReviewAgent")

REVIEWER = "agent:relecture-auto"
MAX_AGE_DAYS = 60
MAX_REVIEWS_PER_RUN = 40
UNKNOWN_COMPANY = "Entreprise à identifier (voir la source)"

# The model may only reject for one of these reasons; "aucun" means the offer is published.
MOTIVES = {
    "aucun": None,
    "pas_une_offre": "pas un appel à candidature (témoignage, publicité, vidéo de présentation)",
    "hors_cameroun": "poste hors du Cameroun",
    "expiree": "annonce expirée ou date limite passée",
    "organisation_incoherente": "organisation absente ou différente de celle que décrit le texte",
    "arnaque_ou_frais": "frais demandés, formation payante ou signes d'arnaque",
    "profil_senior": "poste réservé à un profil très expérimenté",
}

SYSTEM = (
    "Tu relis des offres de stage et d'emploi collectées automatiquement pour une application destinée aux "
    "étudiants et jeunes diplômés du Cameroun. Personne ne relira après toi. Tu choisis un seul motif :\n"
    "- 'pas_une_offre' : aucun appel à candidature (témoignage, publicité, vidéo qui montre une journée de stage) ;\n"
    "- 'hors_cameroun' : le texte situe le poste hors du Cameroun, ou ne cite aucune ville ni aucun lieu du Cameroun "
    "(une annonce en arabe ou d'un programme étranger sans lieu camerounais est hors Cameroun) ;\n"
    "- 'expiree' : le texte dit que l'annonce est expirée, sa date limite est passée à la date du jour, ou le texte "
    "indique une publication de plus de 60 jours avant la date du jour ;\n"
    "- 'organisation_incoherente' : aucune organisation nommée dans le texte, ou le texte décrit une autre organisation "
    "que celle donnée et tu ne peux pas nommer le vrai recruteur ;\n"
    "- 'arnaque_ou_frais' : frais demandés au candidat, formation payante, promesses irréalistes ;\n"
    "- 'profil_senior' : poste de direction ou exigeant 8 ans d'expérience ou plus ;\n"
    "- 'aucun' : rien de ce qui précède, l'offre est publiée.\n"
    "Ne sont PAS des motifs de rejet : une présence en ligne faible, un texte tronqué, l'absence de date limite, une "
    "date de publication inconnue (l'annonce a été collectée récemment), un lien que le robot n'a pas pu ouvrir, "
    "l'absence d'e-mail ou de WhatsApp (le lien vers la page d'origine, même sur un site d'annonces comme emploi.cm, "
    "suffit pour postuler), les doutes notés par le pipeline. "
    "Si l'entreprise est marquée 'à identifier', ou si le nom fourni est un site d'annonces (ReliefWeb, emploi.cm, "
    "Minajobs…) ou un autre nom que le vrai recruteur, donne dans 'company' le nom du vrai recruteur recopié tel "
    "qu'il apparaît dans le texte ; sinon une chaîne vide. La raison tient en une phrase."
)

SCHEMA = {
    "type": "object",
    "properties": {
        "motive": {"type": "string", "enum": list(MOTIVES)},
        "reason": {"type": "string"},
        "company": {"type": "string"},
    },
    "required": ["motive", "reason", "company"],
    "additionalProperties": False,
}


def _days_since(moment, now: datetime):
    if not moment:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (now - moment).days


def rule_verdict(offer: dict, now: datetime = None):
    """('reject', reason) from the fixed rules, or None when the model has to decide."""
    now = now or datetime.now(timezone.utc)
    age = _days_since(offer.get("source_published_at"), now)
    if age is not None and age > MAX_AGE_DAYS:
        return "reject", f"annonce publiée il y a {age} jours, sans doute pourvue"
    expires_at = offer.get("expires_at")
    if expires_at and _days_since(expires_at, now) is not None and _days_since(expires_at, now) > 0:
        return "reject", "date limite dépassée"
    return None


def model_verdict(offer: dict, now: datetime = None) -> dict:
    """{'motive', 'reason', 'company'} from the model. Raises LLMUnavailable."""
    now = now or datetime.now(timezone.utc)
    published, collected = offer.get("source_published_at"), offer.get("created_at")
    prompt = "\n".join([
        f"Date du jour : {now.date().isoformat()}",
        f"Type : {offer.get('kind')}",
        f"Titre : {offer.get('title')}",
        f"Entreprise : {offer.get('company')}",
        f"Ville : {offer.get('location') or 'non précisée'}",
        f"Publiée le : {published.date().isoformat() if published else 'inconnu'}",
        f"Collectée le : {collected.date().isoformat() if collected else 'inconnu'}",
        f"Moyen de postuler : {offer.get('apply_method')} ; e-mail : {offer.get('contact_email') or 'aucun'} ; "
        f"WhatsApp : {offer.get('contact_whatsapp') or 'aucun'} ; page d'origine : {offer.get('source_url') or 'aucune'}",
        f"Doutes du pipeline : {offer.get('review_reason') or 'aucun'}",
        "Texte de l'annonce :",
        (offer.get("description") or "")[:6000],
    ])
    result = call_json(SYSTEM, prompt, "relecture", SCHEMA)
    if result.get("motive") not in MOTIVES:
        raise LLMUnavailable(f"motif illisible : {result.get('motive')!r}")
    return result


def _identified_company(offer: dict, verdict: dict):
    """The company the model read in the text, only when it is really written there."""
    name = (verdict.get("company") or "").strip()
    if not name or normalize_company(name) in ("", normalize_company(UNKNOWN_COMPANY)):
        return None
    return name if name.lower() in (offer.get("description") or "").lower() else None


def review_offer(offer: dict, now: datetime = None) -> dict:
    """{'status': published | rejected | pending_review, 'reason', 'company'} for one pending offer."""
    rule = rule_verdict(offer, now)
    if rule:
        return {"status": "rejected", "reason": rule[1], "company": None}
    try:
        verdict = model_verdict(offer, now)
    except LLMUnavailable as error:
        logger.warning("Relecture automatique reportée (modèle indisponible) : %s", str(error)[:200])
        return {"status": "pending_review", "reason": "relecture reportée, modèle indisponible", "company": None}
    # The real recruiter, when the model read one in the text (unidentified or aggregator name).
    company = _identified_company(offer, verdict)
    if company and normalize_company(company) == normalize_company(offer.get("company") or ""):
        company = None
    unknown = normalize_company(offer.get("company") or "") in ("", normalize_company(UNKNOWN_COMPANY))
    publish = verdict["motive"] == "aucun"
    if unknown and publish and not company:
        return {"status": "rejected", "reason": "entreprise introuvable dans l'annonce", "company": None}
    reason = (verdict.get("reason") or "").strip() or (MOTIVES[verdict["motive"]] or "offre fiable")
    return {"status": "published" if publish else "rejected", "reason": reason[:400], "company": company}


def review_pending(store, dry_run: bool = False, limit: int = MAX_REVIEWS_PER_RUN, now: datetime = None) -> dict:
    """Settles the pending scraped offers. Returns the count per outcome."""
    counts = {"published": 0, "rejected": 0, "pending_review": 0}
    offers = store.pending_offers(limit)
    published = []  # the same posting often comes back under two names until the recruiter is found
    for offer in offers:
        result = review_offer(offer, now)
        if result["status"] == "published":
            company = result["company"] or offer.get("company") or ""
            if is_duplicate(company, offer.get("title") or "", published):
                result = {"status": "rejected", "reason": "doublon d'une offre publiée dans la même relecture", "company": None}
            else:
                published.append({"company": company, "title": offer.get("title") or ""})
        counts[result["status"]] += 1
        logger.info(f"   Relecture auto [{offer.get('title', '')[:50]}] -> {result['status']} : {result['reason']}")
        if result["status"] != "pending_review" and not dry_run:
            store.settle_review(offer["id"], result["status"], result["reason"], REVIEWER, result["company"])
    if offers:
        logger.info(f"Relecture automatique : {len(offers)} offre(s) en attente traitée(s) : {counts}.")
    return counts
