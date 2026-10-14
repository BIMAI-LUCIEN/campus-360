"""
Campus 360 — Offer pipeline: Filter -> Classifier -> Extractor -> Verifier -> store.

When the models are unavailable the post is kept for human review instead of being guessed.
"""

import logging

from classifier_agent import classify_post
from extractor_agent import extract_fields
from filter_agent import filter_post
from llm_client import LLMUnavailable
from verifier_agent import decide

logger = logging.getLogger("OfferPipeline")


def evaluate(item: dict, existing: list) -> dict:
    """Runs the 4 agents on a collected item. Returns {stage, decision, extraction}."""
    title, text = item.get("title", ""), item.get("snippet", "")
    has_contact = any(item.get(key) for key in ("url", "contact_email", "contact_whatsapp"))
    ok, reason = filter_post(title, text, item.get("company"), has_contact=has_contact)
    if not ok:
        return {"stage": "filter", "decision": {"status": "rejected", "kind": None, "confidence": 0.0, "reason": reason}}
    try:
        classification = classify_post(title, text, item.get("platform", "WEB"))
        if classification["category"] not in ("stage", "emploi"):
            return {"stage": "classifier", "decision": decide(classification, {"fields": {}}, existing)}
        extraction = extract_fields(title, text)
    except LLMUnavailable as error:
        logger.warning("LLM unavailable, offer kept for review: %s", error)
        return {"stage": "llm_unavailable", "decision": {"status": "pending_review", "kind": "stage", "confidence": 0.5,
                                                          "reason": "analyse IA indisponible"},
                "extraction": None}
    if not extraction["fields"].get("company") and item.get("company"):
        extraction["fields"]["company"] = item["company"]
    for key in ("contact_email", "contact_whatsapp"):
        if not extraction["fields"].get(key) and item.get(key):
            extraction["fields"][key] = item[key]
    if not extraction["fields"].get("apply_url") and item.get("url"):
        extraction["fields"]["apply_url"] = item["url"]
    return {"stage": "verifier", "decision": decide(classification, extraction, existing), "extraction": extraction}


def process(item: dict, store, existing: list) -> dict:
    """Evaluates then persists. Returns the decision with the stage that produced it."""
    result = evaluate(item, existing)
    decision = result["decision"]
    if decision["status"] == "rejected":
        store.log_rejection(result["stage"], decision["reason"], item)
    elif result.get("extraction") is None:
        # Models down: nothing reliable to store yet, journal it so the next run retries.
        store.log_rejection(result["stage"], decision["reason"], item)
        decision = {**decision, "status": "deferred"}
    else:
        job_id = store.save_offer(item, result["extraction"], decision)
        decision = {**decision, "job_id": job_id}
        existing.append({"company": result["extraction"]["fields"]["company"], "title": result["extraction"]["fields"].get("title") or ""})
    return {**decision, "stage": result["stage"], "title": item.get("title", "")}
