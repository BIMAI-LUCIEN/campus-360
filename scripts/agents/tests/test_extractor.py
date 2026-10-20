"""Extractor tests with a fake model: no network.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from extractor_agent import FIELDS, extract_fields  # noqa: E402

TEXT = (
    "HYST Consulting recrute un(e) Consultant(e) Junior en Contrôle Interne pour un stage pré-emploi "
    "de 6 mois à Douala. Envoyez CV et lettre à recrutement@hyst-consulting.com avant le 31 octobre 2026."
)


def answer(**fields):
    raw = {field: {"value": "", "quote": ""} for field in FIELDS}
    raw.update(fields)
    raw.setdefault("skills", ["Excel", " ", "audit"])
    raw.setdefault("summary", " Stage de contrôle interne. ")
    return raw


class ExtractorTests(unittest.TestCase):
    # extractor_agent does `from llm_client import call_json`: patch the name it reads.
    @mock.patch("extractor_agent.call_json")
    def test_quoted_fields_are_kept(self, fake):
        fake.return_value = answer(
            company={"value": "HYST Consulting", "quote": "HYST Consulting recrute"},
            city={"value": "Douala", "quote": "à Douala"},
            contact_email={"value": "recrutement@hyst-consulting.com", "quote": "recrutement@hyst-consulting.com"},
        )
        result = extract_fields("Stage Pré-Emploi", TEXT)
        self.assertEqual(result["fields"]["company"], "HYST Consulting")
        self.assertEqual(result["fields"]["city"], "Douala")
        self.assertIn("contact_email", result["evidence"])
        self.assertEqual(result["fields"]["skills"], ["Excel", "audit"])
        self.assertEqual(result["fields"]["summary"], "Stage de contrôle interne.")

    @mock.patch("extractor_agent.call_json")
    def test_invented_values_are_dropped(self, fake):
        fake.return_value = answer(
            stipend={"value": "75 000 FCFA", "quote": "75 000 FCFA par mois"},
            city={"value": "Yaoundé", "quote": "à Yaoundé"},
            duration={"value": "6 mois", "quote": ""},
        )
        fields = extract_fields("Stage Pré-Emploi", TEXT)["fields"]
        self.assertIsNone(fields["stipend"])
        self.assertIsNone(fields["city"])
        self.assertIsNone(fields["duration"])

    @mock.patch("extractor_agent.call_json")
    def test_empty_answer_gives_no_value(self, fake):
        fake.return_value = answer()
        result = extract_fields("Stage", TEXT)
        self.assertTrue(all(result["fields"][field] is None for field in FIELDS))
        self.assertEqual(result["evidence"], {})
        fake.assert_called_once()


if __name__ == "__main__":
    unittest.main()
