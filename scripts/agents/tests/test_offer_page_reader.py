"""Full offer text tests: fake HTTP session, no network.

Run from scripts/agents: python -m unittest discover -s tests -p "test_*.py"
"""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from offer_page_reader import OfferPageReader, enrich_with_full_text, main_text, resolve_google_news  # noqa: E402

OFFER_BODY = (
    "<p>Pan-African Savings &amp; Loans Cameroun SA recrute un stagiaire en marketing pour son agence de Douala.</p>"
    "<h3>Missions</h3><ul><li>Participer aux campagnes de communication digitale de la banque.</li>"
    "<li>Suivre les indicateurs commerciaux et préparer les rapports hebdomadaires.</li></ul>"
    "<h3>Profil</h3><p>Bac+3 en marketing ou communication, maîtrise des réseaux sociaux.</p>"
    "<p>Dossier à envoyer à recrutement@pasl-cameroun.com ou par WhatsApp au 677 12 34 56 avant le 15 novembre 2026.</p>"
)
PAGE = (
    "<html><head><title>Stagiaire marketing</title><script>var tracking = 'x';</script></head><body>"
    "<header><nav><a href='/'>Accueil</a><a href='/offres'>Offres</a><a href='/contact'>Contact</a></nav></header>"
    "<div class='container'><div id='job-main'>" + OFFER_BODY + "</div>"
    "<div class='related'><a href='/1'>Comptable junior chez ABC SARL à Yaoundé</a><a href='/2'>Commercial terrain à Douala pour XYZ</a>"
    "<a href='/3'>Stagiaire RH chez une banque de la place à Bafoussam</a></div></div>"
    "<footer>© 2025 Minajobs. Tous droits réservés. Mentions légales et politique de confidentialité du site.</footer>"
    "</body></html>"
)
GOOGLE_LINK = "https://news.google.com/rss/articles/CBMiABC123?oc=5"
REAL_LINK = "https://cameroun.minajobs.net/emplois-stage-recrutement/44116/stagiaire-marketing"


class Response:
    def __init__(self, text="", status_code=200, content_type="text/html; charset=utf-8"):
        self.text, self.status_code, self.headers = text, status_code, {"Content-Type": content_type}


class JsonResponse:
    status_code = 200

    def __init__(self, body):
        self.body = body

    def json(self):
        return self.body


class FakeSession:
    """Google News article page, its decode endpoint, then the publisher's page."""

    def __init__(self, page=PAGE, page_status=200):
        self.page, self.page_status, self.urls = page, page_status, []

    def get(self, url, **kwargs):
        self.urls.append(url)
        if "news.google.com" in url:
            return Response('<c-wiz data-n-a-sg="SIG" data-n-a-ts="1761470000"></c-wiz>')
        return Response(self.page, self.page_status)

    def post(self, url, data=None, **kwargs):
        inner = json.dumps([None, REAL_LINK])
        return Response(")]}'\n\n" + json.dumps([["wrb.fr", "Fbv4je", inner]]))


class MainTextTests(unittest.TestCase):
    def test_keeps_the_offer_and_drops_menus_related_offers_and_footer(self):
        text = main_text(PAGE)
        self.assertIn("recrute un stagiaire en marketing", text)
        self.assertIn("Participer aux campagnes", text)
        self.assertIn("avant le 15 novembre 2026", text)
        self.assertIn("Pan-African Savings & Loans", text)  # entities decoded
        for noise in ("Accueil", "Comptable junior", "© 2025", "tracking"):
            self.assertNotIn(noise, text)

    def test_keeps_line_breaks_between_blocks(self):
        self.assertIn("\nMissions\n", main_text(PAGE))

    def test_page_without_substantial_text(self):
        self.assertIsNone(main_text("<html><body><a href='/'>Accueil</a></body></html>"))


