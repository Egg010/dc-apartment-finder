#!/usr/bin/env python3
"""Conservative apartment-source monitor with dated unit observations.

Source checks are NOT equivalent to price checks. Only explicit, recognized
unit/floorplan offers are stored as observed prices. The target move-in is NOT
inferred from an earlier advertised availability date.
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
TARGET = "2027-02-07"
MAX_HISTORY = 12000
UA = "DC-Apartment-Finder/2.0 (personal rental research; daily polite monitoring)"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class PageText(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tokens: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style", "svg"):
            self.skip += 1
        if tag in ("div", "p", "section", "h2", "h3", "h4", "li", "tr", "td", "br"):
            self.tokens.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "svg"):
            self.skip = max(0, self.skip - 1)
        if tag in ("div", "p", "section", "h2", "h3", "h4", "li", "tr", "td"):
            self.tokens.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip:
            self.tokens.append(data)

    def text(self) -> str:
        return re.sub(r"[ \t]+", " ", "".join(self.tokens))


def fetch_page(url: str) -> str:
    request = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "text/html",
    })
    with urllib.request.urlopen(request, timeout=18) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        if "html" not in response.headers.get("Content-Type", "").lower():
            raise ValueError("Not an HTML page")
        raw = response.read(2_000_000)
    parser = PageText()
    parser.feed(raw.decode("utf-8", "replace"))
    return parser.text()


def read_embedded() -> dict[str, Any]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r"var EMBEDDED = (\{.*?\});\s*function work", html, re.S)
    if not match:
        raise ValueError("Could not locate embedded listing data in index.html")
    data = json.loads(match.group(1))
    if len(data.get("listings", [])) < 20:
        raise ValueError("Unexpectedly small apartment inventory")
    return data


def source_url(property_data: dict[str, Any]) -> str | None:
    links = property_data.get("links") or []
    # A source explicitly marked as a price source is preferable to a generic
    # home page that might have no inventory.
    preferred = next((x for x in links if x.get("src")), None)
    if preferred:
        return preferred["url"]
    official = next((x for x in links if x.get("official")), None)
    return official["url"] if official else None


def hale_units(text: str, building: str, url: str) -> list[dict[str, Any]]:
    """Parse explicit floor-plan offers, never infer exact unit numbers."""
    clean = re.sub(r"\s+", " ", text.replace("\u00a0", " "))
    pattern = re.compile(
        r"\b(?P<plan>S\d{1,2}|A\d{1,2})\s+"
        r"(?P<type>Studio|1\s*BR\s*/\s*1(?:\.0)?\s*BA)"
        r",?\s*(?P<sqft>[\d,]+)\s*sq\s*ft"
        r".{0,170}?\bfrom\s*\$(?P<rent>[\d,]+)"
        r".{0,125}?(?P<available>\d+\s+Available Now|\d+\s+available\s+\d{1,2}\.20\d{2})",
        re.I,
    )
    result: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()
    for match in pattern.finditer(clean):
        g = match.groupdict()
        code = g["plan"].upper()
        price = int(g["rent"].replace(",", ""))
        sqft = int(g["sqft"].replace(",", ""))
        if not (300 <= sqft <= 1600 and 1000 <= price <= 8000):
            continue
        if (code, price) in seen:
            continue
        seen.add((code, price))
        result.append({
            "building": building,
            "unit": None,
            "plan": code,
            "bedrooms": 0 if code.startswith("S") else 1,
            "sqft": sqft,
            "baseRent": price,
            "totalRent": None,
            "priceBasis": "base",
            "availableDate": None,  # Month-only and 'Now' are not exact dates
            "availability": g["available"],
            "availabilityPrecision": "month" if "." in g["available"] else "now",
            "feb7Confirmed": False,
            "sourceUrl": url,
            "sourceType": "official-floor-plan",
            "sourceConfidence": "plan-price-only",
        })
    return result


def hotpads_summary(text: str) -> dict[str, Any] | None:
    """Read only explicit building-level 1BR starting-price statements."""
    clean = re.sub(r"\s+", " ", text)
    match = re.search(
        r"There are\s+(\d+)\s+one-bedroom apartments?\s+available"
        r"\s+starting at\s+\$([\d,]+)", clean, re.I,
    )
    if not match:
        return None
    count, price = int(match.group(1)), int(match.group(2).replace(",", ""))
    if not (0 < count < 1000 and 1000 <= price <= 10000):
        return None
    return {"oneBrCount": count, "oneBrStartingTotal": price,
            "note": "Building-wide 1BR price only; NOT a unit-level offer."}


def extract_offers(property_data: dict[str, Any], text: str, url: str):
    """Return unit observations and optional weaker building-level evidence."""
    if property_data["name"] == "The Hale":
        return hale_units(text, property_data["name"], url), None
    if "hotpads.com" in url.lower():
        return [], hotpads_summary(text)
    return [], None


def observed(unit: dict[str, Any], when: str) -> dict[str, Any]:
    rent = unit["totalRent"] if unit.get("totalRent") is not None else unit.get("baseRent")
    return {
        "building": unit["building"],
        "unit": unit.get("unit"),
        "plan": unit.get("plan"),
        "bedrooms": unit.get("bedrooms"),
        "price": rent,
        "priceBasis": unit.get("priceBasis", "unknown"),
        "availableDate": unit.get("availableDate"),
        "observedAt": when,
        "sourceUrl": unit["sourceUrl"],
        "sourceConfidence": unit.get("sourceConfidence"),
    }


def update_history(existing: dict[str, Any], units: list[dict[str, Any]], when: str):
    previous = existing.get("observations", [])
    if not isinstance(previous, list):
        previous = []
    # One offer per property/plan/unit/type/price basis each calendar day.
    output: dict[tuple, dict[str, Any]] = {}
    for old in previous:
        if not isinstance(old, dict) or not isinstance(old.get("price"), (int, float)):
            continue
        key = (old.get("observedAt", "")[:10], old.get("building"),
               old.get("unit"), old.get("plan"), old.get("bedrooms"),
               old.get("priceBasis"))
        output[key] = old
    for unit in units:
        item = observed(unit, when)
        if item["price"] is None:
            continue
        key = (when[:10], item["building"], item["unit"], item["plan"],
               item["bedrooms"], item["priceBasis"])
        output[key] = item
    records = sorted(output.values(), key=lambda row: row["observedAt"])[-MAX_HISTORY:]
    return {"updatedAt": when, "observations": records,
            "note": "Plan-level offers are NOT identical-unit repeat sales. Compare cautious like-for-like published prices only."}


def safe_read_json(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return default
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else default
    except (OSError, json.JSONDecodeError):
        return default


def main() -> None:
    data = read_embedded()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    records: list[dict[str, Any]] = []
    units: list[dict[str, Any]] = []
    for property_data in data["listings"]:
        name = property_data["name"]
        url = source_url(property_data)
        if not url:
            records.append({"name": name, "result": "no-source",
                            "note": "No configured direct price/official source"})
            continue
        record: dict[str, Any] = {"name": name, "sourceUrl": url, "checkedAt": now}
        try:
            text = fetch_page(url)
            found, summary = extract_offers(property_data, text, url)
            units.extend(found)
            if found:
                record.update({"result": "parsed", "unitCount": len(found),
                               "note": "Parsed floor-plan offers; exact Feb 7 move-in not verified"})
            elif summary:
                record.update({"result": "summary-only", "summary": summary,
                               "note": "Building-wide starting rent; NOT an exact unit offer"})
            else:
                record.update({"result": "reachable",
                               "note": "Page reachable; no verified unit price parsed"})
                if name == "The Hale":
                    record["result"] = "parse-failed"
                    record["note"] = "Hale floor-plan layout changed; inspect source"
        except (urllib.error.URLError, ValueError, TimeoutError, OSError) as error:
            record.update({"result": "unavailable", "note": str(error)[:180]})
        records.append(record)
    dest = ROOT / "data"
    dest.mkdir(parents=True, exist_ok=True)
    live = {
        "generated": now,
        "targetMoveIn": TARGET,
        "source": "Daily direct-page checks with conservative parsing",
        "feb7ConfirmedCount": 0,
        "units": units,
        "checks": records,
        "explanation": "No Feb 7 lease start is confirmed without an exact date and leasing evidence. Page connectivity is not price validation.",
    }
    (dest / "live.json").write_text(json.dumps(live, indent=2, ensure_ascii=False) + "\n",
                                    encoding="utf-8")
    history_path = dest / "history.json"
    prior = safe_read_json(history_path, {"observations": []})
    history = update_history(prior, units, now)
    history_path.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n",
                            encoding="utf-8")
    summaries = sum(record["result"] == "summary-only" for record in records)
    print(f"Checked {len(records)} buildings; {len(units)} plan-level offers; "
          f"{summaries} building-level price summaries; "
          f"history {len(history['observations'])} observations; "
          f"February 7 confirmed: 0.")


if __name__ == "__main__":
    main()
