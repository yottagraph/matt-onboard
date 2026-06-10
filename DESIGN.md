# Matt's Onboarding Adventure

## Vision

This application will be to test the BC onboarding of the SAM.gov data source.

## Status

Initial scaffold built. The app is a SAM.gov onboarding tester: it scans the
Lovelace Query Server schema for flavors and properties contributed by the
SAM.gov fetcher, lets you browse the full schema, search the knowledge graph
for entities (SAM.gov contractors register as `organization` entities), and
inspect a single entity's populated properties with SAM identifiers grouped
front-and-center.

## Modules

### Onboarding Status (`/`)

The default landing page. Calls `GET /api/sam/scan`, which fetches the Query
Server schema and reports:

- Whether the schema is reachable at all.
- Total flavors / properties registered for the tenant.
- Flavors and properties whose name or description matches the SAM.gov
  keyword set (`uei`, `cage`, `duns`, `naics`, `psc`, `contractor`, `sba`,
  `wosb`, `sdvosb`, `hubzone`, etc.). Each match shows which keywords hit
  and a one-click drill-in to the schema browser.

When no SAM-tagged items appear, the page surfaces an explicit "not yet
registered" panel rather than a misleading green state, and points the user
to the entity search and schema browser as next steps.

### Schema Browser (`/schema`)

`GET /api/sam/schema` returns a digest of all flavors and properties (with
PIDs / FIDs kept as strings — the 64-bit-safe `qsParse` in
`server/utils/elementalQs.ts`). The page renders two tabs (flavors,
properties) with:

- Free-text filter (name + description + domain flavors).
- Property-type dropdown (`data_str`, `data_int`, `data_nindex`, …).
- "SAM keywords only" toggle that re-uses the scan's keyword logic to
  highlight or isolate SAM-tagged rows.
- Per-row chip when the row matches the SAM keyword set.
- Accepts a `?q=` query parameter so the dashboard can deep-link the user
  straight to a specific row.

### Entity Search (`/entities`)

`POST /api/sam/search-orgs` proxies `entities/search` on the Query Server
with `includeFlavors: true`. The page lets you type a free-text query
(default examples are well-known federal contractors), shows ranked matches
with their flavor and confidence score, and links each row to the entity
detail page.

### Entity Detail (`/entity/[neid]`)

`GET /api/sam/entity?neid=...&flavor=organization` uses
`getPropertiesByName()` to fetch every property declared on the entity's
flavor _plus_ a curated set of SAM-only property names (so a missing
identifier shows up as "not populated" rather than just being silently
absent). The page groups populated values into:

- **SAM.gov identifiers** — `uei`, `cage_code`, `duns`, `naics_code`,
  `sam_registration_status`, `business_types`, etc.
- **Core attributes** — `country`, `state_of_incorporation`, `industry`,
  `ticker_symbol`, `lei_code`, …
- **Other populated properties** — collapsed by default.

It also shows the full property schema for the flavor in an expandable
accordion, plus a chip list of any requested SAM property names that the
schema doesn't define yet — useful for tracking what the fetcher has
registered vs. what the app is asking for.

## Architecture notes

- All data access goes through the **Query Server** via the tenant gateway.
  The four server routes under `server/api/sam/` use `qsFetch` (64-bit-safe
  parse) and `getPropertiesByName` (dedup + `data_nindex` resolution) from
  `server/utils/elementalQs.ts` — no hand-rolled gateway/dedup logic.
- The navigation drawer in `app.vue` is the single source of truth for
  page links; the `nav-toggle` slot on `AppHeader` toggles it.
- No external SAM.gov calls — everything reads from the platform's
  knowledge graph as the onboarding pipeline populates it.

## Next steps

- Once SAM.gov-specific properties appear in the schema, tune the
  `SAM_IDENTIFIER_PROPS` list in `server/api/sam/entity.get.ts` to match
  their exact names.
- Optionally pin a small set of "known SAM-registered" example entities to
  the dashboard for one-click verification.
