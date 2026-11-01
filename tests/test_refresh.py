import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("apartment_refresh", ROOT / "scripts" / "refresh_listings.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ApartmentResearchTests(unittest.TestCase):
    def test_embedded_properties_are_valid(self):
        data = mod.read_embedded()
        self.assertEqual(25, len(data["listings"]))
        self.assertEqual(25, len({p["name"] for p in data["listings"]}))
        self.assertEqual("2027-02-07", data["plan"]["moveIn"])

    def test_hale_explicit_floorplans(self):
        sample = (
            "S1 Studio, 390 sq ft View Units Virtual Tour "
            "from $1,897*Base Rent $1,897 • 15 mo. 1 Available Now "
            "A5 1 BR / 1.0 BA, 549 sq ft View Units "
            "from $2,206*Base Rent $2,206 • 9 mo. 2 Available Now "
            "A1 1 BR / 1.0 BA, 489 sq ft View Units "
            "from $2,086*Base Rent $2,086 • 10 mo. 1 available 11.2026"
        )
        units = mod.hale_units(sample, "The Hale", "https://example.org")
        self.assertEqual(3, len(units))
        self.assertEqual(["S1", "A5", "A1"], [u["plan"] for u in units])
        self.assertEqual([1897, 2206, 2086], [u["baseRent"] for u in units])
        self.assertTrue(all(u["feb7Confirmed"] is False for u in units))
        self.assertTrue(all(u["availableDate"] is None for u in units))
        self.assertEqual("month", units[-1]["availabilityPrecision"])

    def test_hale_does_not_parse_nonoffers(self):
        self.assertEqual([], mod.hale_units("From $2,000 cheap units today", "The Hale", "https://example.org"))

    def test_hotpads_summary_is_not_an_exact_unit(self):
        txt = "There are 6 one-bedroom apartments available starting at $2,358"
        self.assertEqual(2358, mod.hotpads_summary(txt)["oneBrStartingTotal"])
        self.assertIsNone(mod.hotpads_summary("Price starts at 2000 and 6 apartments"))

    def test_history_deduplicates_same_plan_and_day(self):
        unit = {"building": "The Hale", "unit": None, "plan": "A1",
                "bedrooms": 1, "baseRent": 2100, "totalRent": None,
                "priceBasis": "base", "availableDate": None,
                "sourceUrl": "https://example.org"}
        d1 = "2026-11-01T11:15:00+00:00"
        d2 = "2026-11-02T11:15:00+00:00"
        a = mod.update_history({"observations": []}, [unit], d1)
        b = mod.update_history(a, [unit], d1)
        self.assertEqual(1, len(b["observations"]))
        unit["baseRent"] = 2050
        c = mod.update_history(b, [unit], d2)
        self.assertEqual(2, len(c["observations"]))
        self.assertEqual([2100, 2050], [r["price"] for r in c["observations"]])

    def test_source_selection_prefers_price_source(self):
        a = {"links": [
            {"url": "https://example.org", "official": True},
            {"url": "https://example.org/availability", "src": True},
        ]}
        self.assertEqual("https://example.org/availability", mod.source_url(a))

    def test_html_extraction_drops_scripts(self):
        p = mod.PageText()
        p.feed("<div>Floorplans</div><script>fake $10</script><p>S1 Studio, 390 sq ft</p>")
        self.assertIn("S1 Studio", p.text())
        self.assertNotIn("fake $10", p.text())


if __name__ == "__main__":
    unittest.main()
