# DC Apartment Finder

Public static GitHub Pages map for evaluating NoMa, Union Market, Shaw, and Mount Vernon Triangle apartment complexes for a **February 7, 2027** move-in.

## Daily monitoring

The workflow [Refresh apartment research and deploy website](.github/workflows/refresh-and-deploy.yml) runs daily at **11:15 UTC** and on pushes to `main`. It can also be started manually from the GitHub Actions tab. It generates `data/live.json` for the site's availability-watch panel and deploys the HTML plus JSON via GitHub Pages.

**Required once:** Repository Settings → Pages → Build and deployment → Source → **GitHub Actions**. The previous branch-based Pages configuration does not deploy the generated JSON. Run the workflow after switching.

## Data accuracy

- The HTML embeds 25 researched complexes with individually dated snapshots.
- The daily task attempts one direct request per configured building source; buildings with no direct URL report `no-source`.
- Only The Hale's server-rendered floor-plan descriptions currently have an automated **unit-level** extractor. For other sites, `reachable` means the page responded, **not** that apartment prices or availability have been verified. If the source markup changes, the parser reports `parse-failed`.
- A unit advertised as available now, in November, December, or January is **not** a confirmed February 7 lease start. The checker reports **zero confirmed** unless exact target-date eligibility is independently verified; it intentionally does not guess.
- Base rents may omit mandatory monthly fees, parking, and utilities. Source restrictions, changing offers, and errors can interrupt automated checks.
- All automated records identify when they were checked and link to their source. This is a research aid, not a guaranteed real-time leasing feed.

## Structure

- `index.html`: interactive map, 25 buildings, saved comparisons, source notes, market research table, and availability watch.
- `scripts/refresh_listings.py`: conservative web checker; outputs `data/live.json`.
- `.github/workflows/refresh-and-deploy.yml`: automatic refresh and GitHub Pages deployment.

## February leasing confirmation checklist

For any attractive unit, ask the leasing team for (1) the exact February 7, 2027 lease-start option; (2) the quote for a 12–15-month lease; (3) all mandatory monthly fees and utilities; (4) garage availability and monthly rate; (5) floor plan, unit number, and in-unit washer/dryer; (6) promotion eligibility for a February start; and (7) how long the quote may be held.
