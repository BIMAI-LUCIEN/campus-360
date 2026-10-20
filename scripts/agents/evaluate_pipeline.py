"""
Campus 360 — Measures the offer pipeline against hand-labelled offers (task 25.3).

Fixture: a JSON list of {"title", "description", "company", "city", "category", "publishable"}
labelled by a human (task 25.2). It holds real offers, so it stays OUT of git
(scripts/agents/tests/fixtures/ is ignored).

  python evaluate_pipeline.py --offline   fake model: measures the WIRING only (filter,
                                           verifier, counting), never the model's quality
  python evaluate_pipeline.py --live      real model calls (paid): only with the user's agreement

Prediction per offer: when the filter rejects it, the category its reason names (concours,
formation) or 'bruit'; else the decided kind; an offer
is predicted publishable when the verifier publishes it.
"""

import argparse
import json
import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_FIXTURE = Path(__file__).resolve().parent / "tests" / "fixtures" / "offers_labeled.json"
CATEGORIES = ["stage", "emploi", "concours", "formation", "bruit"]
FILTER_REASON_CATEGORY = {"concours": "concours", "formation payante": "formation"}


def _offline_answers():
    """A fixed fake model: every post is a confident internship with no extracted field."""
    classify = {"category": "stage", "confidence": 0.9, "reason": "faux modèle (mode hors ligne)"}
    extract = {field: {"value": "", "quote": ""} for field in
               ["title", "company", "city", "deadline", "duration", "stipend", "contact_email", "contact_whatsapp", "apply_url"]}
    extract.update({"skills": [], "summary": ""})
    return classify, extract


def fixture_items(offers: list) -> list:
    """Labelled offers turned into collector items (the labels are not passed on)."""
    return [{"platform": "WEB", "title": offer.get("title") or "", "snippet": offer.get("description") or "",
             "company": offer.get("company"), "url": offer.get("url")} for offer in offers]


def offline_llm():
    """Context manager: the fixed fake model on both model-calling agents."""
    from contextlib import ExitStack
    classify, extract = _offline_answers()
    stack = ExitStack()
    stack.enter_context(mock.patch("classifier_agent.call_json", return_value=classify))
    stack.enter_context(mock.patch("extractor_agent.call_json", return_value=extract))
    return stack


def predict(offers: list) -> list:
    from offer_pipeline import evaluate
    predictions = []
    for item in fixture_items(offers):
        result = evaluate(item, [])
        decision = result["decision"]
        if result["stage"] == "filter":
            # The filter's reason already names some categories; anything else is noise.
            category = FILTER_REASON_CATEGORY.get(decision.get("reason"), "bruit")
        else:
            category = decision.get("kind") or "bruit"
        predictions.append({"category": category, "publishable": decision.get("status") == "published"})
    return predictions


def scores(offers: list, predictions: list) -> dict:
    report = {}
    for category in CATEGORIES:
        tp = sum(1 for o, p in zip(offers, predictions) if o["category"] == category and p["category"] == category)
        predicted = sum(1 for p in predictions if p["category"] == category)
        actual = sum(1 for o in offers if o["category"] == category)
        report[category] = {
            "precision": round(tp / predicted, 2) if predicted else None,
            "recall": round(tp / actual, 2) if actual else None,
            "support": actual,
        }
    correct = sum(1 for o, p in zip(offers, predictions) if bool(o.get("publishable")) == p["publishable"])
    report["publishable_accuracy"] = round(correct / len(offers), 2) if offers else None
    return report


def run(fixture: Path, live: bool) -> dict:
    if not fixture.exists():
        raise FileNotFoundError(f"Jeu de référence absent : {fixture} (tâche 25.2).")
    offers = json.loads(fixture.read_text(encoding="utf-8"))
    if live:
        return scores(offers, predict(offers))
    with offline_llm():
        return scores(offers, predict(offers))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Mesure du pipeline d'offres sur le jeu étiqueté")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--offline", action="store_true", help="faux modèle : mesure le câblage seulement (défaut)")
    mode.add_argument("--live", action="store_true", help="vrais appels au modèle (payants)")
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    args = parser.parse_args(argv)
    try:
        report = run(args.fixture, live=args.live)
    except FileNotFoundError as error:
        print(error)
        return 1
    print("Mode :", "réel (modèle appelé)" if args.live else "hors ligne — câblage seulement, pas la qualité du modèle")
    for category in CATEGORIES:
        r = report[category]
        print(f"  {category:10} précision={r['precision']}  rappel={r['recall']}  ({r['support']} étiquetées)")
    print(f"  publiable : exactitude={report['publishable_accuracy']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
