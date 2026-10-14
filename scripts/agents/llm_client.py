"""
Campus 360 — Single LLM client for the scraping pipeline.

Primary model: Claude Haiku 5.5, fallback: Gemini Flash, both through OpenRouter
(one key, structured JSON output). When every model fails we raise LLMUnavailable:
callers must put the offer on hold, never guess.
"""

import json
import logging
import os

import requests

from config import OPENROUTER_API_KEY

logger = logging.getLogger("LLMClient")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
PRIMARY_MODEL = os.getenv("SCRAPER_MODEL", "anthropic/claude-haiku-5.5")
FALLBACK_MODEL = os.getenv("SCRAPER_FALLBACK_MODEL", "google/gemini-3.8-flash")
TIMEOUT_SECONDS = 45


class LLMUnavailable(RuntimeError):
    """Raised when no model could produce a valid answer."""


def _strip_fences(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


def _call_model(model: str, system: str, prompt: str, schema_name: str, schema: dict) -> dict:
    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://campus360b.site",
            "X-Title": "Campus 360 Scraper Pipeline",
        },
        json={
            "model": model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": schema_name, "strict": True, "schema": schema},
            },
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    data = json.loads(_strip_fences(content))
    missing = [key for key in schema.get("required", []) if key not in data]
    if missing:
        raise ValueError(f"missing keys {missing}")
    return data


def call_json(system: str, prompt: str, schema_name: str, schema: dict) -> dict:
    """Returns the model answer validated against the schema's required keys."""
    if not OPENROUTER_API_KEY:
        raise LLMUnavailable("OPENROUTER_API_KEY is not configured")
    errors = []
    for model in (PRIMARY_MODEL, FALLBACK_MODEL):
        try:
            return _call_model(model, system, prompt, schema_name, schema)
        except Exception as error:  # network, HTTP, JSON or schema error: try the next model
            logger.warning("Model %s failed: %s", model, str(error)[:200])
            errors.append(f"{model}: {str(error)[:120]}")
    raise LLMUnavailable("; ".join(errors))
