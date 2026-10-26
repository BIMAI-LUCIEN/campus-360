"""
Campus 360 — Full offer text from the offer's own page.

Collectors fed by the Google News RSS (cameroon_jobs_agent, RSS fallbacks) only get the
feed summary (a title and ~150 characters). This module follows the link to the real
page (emploi.cm, minajobs, akwajobs...) and keeps the offer text word for word:
- Google News links are decoded to the publisher's URL (consent cookie, signed request);
- the page's main block is the one with the most text and few links, without menus,
  scripts, headers, footers or forms.
Standard library only (the VPS has no bs4 / lxml). The direct read is free; a page that
blocks robots (emploi.cm answers 403) or needs a login is read through Exa via Treg
(`exa.web.contents.get`, $0.001 per page read, nothing billed on failure), only on a
--live run and capped per run. Any failure keeps the text the item had.
"""

import json
import logging
import os
import re
import shutil
import subprocess
from html import unescape
from html.parser import HTMLParser
from urllib.parse import quote, urlparse

import config
from config import USER_AGENTS

logger = logging.getLogger("OfferPageReader")

MAX_TEXT_CHARS = 20000  # same limit as stage_jobs.description (migration 0018)
MIN_TEXT_CHARS = 200
SHORT_DESCRIPTION_CHARS = 600  # below this, the item only has a summary: read the page
HEADERS = {"User-Agent": USER_AGENTS[0], "Accept-Language": "fr,en;q=0.8"}
# Reject non-essential cookies on Google's consent wall (the VPS is in the EU).
GOOGLE_CONSENT = {"SOCS": "CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg", "CONSENT": "PENDING+987"}
GOOGLE_NEWS_DECODE = "https://news.google.com/_/DotsSplashUi/data/batchexecute"
EXA_ENDPOINT = "exa.web.contents.get"
QUOTA_STATUS = 429
# Pages that need a login: reading them gives a login wall, not the offer.
LOGIN_WALLS = ("facebook.com", "instagram.com", "tiktok.com", "linkedin.com", "x.com", "twitter.com")

SKIP_TAGS = {"script", "style", "noscript", "nav", "header", "footer", "aside", "form", "svg", "iframe", "button", "select"}
BLOCK_TAGS = {"p", "div", "li", "ul", "ol", "br", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "table", "dd", "dt"}
CONTAINER_TAGS = {"article", "main", "section", "div", "td"}
# Blocks the site itself marks as the offer or the main content weigh double.
MAIN_HINT = re.compile(r"job[-_]?(detail|desc|main|content|body)|offre|offer|description|entry-content|post-content|"
                       r"article-body|\bmain\b|\bcontent\b", re.IGNORECASE)
VOID_TAGS = {"br", "img", "hr", "input", "meta", "link", "source", "wbr", "area", "col", "embed", "param", "track"}


class _Node:
    __slots__ = ("tag", "parent", "children", "parts", "chars", "link_chars", "hint")

    def __init__(self, tag, parent):
        self.tag, self.parent, self.children, self.parts = tag, parent, [], []
        self.chars = self.link_chars = 0
        self.hint = tag in ("main", "article")