class EnrichTests(unittest.TestCase):
    def item(self, **kwargs):
        base = {"title": "Avis de recrutement : stagiaire marketing", "url": GOOGLE_LINK,
                "description": "Stagiaire marketing - Minajobs", "snippet": "Stagiaire marketing - Minajobs"}
        base.update(kwargs)
        return base

    def test_google_news_link_is_decoded(self):
        self.assertEqual(resolve_google_news(GOOGLE_LINK, FakeSession()), REAL_LINK)

    def test_feed_summary_replaced_by_full_text_and_real_link(self):
        item = self.item()
        self.assertTrue(enrich_with_full_text(item, FakeSession()))
        self.assertEqual(item["url"], REAL_LINK)
        self.assertIn("Bac+3 en marketing", item["description"])
        self.assertIn("Bac+3 en marketing", item["snippet"])
        self.assertEqual(item["contact_email"], "recrutement@pasl-cameroun.com")
        self.assertEqual(item["contact_whatsapp"], "+237677123456")

    def test_long_description_is_left_alone(self):
        session = FakeSession()
        item = self.item(description="x" * 800)
        self.assertFalse(enrich_with_full_text(item, session))
        self.assertEqual(session.urls, [])

    def test_login_wall_keeps_the_summary(self):
        session = FakeSession()
        item = self.item(url="https://www.facebook.com/LesOpportunites2/posts/123")
        self.assertFalse(enrich_with_full_text(item, session))
        self.assertEqual(item["description"], "Stagiaire marketing - Minajobs")
        self.assertEqual(session.urls, [])

    def test_unreadable_page_keeps_the_summary(self):
        item = self.item()
        self.assertFalse(enrich_with_full_text(item, FakeSession(page_status=403)))
        self.assertEqual(item["description"], "Stagiaire marketing - Minajobs")
        self.assertEqual(item["url"], REAL_LINK)


EXA_TEXT = ("Stagiaire QHSE - Mfoundi Mall\n## Entreprise\nAXIS PL SARL\n## Poste proposé\n"
            "Appui au service QHSE dans la mise en oeuvre et le suivi des activités qualité, hygiène, sécurité. " * 3)


class PaidFallbackTests(unittest.TestCase):
    def reader(self, live, answer=None):
        sent = []

        def post(url, json=None, **kwargs):
            sent.append((url, json))
            body = answer if answer is not None else {"results": [{"url": json["urls"][0], "text": EXA_TEXT}]}
            return JsonResponse(body)

        reader = OfferPageReader(live=live, session=FakeSession(page_status=403), api_key="test", cli_path="",
                                 max_paid_reads=2, post=post)
        reader.sent = sent
        return reader

    def item(self):
        return {"title": "Stagiaire QHSE", "url": GOOGLE_LINK, "description": "Stagiaire QHSE - emploi.cm"}

    def test_blocked_page_read_through_exa_on_live_run(self):
        reader, item = self.reader(live=True), self.item()
        self.assertTrue(reader.enrich(item))
        self.assertIn("AXIS PL SARL", item["description"])
        self.assertTrue(reader.sent[0][0].endswith("/call/exa.web.contents.get"))
        self.assertEqual(reader.sent[0][1]["urls"], [REAL_LINK])

    def test_no_paid_read_without_live(self):
        reader, item = self.reader(live=False), self.item()
        self.assertFalse(reader.enrich(item))
        self.assertEqual(reader.sent, [])

    def test_paid_reads_are_capped(self):
        reader = self.reader(live=True)
        for _ in range(3):
            reader.enrich(self.item())
        self.assertEqual(len(reader.sent), 2)

    def test_login_wall_goes_straight_to_exa(self):
        reader = self.reader(live=True)
        item = {"title": "Stage", "url": "https://www.facebook.com/page/posts/1", "description": "court"}
        self.assertTrue(reader.enrich(item))
        self.assertEqual(reader.session.urls, [])  # no direct read of a login page


class MainHintTests(unittest.TestCase):
    def test_block_marked_as_the_offer_beats_a_longer_site_intro(self):
        # minajobs: the site's intro in a <td> is a little longer than the offer itself.
        html = ("<html><body><table><tr><td>" + "Explorez des milliers d'offres d'emplois au Cameroun. " * 22 + "</td></tr></table>"
                "<div id='job-main' class='job-detail-holder'><h4>Avis de recrutement : STAGIAIRE MARKETING</h4><p>"
                + "Missions du stagiaire marketing à Douala. " * 22 + "</p></div></body></html>")
        text = main_text(html)
        self.assertTrue(text.startswith("Avis de recrutement"))
        self.assertNotIn("Explorez", text)


class UnclosedTagTests(unittest.TestCase):
    def test_unclosed_item_in_a_menu_does_not_hide_the_page(self):
        html = ("<html><body><nav><ul><li>Accueil<li>Offres</ul></nav><select><option>Ville</select><svg/>"
                "<div><p>" + "Texte complet de l'offre de stage. " * 20 + "</p></div></body></html>")
        self.assertIn("Texte complet de l'offre", main_text(html))


if __name__ == "__main__":
    unittest.main()
