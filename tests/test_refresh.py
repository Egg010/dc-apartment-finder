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

    def test_hotpads_exact_unit_rows_keep_rent_basis(self):
        sample = (
            "This listing now includes required monthly fees in the total price. "
            "Studio • 1 bath • 588 sqft Unit Total price / mo Available Unit details "
            "0116 $1,903 Now 0716 $2,005 Now "
            "1 Bed • 1 bath • 601 sqft Unit Total price / mo Available Unit details "
            "0448 $2,191 Now 0848 $2,392$2,358 12/7/2026 "
            "2 Beds • 2 bath • 900 sqft 0220 $3,000 Now"
        )
        rows = mod.hotpads_units(sample, "Slate at NoMa", "https://example.org")
        self.assertEqual(4, len(rows))
        self.assertEqual([0, 0, 1, 1], [r["bedrooms"] for r in rows])
        self.assertEqual(2358, rows[3]["totalRent"])
        self.assertEqual("2026-12-07", rows[3]["availableDate"])
        self.assertEqual("total", rows[3]["priceBasis"])
        self.assertFalse(any(r["feb7Confirmed"] for r in rows))

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

    def test_apartments_dot_com_unit_dates_and_bedrooms(self):
        sample = (
            "S03A - Studio $1,993 Studio 1 Bath 514 Sq Ft "
            "View S03A - Studio Floor Plan Details 1 Available unit "
            "Unit Base Price Sq Ft Availability Unit Details "
            "Unit 1002 price $1,993 square feet 514 availibility Now "
            "J04 - JR 1 Bedroom Starting at $2,133 1 Bed 1 Bath 502 Sq Ft "
            "View J04 - JR 1 Bedroom Floor Plan Details 2 Available units "
            "Unit 1007 price $2,193 square feet 502 availibility Now "
            "Unit 0907 price $2,133 square feet 502 availibility Nov 7 "
            "J01A - JR 1 Bedroom $1,926 1 Bed 1 Bath 511 Sq Ft "
            "View J01A - JR 1 Bedroom Floor Plan Details 1 Available unit "
            "Unit 0642 price $1,926 square feet 511 availibility Jan 21, 2027 "
            "J02 - JR 1 Bedroom $2,139 1 Bed 1 Bath 521 Sq Ft "
            "View J02 - JR 1 Bedroom Floor Plan Details 1 Available unit "
            "Unit 0340 price $2,139 square feet 521 availibility Feb 16, 2027"
        )
        units = mod.apartments_dot_com_units(sample, "Cielo", "https://example.org")
        self.assertEqual(5, len(units))
        self.assertEqual([0, 1, 1, 1, 1], [u["bedrooms"] for u in units])
        self.assertEqual("2027-01-21", units[3]["availableDate"])
        self.assertEqual("2027-02-16", units[4]["availableDate"])
        self.assertFalse(any(u["feb7Confirmed"] for u in units))

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
