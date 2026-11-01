#!/usr/bin/env python3
"""Daily, conservative DC apartment research snapshot.

Checks each building's recorded official or listing source. Only The Hale's
structured, server-rendered floor-plan text is parsed for unit-level offers.
All other source checks are connectivity/review prompts, NOT live pricing.
Never infer that a unit available before Feb 7 is holdable until Feb 7.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = "2027-02-07"
UA = "DC-Apartment-Finder/1.0 (personal research; one request per source daily)"

class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tokens = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "svg"):
            self.skip += 1
        if tag in ("p", "div", "section", "h3", "h4", "h5", "li", "br"):
            self.tokens.append("\n")
    def handle_endtag(self, tag):
        if tag in ("script", "style", "svg"):
            self.skip = max(0, self.skip - 1)
        if tag in ("p", "div", "section", "h3", "h4", "h5", "li"):
            self.tokens.append("\n")
    def handle_data(self, data):
        if not self.skip:
            self.tokens.append(data)
    def text(self):
        return re.sub(r"[ \t]+", " ", "".join(self.tokens))

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=14) as response:
        if response.status != 200:
            raise ValueError("HTTP " + str(response.status))
        ctype = response.headers.get("Content-Type", "")
        if "html" not in ctype.lower():
            raise ValueError("Unexpected content type: " + ctype)
        raw = response.read(1_500_000)
    parser = PageText()
    parser.feed(raw.decode("utf-8", "replace"))
    return parser.text()

def parse_hale(text):
    # Only trust these precisely recognizable server-rendered floor-plan blocks.
    results = []
    flat = re.sub(r"\s+", " ", text)
    pattern = re.compile(
        r"\b(S\d+|A\d+)\s+(Studio|1\s*BR\s*/\s*1(?:\.0)?\s*BA)"
        r"\s*,?\s*([\d,]+)\s*sq\s*ft"
        r".{0,190}?from\s*\$([\d,]+)"
        r".{0,120}?(Available Now|\d+\s+available\s+\d{1,2}\.20\d{2})",
        re.I,
    )
    for m in pattern.finditer(flat):
        code, typ, sqft, price, availability = m.groups()
        month = re.search(r"(\d{1,2})\.(20\d{2})", availability)
        status = "available-now" if not month else "month-only"
        results.append({
            "plan": code, "bedrooms": 0 if code.startswith("S") else 1,
            "sqft": int(sqft.replace(",", "")),
            "baseRent": int(price.replace(",", "")),
            "availability": availability.strip(),
            "availabilityStatus": status,
            "feb7Confirmed": False,
            "moveInNote": "No unit-specific Feb 7 start date confirmed; contact leasing.",
        })
    return results

def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r"var EMBEDDED = (\{.*?\});\s*function work", html, re.S)
    if not match:
        raise SystemExit("Unable to read embedded property list")
    embedded = json.loads(match.group(1))
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    records, units = [], []
    seen = set()
    for prop in embedded["listings"]:
        links = prop.get("links") or []
        entry = next((x for x in links if x.get("official")), None)
        if entry is None:
            entry = next((x for x in links if x.get("src")), None)
        if entry is None:
            records.append({"name": prop["name"], "result": "no-source",
                            "note": "No direct official/listing URL configured"})
            continue
        url = entry["url"]
        record = {"name": prop["name"], "sourceUrl": url, "checkedAt": now}
        if url in seen:
            record["result"] = "duplicate-url"
            records.append(record)
            continue
        seen.add(url)
        try:
            page = fetch(url)
            record["result"] = "reachable"
            record["note"] = "Page reachable, but unit-level availability not automatically verified"
            if prop["name"] == "The Hale":
                found = parse_hale(page)
                units.extend(found)
                record["result"] = "parsed" if found else "parse-failed"
                record["note"] = ("Parsed " + str(len(found)) + " floor-plan offers; no Feb 7 unit verified"
                                  if found else "The Hale page structure changed; review manually")
                record["unitCount"] = len(found)
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as err:
            record["result"] = "unavailable"
            record["note"] = str(err)[:150]
        records.append(record)
    out = {
        "generated": now, "targetMoveIn": TARGET,
        "source": "Daily direct-page checks (not a guaranteed live inventory feed)",
        "feb7ConfirmedCount": 0,
        "units": units,
        "checks": records,
        "explanation": "Only exact dated and independently verified availability for February 7 counts as confirmed. Other units need leasing confirmation. Base rent excludes parking and some fees.",
    }
    path = ROOT / "data" / "live.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Checked", len(records), "buildings; parsed", len(units),
          "floor-plan offers; confirmed Feb 7: 0. Wrote", path)

if __name__ == "__main__":
    main()