class _PageParser(HTMLParser):
    """Builds a light tree: per element, its text (in order, with line breaks) and link text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _Node("root", None)
        self.current = self.root
        # Skipped zone: only its own tag is counted, so an unclosed <li> inside a menu
        # cannot leave the rest of the page skipped.
        self.skip_tag = None
        self.skip_depth = 0
        self.link_depth = 0

    def handle_starttag(self, tag, attrs):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        if tag in SKIP_TAGS:
            self.skip_tag, self.skip_depth = tag, 1
            return
        if tag in BLOCK_TAGS:
            self.current.parts.append("\n")
        if tag in VOID_TAGS:
            return
        if tag == "a":
            self.link_depth += 1
        node = _Node(tag, self.current)
        marks = " ".join(value or "" for name, value in attrs if name in ("id", "class", "role", "itemprop"))
        node.hint = node.hint or bool(MAIN_HINT.search(marks))
        self.current.children.append(node)
        self.current.parts.append(node)
        self.current = node

    def handle_startendtag(self, tag, attrs):
        # <svg/>, <div/>: an element that opens and closes at once.
        if not self.skip_tag and tag not in SKIP_TAGS:
            self.handle_starttag(tag, attrs)
            if tag not in VOID_TAGS:
                self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if not self.skip_depth:
                    self.skip_tag = None
            return
        if tag in VOID_TAGS:
            return
        # Close up to the matching open tag (HTML in the wild is not always well nested).
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is self.root:
            return
        while self.current is not node:
            self._close(self.current)
        self._close(node)
        if tag == "a":
            self.link_depth = max(0, self.link_depth - 1)
        if tag in BLOCK_TAGS:
            self.current.parts.append("\n")

    def _close(self, node):
        self.current = node.parent

    def handle_data(self, data):
        if self.skip_tag or not data.strip():
            return
        self.current.parts.append(data)
        size = len(data.strip())
        node = self.current
        while node is not None:
            node.chars += size
            if self.link_depth:
                node.link_chars += size
            node = node.parent


def _text(node) -> str:
    out = []
    for part in node.parts:
        out.append(_text(part) if isinstance(part, _Node) else part)
    return "".join(out)


def _clean(text: str) -> str:
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in unescape(text).splitlines()]
    text = "\n".join(line for line in lines if line)
    return text.strip()


def _own(node) -> int:
    """Text outside links."""
    return node.chars - node.link_chars


def _weight(node) -> int:
    return _own(node) * (2 if node.hint else 1)


def _link_ratio(node) -> float:
    return node.link_chars / node.chars if node.chars else 1.0


def main_text(html: str):
    """Main block of a page, as plain text with line breaks. None when nothing substantial."""
    parser = _PageParser()
    try:
        parser.feed(html or "")
        parser.close()
    except Exception as error:  # malformed page
        logger.debug(f"Page illisible ({type(error).__name__}).")
        return None

    # The block with the most text outside links (a list of links is navigation)...
    best, stack = None, [parser.root]
    while stack:
        node = stack.pop()
        stack.extend(node.children)
        if node.tag in CONTAINER_TAGS and node.chars >= MIN_TEXT_CHARS and _link_ratio(node) < 0.35:
            if best is None or _weight(node) > _weight(best):
                best = node
    if best is None:
        return None
    # ...then narrowed to the child that holds almost all of that text (drops "related offers" around it).
    while True:
        inner = max((c for c in best.children if c.tag in CONTAINER_TAGS), key=_own, default=None)
        if inner is None or _own(inner) < 0.8 * _own(best) or _own(inner) < MIN_TEXT_CHARS:
            break
        best = inner
    text = _clean(_text(best))
    return text[:MAX_TEXT_CHARS] if len(text) >= MIN_TEXT_CHARS else None


def _host(url: str) -> str:
    host = (urlparse(url or "").hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def resolve_google_news(url: str, session=None):
    """Publisher URL behind a news.google.com/rss/articles/... link, else None."""
    if _host(url) != "news.google.com" or "/articles/" not in url:
        return url
    http = session or _requests()
    article_id = urlparse(url).path.rstrip("/").split("/")[-1]
    try:
        page = http.get(f"https://news.google.com/rss/articles/{article_id}", headers=HEADERS,
                        cookies=GOOGLE_CONSENT, timeout=15).text
        signature = re.search(r'data-n-a-sg="([^"]+)"', page)
        timestamp = re.search(r'data-n-a-ts="([^"]+)"', page)
        if not (signature and timestamp):
            return None
        request = json.dumps([
            "garturlreq",
            [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1],
             "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0],
            article_id, int(timestamp.group(1)), signature.group(1),
        ])
        answer = http.post(
            GOOGLE_NEWS_DECODE, timeout=15,
            data="f.req=" + quote(json.dumps([[["Fbv4je", request, None, "generic"]]])),
            headers={**HEADERS, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        ).text
        decoded = json.loads(json.loads(answer.split("\n\n")[1])[0][2])[1]
        return decoded if isinstance(decoded, str) and decoded.startswith("http") else None
    except Exception as error:
        logger.debug(f"Lien Google News non décodé ({type(error).__name__}).")
        return None


def _behind_login(url: str) -> bool:
    host = _host(url)
    return any(host == d or host.endswith("." + d) for d in LOGIN_WALLS)


class OfferPageReader:
    """Reads offer pages for one scraping run. Exa (paid) is used only when `live`."""

    def __init__(self, live=False, session=None, api_key=None, cli_path=None, base_url=None, max_paid_reads=None,
                 max_cost_usd=None, timeout=40, post=None, run_cli=None):
        self.live = live
        self.session = session
        self.api_key = config.TREG_API_KEY if api_key is None else api_key
        self.base_url = (base_url or config.TREG_BASE_URL).rstrip("/")
        self.max_paid_reads = config.TREG_MAX_PAGE_READS_PER_RUN if max_paid_reads is None else max_paid_reads
        self.max_cost_usd = max_cost_usd or config.TREG_MAX_COST_PER_CALL_USD
        self.timeout = timeout
        self._post = post
        self._run_cli = run_cli or subprocess.run
        self.cli_path = self._find_cli(cli_path)
        self.reset_run()

    @staticmethod
    def _find_cli(cli_path):
        if cli_path is not None:
            return cli_path or None
        if config.TREG_CLI and os.path.exists(config.TREG_CLI):
            return config.TREG_CLI
        return shutil.which("treg")

    def reset_run(self):
        self.paid_reads = 0
        self.exhausted = False

    def _http(self):
        if self.session is None:
            self.session = _requests()
        return self.session

    def read(self, url: str):
        """(publisher_url, full_text) for an offer link; full_text is None when nothing could be read."""
        real_url = resolve_google_news(url, self._http())
        if not real_url:
            return None, None
        text = None if _behind_login(real_url) else self._read_direct(real_url)
        if text is None:
            text = self._read_with_exa(real_url)
        return real_url, text

    def _read_direct(self, url: str):
        try:
            response = self._http().get(url, headers=HEADERS, timeout=20)
        except Exception as error:
            logger.debug(f"Page de l'offre injoignable ({type(error).__name__}).")
            return None
        if response.status_code != 200 or "html" not in (response.headers.get("Content-Type") or "html"):
            return None
        return main_text(response.text)

    def _read_with_exa(self, url: str):
        if not self.live or self.exhausted or not (self.api_key or self.cli_path):
            return None
        if self.paid_reads >= self.max_paid_reads:
            logger.warning(f"Lecture des pages : plafond de {self.max_paid_reads} lectures payantes atteint pour ce passage.")
            return None
        self.paid_reads += 1
        payload = self._treg({"urls": [url], "text": {"maxCharacters": MAX_TEXT_CHARS}})
        results = (payload or {}).get("results")
        if not isinstance(results, list) or not results or not isinstance(results[0], dict):
            return None
        text = _clean(results[0].get("text") or "")
        return text[:MAX_TEXT_CHARS] if len(text) >= MIN_TEXT_CHARS else None

    def _treg(self, body: dict):
        if self.api_key:
            try:
                post = self._post
                if post is None:
                    import requests
                    post = requests.post
                response = post(f"{self.base_url}/call/{EXA_ENDPOINT}", json=body, timeout=self.timeout,
                                headers={"X-Treg-Token": self.api_key, "X-Treg-Route-Max-Cost": str(self.max_cost_usd),
                                         "Content-Type": "application/json"})
            except Exception as error:
                logger.warning(f"Lecture de page via Treg : échec ({type(error).__name__}).")
                return None
            return self._read_answer(response.status_code, lambda: response.json())
        command = [self.cli_path, "--json", "call", EXA_ENDPOINT, "--method", "POST",
                   "--header", f"X-Treg-Route-Max-Cost: {self.max_cost_usd}", "--data", json.dumps(body)]
        try:
            done = self._run_cli(command, capture_output=True, text=True, timeout=self.timeout)
            wrapped = json.loads(done.stdout or "")
        except Exception as error:
            logger.warning(f"Lecture de page via le CLI Treg : échec ({type(error).__name__}).")
            return None
        status = (wrapped.get("_treg") or {}).get("http_status") or (200 if done.returncode == 0 else 0)
        return self._read_answer(status, lambda: wrapped.get("result"))

    def _read_answer(self, status, read_body):
        if status == QUOTA_STATUS:
            self.exhausted = True
            logger.warning("Lecture de page via Treg : quota atteint (429), arrêt pour ce passage.")
            return None
        if status != 200:
            logger.warning(f"Lecture de page via Treg : échec (HTTP {status}).")
            return None
        try:
            payload = read_body()
        except ValueError:
            return None
        return payload if isinstance(payload, dict) else None

    def enrich(self, item: dict) -> bool:
        """Replaces a feed summary with the offer's full text, in place. True when the text was read."""
        url = item.get("url") or ""
        if len(item.get("description") or "") >= SHORT_DESCRIPTION_CHARS or not url.startswith("http"):
            return False
        real_url, text = self.read(url)
        if real_url and real_url != url:
            item["url"] = real_url  # the student applies on the real page, not on a Google redirect
        if not text or len(text) <= len(item.get("description") or ""):
            return False
        item["description"] = text
        item["snippet"] = f"{item.get('title', '')}\n{text}"[:MAX_TEXT_CHARS]
        # Contacts that only the full page shows.
        if not item.get("contact_email"):
            email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+[a-z]", text, re.IGNORECASE)
            item["contact_email"] = email.group(0) if email else None
        if not item.get("contact_whatsapp"):
            phone = re.search(r"(?:\+?237[\s.-]?)?(6[5-9]\d(?:[\s.-]?\d{2}){3})", text)
            item["contact_whatsapp"] = "+237" + re.sub(r"\D", "", phone.group(1)) if phone else None
        return True


def enrich_with_full_text(item: dict, session=None) -> bool:
    """Free read only (no paid fallback). A scraping run uses OfferPageReader."""
    return OfferPageReader(live=False, session=session, api_key="", cli_path="").enrich(item)


def _requests():
    import requests
    return requests.Session()
