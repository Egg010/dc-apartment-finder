# DC Apartment Finder — NoMa / Shaw / Union Market

Public, mobile-friendly GitHub Pages apartment-research site for a planned **February 7, 2027 move-in**. Source data is dated, and none of the site's automated results should be interpreted as a guaranteed leasing quote.

**Website:** https://egg010.github.io/dc-apartment-finder/

## Features

- Custom interactive map with **25 apartment complexes**, public transport, groceries, cafés, neighborhood filters and verified-laundry/parking filter
- **Apartment Decision Center** with transparent shortlist scoring, February lease-start status, sortable observed units, budget model, tours, source audit and price-history view
- **All-in cost model**: rent, known mandatory fees, parking, adjustable utilities, one-time application/deposit costs, and optionally amortized leasing promotions. The $2,200 reference is a **rent-only limit**; parking and utilities are shown separately, not presumed to be part of that cap.
- **Leasing confirmations** require a named unit, exact February 7 lease-start date, a confirmation date and a source. Earlier listed move-in dates are labeled *potential, ask leasing*.
- **Tour pipeline** tracks properties contacted, tour dates, unit numbers, garage quotes, leasing contacts, promotions and follow-up dates.
- **Favorites and notes backup**: export/import JSON for cross-device portability. Personal notes remain in browser localStorage unless explicitly exported.
- **Daily source checks**, dated snapshots, source failure visibility, unit price histories, and GitHub Issue alerts for new inexpensive one-bedrooms / same-unit price drops after a historical baseline.

## Deployment

[GitHub Actions workflow](.github/workflows/refresh-and-deploy.yml) runs on pushes, can be manually dispatched, and is scheduled daily at **11:15 UTC** (6:15 AM ET in winter, 7:15 AM ET in daylight saving time). It:

1. Runs Python unit tests and `node --check`.
2. Requests configured listing pages once per property, using explicit extraction rules.
3. Writes `data/live.json`, `data/history.json`, and `data/alerts.json`.
4. Tries to commit those dated, **public listing observations** to `main` with retry protection.
5. Optionally creates a GitHub Issue for new observed pricing leads. These are preliminary and need verification.
6. Publishes the site HTML, CSS, JS, and JSON through GitHub Pages.

**Settings → Pages → Source must be GitHub Actions.** If no public site appears, inspect Actions for the latest run.

## Data quality — please read

- A successful `reachable` check **does not** mean a price was extracted.
- `summary-only` means building-wide starting rent and an advertised unit count were recognized; it does **not** describe a specific unit.
- `parsed` refers to recognized floor-plan or unit rows, with the original source linked. `no-source`, `unavailable` and `parse-failed` are visible and do not silently become current prices.
- The Hale parser records **floor-plan pricing**, not actual unit numbers. HotPads and Apartments.com unit parsers only record explicitly paired apartment numbers, prices and dates when the markup is readable. Some rental sites return HTTP 403; a permitted HotPads listing may be used as a fallback without pretending its prices are fee-comparable.
- **Income-restricted listings** (such as Loree Grand's WDU units) are not interchangeable with market-rate inventory. The map uses the sourced market-rate studio baseline there.
- A unit advertised as available before February 7 may not be held until that date. Only an actual leasing confirmation counts.
- **Price-history comparisons require matching unit (or floor plan) and price basis.** Floor-plan price movements can reflect a changing unit mix; review individual listings before drawing conclusions.
- GitHub issues are public. Emails/mobile notifications depend on your [repository watch settings](https://github.com/Egg010/dc-apartment-finder); an issue is not an email delivery guarantee.
- Prices, fees, reviews, promotions and availability change frequently. Walk estimates and schematic streets are approximations. The building's official leasing office is authoritative.

## Project files

| File | Purpose |
|---|---|
| `index.html` | Interactive neighborhood map, embedded property research and refresh adapter |
| `enhancements.css` | Responsive Decision Center styles |
| `enhancements.js` | Unit/date filters, budget calculator, rankings, tours, backup, historical alerts |
| `scripts/refresh_listings.py` | Daily source checking, conservative parsing and history |
| `scripts/publish_alerts.py` | Optional GitHub Issue digest for newly detected price signals |
| `tests/test_refresh.py` | Parser, date, history and inventory sanity tests |
| `.github/workflows/refresh-and-deploy.yml` | Tests, daily refresh, history archive, alerts and Pages deployment |

## Before signing a lease

Ask for the specific unit number and floor plan, **February 7 lease commencement**, lease term, all mandatory monthly fees, actual parking availability and cost, estimated usage-based utilities, in-unit washer/dryer, concession eligibility for your dates, full move-in costs, and a written quote expiration.
