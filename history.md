# Pow.fyi — Implementation History

A chronological log of all implementation work, decisions, and changes made during the build of Pow.fyi.

---

## Phase 1: Project Initialization

### Scaffolding
- Created a Vite 6 + React 19 + TypeScript 5.7 project using Bun 1.3.9
- Installed dependencies: `react`, `react-dom`, `react-router-dom@7`, `recharts`, `date-fns@4`, `vite-plugin-pwa`, `workbox-*`
- Configured path alias `@/*` → `src/*` in `tsconfig.json` and `vite.config.ts`
- Set up PWA manifest and service worker (StaleWhileRevalidate caching via Workbox)
- Created dark theme CSS with custom properties (`--color-bg: #0f172a`, `--color-surface: #1e293b`, `--color-accent: #38bdf8`, etc.)

### Data Layer
- Defined all TypeScript interfaces in `src/types.ts`: `Resort`, `HourlyMetrics`, `DailyMetrics`, `BandForecast`, `ResortForecast`, `ElevationBand`
- Built `src/data/openmeteo.ts` with `fetchForecast()` and `fetchHistorical()` — both hit Open-Meteo's free API (no key needed)
- Created `src/data/resorts.ts` with 31 curated North American ski resorts (CO, UT, CA, MT, WY, VT, NH, WA, OR, BC, AB) including coordinates, elevations, vertical drop, lifts, and acres
- Built `src/data/favorites.ts` for localStorage-based favorites management
- Created `src/hooks/useWeather.ts` (`useForecast`, `useHistorical`) and `src/hooks/useFavorites.ts`

### Utility Layer
- `src/utils/weather.ts`: Unit conversion functions (`fmtTemp`, `fmtElevation`, `fmtSnow`, `cmToIn`) and WMO weather code → emoji + label mapping (`weatherDescription`)

---

## Phase 2: Core UI

### App Shell & Routing
- `src/main.tsx`: Entry point wrapping App in providers and `BrowserRouter`
- `src/App.tsx`: Routes — `/` → HomePage, `/resort/:slug` → ResortPage
- `src/components/Layout.tsx`: App layout with `<Outlet>`, footer with Open-Meteo attribution

### Home Page (`src/pages/HomePage.tsx`)
- Search bar filtering resorts by name
- Resorts grouped by region (state/province)
- Resort cards (`src/components/ResortCard.tsx`) with name, region, elevation, favorite toggle

### Resort Detail Page (`src/pages/ResortPage.tsx`)
- Header with resort name, region, website link, favorite star
- Quick stats row (base/mid/top elevation, vertical drop, lifts, acres)
- Elevation band toggle (`src/components/ElevationToggle.tsx`) — Base/Mid/Top segmented control
- 7-day forecast day cards (weather icon, high/low, snowfall)
- Refresh button

### Chart Components
- `DailyForecastChart.tsx` — ComposedChart: snow + rain bars with high/low/feels-like temperature lines, dual Y-axes
- `HourlyDetailChart.tsx` — ComposedChart: hourly snow + rain + temp + feels-like (72 hours)
- `UVIndexChart.tsx` — BarChart with Cell-based per-bar coloring by UV severity level
- `FreezingLevelChart.tsx` — AreaChart showing freezing altitude over time
- `SnowHistoryChart.tsx` — Historical snowfall by month (multi-season)

---

## Phase 3: Favorites Redesign

### Removed Dedicated Favorites Tab
- Originally had a separate `/favorites` route — removed it
- Favorites section now displayed inline at the top of the Home Page

### FavoriteCard Component (`src/components/FavoriteCard.tsx`)
- Richer card showing forecast summary for favorited resorts
- Displays next 3 days: snowfall + high/low temps
- Clickable — navigates to resort detail page
- Fetches its own forecast data on mount

### Bug Fixes
- **Archive API lag**: Open-Meteo archive endpoint has ~5 day delay for recent data. Switched recent snowfall to use the forecast endpoint's `past_days` parameter instead.
- **Variable name collision**: `snow` from `useUnits()` conflicted with snowfall value variable in `RecentSnowTable` → renamed to `snowUnit`.
- **Toggle name collision**: `toggle` from `useFavorites()` conflicted in ResortPage → renamed to `toggleFav`.

---

## Phase 4: Imperial / Metric Toggle

### UnitsContext (`src/context/UnitsContext.tsx`)
- Created `UnitSystem` type: `'imperial' | 'metric'`
- Context provides: `{ units, toggle, temp, elev, snow }` (derived display units)
- Persisted to localStorage key `freesnow_units`
- Wired through all components and chart components

### Floating FAB Button
- Added to `Layout.tsx` as a fixed-position pill button in the top-right corner
- Shows current units (e.g., `°F / ft` or `°C / m`)
- Click toggles between imperial and metric

---

## Phase 5: Header Banner Removal

- Removed the static header/banner component
- Units FAB now floats freely at the top-right as a fixed-position element
- Cleaner look — no wasted vertical space

---

## Phase 6: Timezone Support

### TimezoneContext (`src/context/TimezoneContext.tsx`)
- `TZ_OPTIONS` array: 13 curated North American timezones + UTC
- Each option has IANA key, display label, and reference city
- `getUtcOffset()` helper computes live UTC offset for any IANA timezone
- Context provides: `{ tz, tzRaw, tzLabel, setTz, fmtDate }`
- `fmtDate` uses `Intl.DateTimeFormat` with the selected timezone (no date-fns needed for display)
- Persisted to localStorage key `freesnow_tz`

### Timezone Picker UI (Layout.tsx)
- Second FAB button (`🌐 Browser`) in the top-right FAB group
- Click opens a dropdown with:
  - Search input for filtering timezones
  - List of timezone options with UTC offset badges (e.g., `UTC-7`)
  - Click-outside-to-close behavior
- All API calls pass the selected timezone to Open-Meteo
- All date formatting uses the selected timezone

### Unicode Bug Fix
- `\u00b0` and `\ud83c\udf10` escaped sequences in JSX rendered as literal backslash strings
- Replaced with actual `°` and `🌐` characters

---

## Phase 7: Resort Detail Page Redesign

### New Chart Components
- **`HourlySnowChart.tsx`** — Bar chart showing hourly snowfall for a single selected day. Displays total snowfall for the day. Uses recharts BarChart with hour labels.
- **`RecentSnowChart.tsx`** — Past 14-day snowfall visualization using ComposedChart. Shows daily snowfall bars + cumulative total dashed line + faint high/low temperature lines. Dual Y-axes (snow left, temp right).

### Interactive Day Selection
- Added `selectedDayIdx` state to ResortPage (default: 0)
- Day cards are now `<button>` elements — clicking selects a day
- Selected card gets accent border glow (`.day-card--selected`)
- Selected day drives:
  - HourlySnowChart (hourly snow bars for that day)
  - HourlyDetailChart (detailed conditions for that day)
  - FreezingLevelChart (freezing level for that day)

### Reorganized Sections
1. **Snowfall Section** — Section header with 7-day total badge → interactive day cards → 7-Day Overview chart → Hourly Snow breakdown for selected day
2. **Detailed Conditions** — Hourly detail chart for the selected day
3. **Conditions Grid** — UV Index + Freezing Level side-by-side in a responsive 2-column grid
4. **Recent Snowfall** — RecentSnowChart replaces old RecentSnowTable

### CSS Updates
- Added `.day-card--selected` styles (accent border, subtle glow, background tint)
- Added hover/press transition states for day cards
- Added `.section-subtitle` for secondary headings
- Added `.resort-page__conditions-grid` (2-column on desktop, 1-column on mobile ≤768px)
- Added `.resort-page__snow-section-header` with week-total badge
- Removed all `.recent-snow__*` table styles

### Section Reordering (follow-up)
- Moved 7-Day Overview chart to be first thing after day cards
- Hourly Snow breakdown follows the overview
- Hourly detail chart is first in Detailed Conditions section

### Chart Alignment Fix (DailyForecastChart)
- Bars and temperature lines were misaligned due to side-by-side bar grouping shifting individual bars away from tick centers
- Tried `scale="point"` with `padding` — broke bar centering
- Tried `stackId` — made bars too wide and overlapping
- Final solution: `barCategoryGap="15%"` with `maxBarSize={30}` to keep bars centered and appropriately sized

---

## Phase 8: Footer & Open Source Links

- Updated footer text: "open-source" now links to `https://github.com/Ofekw/freesnow`
- Added "Submit Feedback" button linking to `https://github.com/Ofekw/freesnow/issues`
- Styled as an outlined accent pill button that fills on hover

---

## Phase 9: Copilot Workflow Guardrails

- Added `.github/copilot-instructions.md` to enforce required context loading on every task.
- Instructions now require reading both `#file:history.md` and `#file:plan.md` before decisions or code changes.
- Added a logging rule: when a task introduces a big change, update `#file:history.md` in the same task.
- Goal: keep project context usage consistent and preserve a reliable chronological implementation record.

---

## Phase 10: Fixed Scale Snow Total Graphs

### Consistent Y-Axis Scales for Snow Charts
- **DailyForecastChart**: Fixed precip Y-axis to 0–12 inches with 1-inch increments (imperial) / 0–30 cm with 5 cm increments (metric)
- **HourlyDetailChart**: Fixed precip Y-axis to 0–1 inch with 0.1-inch increments (imperial) / 0–2.5 cm with 0.5 cm increments (metric)
- **HourlySnowChart**: Fixed Y-axis to 0–1 inch with 0.1-inch increments (imperial) / 0–2.5 cm with 0.5 cm increments (metric)
- Previously all three charts used auto-scaling Y-axes, which made comparing snowfall amounts across different days or resorts difficult
- Now all snow total graphs use fixed, consistent scales so users can visually compare snowfall at a glance

### Files Changed
- `src/components/charts/DailyForecastChart.tsx` — added `domain` and `ticks` to precip YAxis
- `src/components/charts/HourlyDetailChart.tsx` — added `domain` and `ticks` to precip YAxis
- `src/components/charts/HourlySnowChart.tsx` — added `domain` and `ticks` to YAxis

---

## Phase 11: Comprehensive UI Unit Tests

### Test Infrastructure
- Switched test runner from vitest to **bun test** (bun's native test runner) — vitest v3 has Windows/bun compatibility issues with worker pools
- Installed `happy-dom`, `@happy-dom/global-registrator`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Created `bunfig.toml` with test preload configuration
- Created `src/test/setup-bun.ts` — registers happy-dom globals, extends `expect` with jest-dom matchers, adds automatic DOM cleanup between tests
- Created separate `vitest.config.ts` (kept for reference; not actively used) alongside the existing `vite.config.ts`
- Created `src/test/test-utils.tsx` — shared `renderWithProviders()` helper wrapping all app providers (Units, Timezone, Router)

### Test Suites (116 tests across 12 files)
- **`src/utils/__tests__/weather.test.ts`** — `weatherDescription`, `fmtTemp`, `fmtElevation`, `cmToIn`, `fmtSnow` (26 tests)
- **`src/data/__tests__/favorites.test.ts`** — localStorage-based favorites CRUD: `getFavorites`, `isFavorite`, `addFavorite`, `removeFavorite`, `toggleFavorite` (11 tests)
- **`src/data/__tests__/resorts.test.ts`** — Resort catalog integrity (unique slugs, valid fields, elevation ordering), `getResortBySlug`, `searchResorts` (12 tests)
- **`src/context/__tests__/UnitsContext.test.tsx`** — Imperial/metric toggle, localStorage persistence, derived units (5 tests)
- **`src/context/__tests__/TimezoneContext.test.tsx`** — Timezone selection, persistence, `fmtDate`, `getUtcOffset`, `TZ_OPTIONS` (12 tests)
- **`src/hooks/__tests__/useFavorites.test.ts`** — Hook toggle, multi-favorite management, persistence (7 tests)
- **`src/components/__tests__/ElevationToggle.test.tsx`** — Band rendering, active state, onChange callback, elevation display (5 tests)
- **`src/components/__tests__/ResortCard.test.tsx`** — Name/region rendering, favorite star toggle, elevation stats, conditional acres (9 tests)
- **`src/components/__tests__/Layout.test.tsx`** — FAB buttons, footer attribution, feedback link (5 tests)
- **`src/pages/__tests__/HomePage.test.tsx`** — Hero section, search filtering, region grouping, no-match message, favorites section visibility (9 tests)
- **`src/pages/__tests__/ResortPage.test.tsx`** — Resort detail rendering with mocked API calls, elevation stats, toggle, refresh, favorites, 404 handling (11 tests)
- **`src/App.test.tsx`** — Route rendering, layout presence (2 tests)

### Key Technical Decisions
- Used `bun:test` instead of `vitest` — vitest v3 fails on Windows/bun due to `pathToFileURL` errors in `vite-node` worker processes and missing `port.addListener` in bun's `worker_threads`
- Used `happy-dom` + `@happy-dom/global-registrator` instead of `jsdom` — lighter and bun-native
- Dynamic imports in preload file to ensure `GlobalRegistrator.register()` runs before `@testing-library/dom` evaluates `document.body`
- Mocked `@/data/openmeteo` and `@/hooks/useWeather` in ResortPage tests via `mock.module()` to avoid real API calls

---

---

## Phase 12: PR Screenshot Generation

### Visual Regression Testing for PRs
- Added Playwright as a dev dependency for automated screenshot generation
- Created `scripts/take-screenshots.js` — Node.js script that:
  - Launches headless Chromium via Playwright
  - Takes desktop (1920x1080) and mobile (375x667) screenshots
  - Captures home page and Crystal Mountain resort detail page
  - Saves screenshots to `screenshots/` directory (gitignored)
- Updated PR CI workflow (`.github/workflows/pr-ci.yml`) to:
  - Install Playwright browsers after build
  - Start Vite preview server on port 4173
  - Run screenshot generation script
  - Upload screenshots as workflow artifacts (30-day retention)
- Added `npm run screenshots` script to `package.json`
- Screenshots help PR reviewers visually test for regressions on key pages

### Pages Captured
- Home page (main resort list with search and favorites)
- Crystal Mountain resort page (representative detail page with charts, forecasts, and interactive elements)

---

## Current File Inventory

```
src/
├── main.tsx
├── App.tsx
├── types.ts
├── components/
│   ├── Layout.tsx / Layout.css
│   ├── ResortCard.tsx / ResortCard.css
│   ├── FavoriteCard.tsx / FavoriteCard.css
│   ├── ElevationToggle.tsx / ElevationToggle.css
│   └── charts/
│       ├── DailyForecastChart.tsx
│       ├── HourlyDetailChart.tsx
│       ├── HourlySnowChart.tsx       ← NEW (Phase 7)
│       ├── RecentSnowChart.tsx       ← NEW (Phase 7)
│       ├── FreezingLevelChart.tsx
│       ├── UVIndexChart.tsx
│       └── SnowHistoryChart.tsx
├── context/
│   ├── UnitsContext.tsx
│   └── TimezoneContext.tsx
├── data/
│   ├── resorts.ts                    (31 resorts)
│   ├── openmeteo.ts
│   └── favorites.ts
├── hooks/
│   ├── useWeather.ts
│   └── useFavorites.ts
├── pages/
│   ├── HomePage.tsx / HomePage.css
│   ├── ResortPage.tsx / ResortPage.css
│   └── FavoritesPage.tsx / FavoritesPage.css  (legacy, unused)
├── utils/
│   └── weather.ts
└── styles/
```

---

## Phase 11: Frontend-Only Snow Alerts (Android PWA MVP)

### What changed
- Added a frontend-only snow alert flow using Notification API + service worker periodic background sync (best-effort, no backend).
- Added a new alerts FAB in the top-right controls so users can enable notifications and see alert status.
- Added shared IndexedDB-backed alert settings storage for service worker + app coordination (`favoriteSlugs`, timezone, threshold, enabled flag).
- Implemented service-worker periodic checks for favorited resorts and notification dispatch when forecast daily snowfall crosses the 3-inch threshold (7.62 cm).

### Why it changed
- Enables alerting for a backend-less MVP while preserving FreeSnow's core architecture (client-only data + local state).
- Provides practical Android-installed PWA support for background checks, with explicit best-effort behavior due browser/OS scheduling constraints.

### Key files affected
- `vite.config.ts` (moved PWA to `injectManifest` strategy)
- `src/sw.ts` (custom service worker: caching + periodic sync handler + notification click routing)
- `src/alerts/storage.ts`
- `src/alerts/snowAlerts.ts`
- `src/hooks/useSnowAlerts.ts`
- `src/components/Layout.tsx`
- `src/components/Layout.css`
- `src/main.tsx`
- `src/components/__tests__/Layout.test.tsx`

### Follow-up notes
- Periodic background sync cadence is controlled by Android/Chromium and is not guaranteed to run exactly morning/evening.
- Alert dedupe is per resort + forecast date to reduce repeated notifications for the same snow day.

## Phase 12: Compact 🔔 Alert Toggle

### What changed
- Replaced the wide status-label FAB ("🔔 Enable Alerts" / "🔔 Alerts On") with a compact icon-only 🔔 toggle button next to units and timezone controls.
- Added enable/disable toggle: 🔔 (on, accent background) ↔ 🔕 (off, neutral). Blocked state uses `line-through` styling.
- Extended `useSnowAlerts` hook with `enabled` state, `disableAlerts`, and `toggleAlerts` callbacks.
- Added CSS classes `.fab--alert`, `.fab--alert-on`, `.fab--alert-blocked` for visual state.
- Updated Layout and useSnowAlerts tests (now 134 tests across 15 files).

### Why it changed
- User requested a compact 🔔 icon toggle next to existing control buttons for enabling/disabling snow alerts on Android installed web app.

### Key files affected
- `src/hooks/useSnowAlerts.ts` (added `enabled`, `toggleAlerts`, `disableAlerts`, `statusIcon`)
- `src/components/Layout.tsx` (compact icon button, toggle wiring, conditional CSS classes)
- `src/components/Layout.css` (`.fab--alert`, `.fab--alert-on`, `.fab--alert-blocked`)
- `src/components/__tests__/Layout.test.tsx`
- `src/hooks/__tests__/useSnowAlerts.test.tsx` (added toggle/disable tests)

## Known Technical Notes

- **Bun PATH**: Must add `$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"` each PowerShell session
- **Open-Meteo archive lag**: ~5 days behind. Use forecast endpoint's `past_days` for recent history.
- **Open-Meteo elevation limitation**: The `elevation` parameter only adjusts temperature via lapse rate. Precipitation data comes from the same grid cell (~11km resolution) regardless of elevation. Our snowRecalc layer fixes this.
- **Timezone handling**: All API calls pass the user's selected IANA timezone. All display formatting uses `Intl.DateTimeFormat` with that timezone.
- **PWA caching**: StaleWhileRevalidate via Workbox — serves cached response immediately, refreshes in background.

---

## Phase 13: Snowfall Recalculation & Data Accuracy Fix

### What changed
- Created `src/utils/snowRecalc.ts` — temperature-dependent snow-liquid ratio (SLR) recalculation that replaces Open-Meteo's fixed ~7:1 ratio with realistic mountain ratios (10:1 to 20:1 depending on temperature).
- Modified `src/data/openmeteo.ts` to apply recalculation at the data layer: hourly snowfall/rain are recomputed from total precipitation using freezing level + station elevation + temperature, then daily sums are recomputed from corrected hourly data.
- Fixed `src/pages/ResortPage.tsx` — Recent Snowfall section now uses the user's selected elevation band instead of always hardcoding 'mid'.
- Added `src/utils/__tests__/snowRecalc.test.ts` — 15 unit tests covering SLR, recalculation at various temperatures, and a Crystal Mountain validation scenario.

### Why it changed
Three interrelated data accuracy issues were identified:
1. **Underestimated snowfall**: Open-Meteo uses a fixed ~7:1 SLR, but real mountain snow at -7°C to -13°C has 12:1–20:1 ratios. Crystal Mountain mid showed 1.4cm when competitors showed 4–5cm.
2. **Base showing more snow than mid**: The `elevation` parameter only adjusts temperature, not precipitation. The model's rain/snow split at the grid cell level could produce more snow at base than mid due to temperature interpolation artifacts.
3. **Rain at sub-freezing temperatures**: The API's rain/snow split is computed at grid-cell elevation, not station elevation. Our recalculation uses the station's actual elevation vs freezing level to correctly categorize precipitation.

### How the recalculation works
- For each hourly data point, precipitation is re-split into snow/rain based on:
  - If station is >100m above freezing level → all snow
  - If temp ≤ 0°C → all snow  
  - If 0–2°C → linear mix
  - If > 2°C → all rain
- Snow depth is computed as `precipitation_mm × SLR` where SLR varies by temperature:
  - 0 to -2°C: 1.0 (10:1)
  - -2 to -5°C: 1.2 (12:1)
  - -5 to -10°C: 1.5 (15:1)
  - -10 to -15°C: 1.8 (18:1)
  - Below -15°C: 2.0 (20:1)
- Daily sums are recomputed from corrected hourly values

### Validation
For Crystal Mountain mid (1800m), Feb 18 2026:
- **Before**: 1.4cm (Open-Meteo raw)
- **After**: ~4.0cm (recalculated)
- **Competitors**: snow-forecast.com ~4cm, OpenSnow ~5cm

Higher elevations now correctly show ≥ snowfall of lower elevations because:
- Same precipitation amount × higher SLR at colder temperature = more snow

### Key files affected
- `src/utils/snowRecalc.ts` (new)
- `src/utils/__tests__/snowRecalc.test.ts` (new)
- `src/data/openmeteo.ts` (mapHourly/mapDaily now apply recalculation)
- `src/pages/ResortPage.tsx` (Recent Snow uses selected band)

### Follow-up notes
- The historical archive endpoint (`fetchHistorical`) still uses raw API snowfall since it doesn't return hourly data. A future improvement could add temperature-based correction for historical data too.
- Alternative free APIs (Weather.gov, multi-model averaging) were investigated but not implemented — the recalculation approach provides accurate results without additional API calls.

## Phase 13b: Rain Unit Fix in Metric Charts

### What changed
- Fixed rain unit mismatch in `DailyForecastChart` and `HourlyDetailChart`: rain values (stored in mm from the API) were displayed raw but labeled as "cm" in metric mode.
- Rain is now converted from mm → cm (`/ 10`) in metric mode to match snow on the shared precipitation Y-axis.
- Imperial mode was already correct (mm → in via `/ 25.4`).

### Why it changed
- Rain and snow share a Y-axis labeled "(cm)" in metric mode, but rain data was plotted in mm. This made rain values appear ~10x larger than they should on the cm scale (e.g., 0.65mm displayed as "0.7 cm" instead of "0.065 cm").
- Discovered while validating snowfall recalculation against live API data for Crystal Mountain WA.

### Key files affected
- `src/components/charts/DailyForecastChart.tsx`
- `src/components/charts/HourlyDetailChart.tsx`

---

## Phase 14: UI/UX Overhaul — Phase 1 (Design System & ECharts Migration)

### What changed
- **Chart library migration**: Replaced Recharts with Apache ECharts 6 + echarts-for-react 3.0.6. All 7 chart components fully rewritten.
- **Design tokens overhaul**: New deeper navy Grafana-inspired palette (`--color-bg: #0b1120`, `--color-surface: #141b2d`, `--color-surface-raised: #1e2942`), semantic chart color tokens (`--chart-snow`, `--chart-rain`, `--chart-temp-high`, etc.), glow shadows.
- **Typography**: Added DM Sans (display/UI) and Space Mono (data/mono) via Google Fonts.
- **ECharts theme system**: Created centralized `echarts-theme.ts` with registered 'freesnow' theme and builder helpers (`makeTooltip`, `makeLegend`, `makeGrid`, `makeCategoryAxis`, `makeValueAxis`, `makeBarSeries`, `makeLineSeries`, `makeDashedLineSeries`, `makeDataZoom`).
- **BaseChart wrapper**: New `BaseChart.tsx` thin wrapper applying theme, responsive sizing, optional cross-chart group sync.
- **Chart feature improvements**:
  - All charts now have toggleable legends (ECharts native)
  - DailyForecastChart & HourlyDetailChart: dual Y-axes, feels-like dashed lines
  - HourlyDetailChart: wind speed + gusts now rendered (previously computed but hidden)
  - HourlySnowChart: precipitation probability now rendered as dotted line
  - RecentSnowChart: proper legend + dataZoom slider for panning
  - FreezingLevelChart: gradient fill + optional resort elevation markLine reference
  - UVIndexChart: color-coded severity legend, value labels on bars, timezone-aware date formatting
  - SnowHistoryChart: **bug fix** — now respects units context (was hardcoded to imperial)

### Why it changed
- UI/UX overhaul initiative for powder hunters — needed interactive Grafana-style charts with toggleable legends, uniform increments, rich tooltips, and dataZoom for exploration.
- Recharts lacked native legend toggling, dataZoom, cross-chart sync, and built-in dark theme support.
- Typography and color palette refresh to establish unique brand identity distinct from competitors (OpenSnow, snow-forecast.com).

### Key files affected
- `package.json` — echarts deps added, recharts removed
- `index.html` — Google Fonts links, updated title/theme-color
- `src/styles/index.css` — full design token overhaul
- `src/components/charts/echarts-theme.ts` — NEW: theme + helpers
- `src/components/charts/BaseChart.tsx` — NEW: wrapper component
- `src/components/charts/DailyForecastChart.tsx` — rewritten
- `src/components/charts/HourlyDetailChart.tsx` — rewritten
- `src/components/charts/HourlySnowChart.tsx` — rewritten
- `src/components/charts/RecentSnowChart.tsx` — rewritten
- `src/components/charts/FreezingLevelChart.tsx` — rewritten
- `src/components/charts/UVIndexChart.tsx` — rewritten
- `src/components/charts/SnowHistoryChart.tsx` — rewritten
- `src/pages/ResortPage.tsx` — added resortElevation prop to FreezingLevelChart

---

## Phase 15: UI/UX Overhaul — Phase 2 (Snow Timeline, Conditions Summary, Resort Page Restructure)

### What changed
- **SnowTimeline component** — OpenSnow-inspired compact past 7 + future 7 day snowfall bar chart with "today" divider. Shows at-a-glance snow trend with totals for each period. Uses CSS bars with gradient fill (future) vs muted (past). Placed in hero position on resort page.
- **ConditionsSummary component** — snow-forecast.com-inspired 3-elevation comparison table for the selected day. Shows weather, temperature (high/low), snow, rain, wind (+ gusts), precipitation probability, and average freezing level across Base/Mid/Top bands. Uses CSS grid layout with responsive design.
- **ResortPage restructure** — New information hierarchy:
  1. Header + stats (unchanged)
  2. **Snow Timeline** (hero position — first data the user sees)
  3. Band toggle + refresh
  4. **Conditions Summary** (all-elevation at-a-glance, with "All Elevations" badge)
  5. 7-Day Snow section (day cards + DailyForecastChart + HourlySnowChart)
  6. Hourly Detail chart
  7. UV + Freezing Level grid
  8. Recent Snowfall
- **CSS polish** — Section header with badge component, stats row uses `font-mono` for data values, updated border/radius tokens.
- **20 new tests** — 10 for SnowTimeline (rendering, data display, edge cases, accessibility), 10 for ConditionsSummary (table structure, elevation bands, weather data display, unit formatting).

### Why it changed
- Powder hunters need an instant visual read on the snow trend — the SnowTimeline gives this at a glance before any scrolling.
- Comparing conditions across elevations (snow-forecast.com style) helps users decide which lifts to target.
- Previous layout showed only the selected elevation band's conditions; now the ConditionsSummary shows all three bands simultaneously.

### Key files affected
- `src/components/SnowTimeline.tsx` — NEW
- `src/components/SnowTimeline.css` — NEW
- `src/components/ConditionsSummary.tsx` — NEW
- `src/components/ConditionsSummary.css` — NEW
- `src/components/__tests__/SnowTimeline.test.tsx` — NEW (10 tests)
- `src/components/__tests__/ConditionsSummary.test.tsx` — NEW (10 tests)
- `src/pages/ResortPage.tsx` — restructured layout + new component integration
- `src/pages/ResortPage.css` — section header badge, stat font-mono, border updates

---

## Phase 16: UI/UX Overhaul — Phase 4 (Polish + Animations)

### What changed
- **Global animation system** — Added 6 `@keyframes` to `index.css`: `fadeInUp`, `fadeIn`, `slideInLeft`, `shimmer`, `pulseGlow`, `snowPulse`. Utility classes `.animate-fade-in-up`, `.animate-fade-in`, `.stagger-children` (10-step delay). Smooth scroll via `html { scroll-behavior: smooth }`. Full `prefers-reduced-motion: reduce` media query disables all animations/transitions for accessibility.
- **Skeleton loading states** — Replaced plain "Loading forecast…" text with shimmer skeleton placeholders (`.skeleton`, `.skeleton--text`, `.skeleton--chart`, `.skeleton--card`). Applied to FavoriteCard loading state (3-column skeleton grid) and ResortPage initial loader (chart + text skeletons).
- **Cross-chart tooltip sync** — BaseChart now calls `echarts.connect(group)` when a group prop is provided, enabling synchronized tooltips and dataZoom across charts sharing the same group ID. HourlyDetailChart, HourlySnowChart, and FreezingLevelChart each already pass group IDs.
- **Section title accent** — `.section-title` now has a 3px left border accent (`border-left: 3px solid var(--color-accent)`) for visual hierarchy.
- **Day card animations** — Day cards use `fadeInUp` entrance with stagger delays via `.stagger-children`. Added `:active` press state (`scale(0.97)`). Enhanced selected state with stronger box-shadow and inset glow.
- **Card hover polish** — ResortCard and FavoriteCard hover states now include subtle accent border glow (`border-color: rgba(56, 189, 248, 0.15/0.2)`) and enhanced shadow. FavoriteCard snow values get `snowPulse` animation for subtle text glow.
- **HomePage polish** — Search input gets cyan focus ring + glow shadow. Hero section, region sections animate in with `fadeInUp`. Region titles get left accent border. Favorites section gets ambient glow on hover.
- **Scroll-to-top button** — New floating button (bottom-right) appears when scrolled past 400px. Pill shape, accent hover, smooth reveal animation. Responsive sizing on mobile.
- **FAB group polish** — FABs get enhanced hover shadow (`box-shadow: 0 4px 16px rgba(56, 189, 248, 0.25)`). Favorite star on ResortPage gets `pulseGlow` when active.
- **ElevationToggle polish** — Active state gets inset glow (`box-shadow: inset 0 0 12px rgba(56, 189, 248, 0.15)`).
- **SnowTimeline + ConditionsSummary** — Both components get `fadeInUp` entrance animation.
- **Focus visible** — Global `:focus-visible` ring (`2px solid var(--color-accent), offset 2px`) for keyboard accessibility.
- **Bug fix** — Fixed typo `"reso  rt-page__chart-block"` → `"resort-page__chart-block"` in ResortPage.tsx.

### Why it changed
- Animations provide visual feedback, guide attention to new data, and make the UI feel more responsive/alive.
- Skeleton loading states are a modern UX pattern that reduces perceived wait time vs. plain text spinners.
- Cross-chart sync lets users correlate data across multiple hourly charts simultaneously.
- Accessibility requirements demand motion reduction support and visible focus states.

### Key files affected
- `src/styles/index.css` — Global animations, skeletons, focus, reduced motion
- `src/pages/ResortPage.tsx` — Skeleton loader, animation classes, stagger, typo fix
- `src/pages/ResortPage.css` — Section accent, day card animations, stats hover, skeleton section
- `src/pages/HomePage.css` — Search glow, hero animation, region title accent, favorites hover
- `src/components/FavoriteCard.tsx` — Skeleton loading state
- `src/components/FavoriteCard.css` — Skeleton grid, snow pulse, card hover glow
- `src/components/ResortCard.css` — Card entrance animation, hover border glow
- `src/components/Layout.tsx` — Scroll-to-top button (state + JSX)
- `src/components/Layout.css` — Scroll-to-top styles, FAB hover shadow
- `src/components/ElevationToggle.css` — Active inset glow
- `src/components/SnowTimeline.css` — Entrance animation
- `src/components/ConditionsSummary.css` — Entrance animation
- `src/components/charts/BaseChart.tsx` — `echarts.connect()` for cross-chart sync

## Snow Data Accuracy Improvement — Multi-Model, SLR, NWS, Snow Depth

### What changed
- **Phase A: Multi-model averaging** — The primary forecast now fetches 3 weather models in parallel (GFS, ECMWF IFS, and HRRR for US / GEM for Canada) and averages their raw output before applying the SLR recalculation. Precipitation uses **median** (robust to outlier model spikes), temperature/wind/humidity use **mean**, weather codes use **mode**, and wind direction uses vector averaging. Different time ranges are handled via union (HRRR 48h contributes only to short-range, GFS/ECMWF cover full 7 days). Falls back to single `best_match` if all model fetches fail.
- **Phase B: Improved SLR** — `snowLiquidRatio()` now accepts optional `relativeHumidity` and `windSpeedKmh` parameters. High humidity (≥80%) boosts SLR by 10-15% (fluffier dendritic crystals), low humidity (<50%) reduces by 10% (denser granular snow). Strong wind (≥30 km/h) reduces by 10-20% (compaction + sublimation). `recalcHourly` passes humidity and wind from the API data.
- **Phase C: NWS cross-reference** — For US resorts, `fetchNWSSnowfall()` queries the NWS Weather.gov API (free, no key, CORS) via a 2-step lookup (points → gridpoint forecastGridData → snowfallAmount). NWS forecaster-adjusted snowfall is blended with multi-model output at 30% NWS / 70% model weight. NWS failures are silently ignored (optional enhancement).
- **Phase D: Snow depth** — Added `snow_depth` to hourly API variables. `HourlyMetrics` now includes optional `snowDepth` field. Model averaging handles `snow_depth` arrays when present.
- **Service worker** — Added `StaleWhileRevalidate` caching for `api.weather.gov` origin.

### Why it changed
The plan identified four independent accuracy improvements, all achievable with free APIs and no backend:
1. Multi-model averaging is the single highest-impact technique for forecast accuracy (15-30% RMSE reduction).
2. Humidity and wind are already fetched but weren't used in SLR — adding them corrects the fluffiness/compaction mismatch.
3. NWS forecasters manually adjust QPF and snow ratios — their signal adds human intelligence to the pipeline.
4. Snow depth provides validation data and future UI opportunities.

### Key files affected
- `src/utils/modelAverage.ts` — NEW: `mean`, `median`, `averageHourlyArrays`, `averageDailyArrays`, `blendWithNWS`, `modelsForCountry`
- `src/utils/__tests__/modelAverage.test.ts` — NEW: 22 tests
- `src/data/nws.ts` — NEW: `fetchNWSGridpoint`, `fetchNWSSnowfall`, `nwsToSnowMap`
- `src/data/__tests__/nws.test.ts` — NEW: 3 tests
- `src/utils/snowRecalc.ts` — `snowLiquidRatio` upgraded with humidity + wind; `RecalcHourlyInput` extended
- `src/utils/__tests__/snowRecalc.test.ts` — 13 new tests for humidity/wind/combined SLR + recalcHourly with inputs
- `src/data/openmeteo.ts` — `OMForecastResponse` exported; `snow_depth` added to hourly vars/types; `mapHourly` passes humidity/wind to `recalcHourly`; `fetchMultiModelForecast` added
- `src/hooks/useWeather.ts` — `useForecast` now uses multi-model + NWS blending pipeline
- `src/types.ts` — `HourlyMetrics.snowDepth` added (optional)
- `src/sw.ts` — NWS API caching route added

### API call budget
- Previous: 3 calls/resort (3 bands × 1 model)
- Now: 9 calls/resort for Open-Meteo (3 bands × 3 models) + 2 for NWS (US only) = 11 max
- Well within 10,000/day free tier (≥900 resort views/day)

### Test impact
- 215 tests across 21 files (up from ~177), all passing

## Status vs Plan

| Feature | Status |
|---------|--------|
| Project scaffolding (Vite + React + TS + Bun) | ✅ Complete |
| PWA (service worker, installable) | ✅ Complete |
| Dark theme + responsive CSS | ✅ Complete |
| Resort catalog (31 NA resorts) | ✅ Complete |
| Open-Meteo API integration | ✅ Complete |
| Home page (search, grouped regions) | ✅ Complete |
| Favorites (localStorage, inline on home) | ✅ Complete |
| FavoriteCard with forecast preview | ✅ Complete |
| Resort detail — header, stats, band toggle | ✅ Complete |
| 7-day day cards (interactive selection) | ✅ Complete |
| DailyForecastChart (snow/rain/temp) | ✅ Complete |
| HourlyDetailChart (72h → per-day) | ✅ Complete |
| HourlySnowChart (per-day hourly snow) | ✅ Complete |
| UV Index chart | ✅ Complete |
| Freezing Level chart | ✅ Complete |
| RecentSnowChart (past 14 days) | ✅ Complete |
| SnowHistoryChart (multi-season) | ✅ Complete |
| Imperial / Metric toggle | ✅ Complete |
| Timezone picker (13 NA zones + UTC) | ✅ Complete |
| GitHub repo link + feedback button | ✅ Complete |
| Comprehensive UI unit tests | ✅ Complete |
| PR screenshot generation | ✅ Complete |
| Snowfall recalculation (accuracy fix) | ✅ Complete |
| Multi-model averaging (accuracy improvement) | ✅ Complete |
| Improved SLR (humidity + wind) | ✅ Complete |
| NWS cross-reference (US resorts) | ✅ Complete |
| Snow depth variable | ✅ Complete |
| UI/UX Phase 2 — Snow Timeline + Conditions + Resort restructure | ✅ Complete |
| UI/UX Phase 4 — Polish + Animations | ✅ Complete |
| UI/UX Phase 5 — Icons, Snowpack, Mobile Fixes | ✅ Complete |
| Map-based resort browser | 🔲 Not started |
| Global resort coverage | 🔲 Not started |
| Snow report / current conditions | 🔲 Not started |
| Webcam links | 🔲 Not started |
| Backend (accounts, alerts) | 🔲 Not started |
| Trail map overlays | 🔲 Not started |

---

## Phase 17: UI/UX Phase 5 — Icons, Snowpack, Mobile Fixes

### What changed

**1. Emoji → Lucide Icon Pack Migration**
- Replaced all emoji usage across the app with [Lucide React](https://lucide.dev/) SVG icons for cross-platform consistency.
- Created `src/components/icons.tsx` — `WeatherIcon` component mapping WMO weather icon IDs (e.g., `'sun'`, `'cloud-snow'`, `'snowflake'`) to Lucide SVG components.
- Updated `src/utils/weather.ts` — `WMO_MAP` now returns icon ID strings (e.g., `'sun'` instead of `'☀️'`) for all 28 WMO weather codes.
- All section titles, row labels, UI controls, and weather displays now render uniform SVG icons:
  - Section titles: `<Snowflake>`, `<BarChart3>`, `<Clock>`, `<Sun>`, `<Thermometer>`, `<TrendingUp>`
  - Conditions table labels: `<Snowflake>` Snow, `<CloudRain>` Rain, `<Wind>` Wind, `<Droplets>` Precip %, `<Thermometer>` Freeze lvl
  - UI controls: `<Star>` favorites, `<Globe>` timezone, `<Bell>`/`<BellOff>` alerts, `<ChevronUp>` scroll-to-top, `<RefreshCw>` refresh, `<AlertTriangle>` errors, `<Layers>` snowpack
- Updated global CSS: SVG elements no longer forced to `display: block`; FAB buttons use `display: inline-flex` for proper icon+text alignment.

**2. Favourites Icon Placement Fix**
- Moved the favourite star from a floating right-side position to inline with the resort name (`resort-page__title-row` flex row).
- Star is now directly next to the resort name and never overlaps with the FAB control group.
- Reduced header `padding-right` from 260px/210px to 180px/140px since the star no longer needs its own space.
- Uses Lucide `<Star>` with `fill="currentColor"` for active state, `fill="none"` for inactive.

**3. SnowTimeline Mobile Overflow Fix**
- Added `overflow-x: auto` with `-webkit-overflow-scrolling: touch` to the chart container.
- Changed section flex from `flex: 1` to `flex: 1 0 auto` so bars maintain minimum width and scroll instead of compressing.
- Reduced bar label font sizes on mobile (0.58rem) for denser layout before scroll kicks in.

**4. Snowpack / Snow Depth Information**
- Added a "Snowpack" stat to the quick stats row (next to Lifts, Acres) showing the current estimated snow depth for the selected elevation band, with `<Layers>` icon. Displayed in imperial (inches) or metric (cm).
- Added a "Snowpack" row to the ConditionsSummary table showing snow depth across all three elevation bands (Base/Mid/Top).
- Snow depth is computed as the max `snowDepth` value from the hourly data for the selected day, converted from meters to cm.

### Why it changed
- Emojis render differently across platforms (Windows, macOS, Android, iOS) causing inconsistent UX. SVG icons from Lucide are pixel-identical everywhere.
- The favourite star was awkwardly floating on the right side of the header, disconnected from the resort name, and could be covered by the fixed FAB buttons on narrow screens.
- SnowTimeline's 14 bars overflowed on mobile screens (<375px) because bars had min-width constraints that exceeded viewport width.
- Snow depth (snowpack) data was already fetched from the API but not displayed anywhere — powder hunters need to know base depth to assess conditions.

### Key files affected
- `src/components/icons.tsx` — NEW: WeatherIcon component
- `src/utils/weather.ts` — WMO icon IDs changed from emojis to string identifiers
- `src/components/Layout.tsx` — Lucide icons for globe, bell, chevron
- `src/components/Layout.css` — FAB `display: inline-flex`
- `src/pages/ResortPage.tsx` — All section icons, fav inline with name, snowpack stat
- `src/pages/ResortPage.css` — Title-row flex, section-title flex+icon styles, snowpack stat
- `src/pages/HomePage.tsx` — Lucide Snowflake + Star icons
- `src/pages/HomePage.css` — Icon alignment styles
- `src/components/ResortCard.tsx` — Lucide Star icon
- `src/components/FavoriteCard.tsx` — Lucide Star + WeatherIcon
- `src/components/ConditionsSummary.tsx` — All row label icons + snowpack depth row
- `src/components/ConditionsSummary.css` — Label icon styling + snowpack cell
- `src/components/SnowTimeline.css` — overflow-x: auto, responsive font sizes
- `src/styles/index.css` — SVG display rule updated
- `src/components/ResortCard.css` — Fav button flex alignment
- `src/components/FavoriteCard.css` — Tomorrow weather icon flex, fav button flex
- Test files updated: weather.test.ts, ConditionsSummary.test.tsx, ResortCard.test.tsx, HomePage.test.tsx, ResortPage.test.tsx

### Test impact
- 215 tests across 21 files, all passing (0 new tests needed — existing tests updated for icon string changes)

---

## Snow Timeline — Today Bar Enhancement

### What changed
- The "Today" divider in the SnowTimeline component was previously just a thin vertical line separator between past and future bars.
- Now it renders as a full bar column showing today's expected snowfall amount (value label + proportional bar), styled with the accent color and a glow effect.
- Today's data is extracted from the first element of `forecastDays` and displayed distinctly from both past and future bars.
- The future section now shows days 2–7 of the forecast (6 bars), while today stands alone in the center.
- "Next 7d" total still includes today's snowfall in the sum.

### Why
- Users couldn't see today's expected snowfall at a glance — the thin divider wasted the most important data point.

### Key files affected
- `src/components/SnowTimeline.tsx` — Extracted `todayBar` from forecast data, replaced divider with bar column
- `src/components/SnowTimeline.css` — Added `.snow-timeline__today` and `.snow-timeline__bar--today` styles
- `src/components/__tests__/SnowTimeline.test.tsx` — Updated bar count expectations, added 3 new tests for today bar

### Test impact
- 217 tests across 21 files, all passing
---

## SPA Navigation Fallback for Azure Static Web Apps

### Problem
Direct navigation or bookmarks to deep links (e.g., `https://opensnow.app/resort/crystal-mountain-wa`) returned a 404 because Azure Static Web Apps tried to find a matching file on disk instead of serving the SPA's `index.html`.

### Fix
- Added `public/staticwebapp.config.json` with a `navigationFallback` rule that rewrites all non-asset routes to `/index.html`, allowing React Router to handle client-side routing.
- Static assets (CSS, JS, images, fonts, JSON, webmanifest) are excluded from the rewrite so they continue to load normally.

### Files affected
- `public/staticwebapp.config.json` (new)

---

## Resort Detail Day Selector Placement Tweak

### What changed
- Adjusted `ResortPage` layout so only the interactive 7-day day-card buttons are rendered directly under the elevation toggle/refresh controls.
- Restored section flow so the **Conditions** table and the rest of the 7-day snow section (heading + charts) remain in their prior positions.
- Updated resort page test coverage to assert the selected day-card button appears before the Conditions heading.

### Why it changed
- Keeps the page structure familiar while making it immediately clear that day selection controls the day-specific Conditions table.

### Key files affected
- `src/pages/ResortPage.tsx`
- `src/pages/__tests__/ResortPage.test.tsx`

---

## SnowTimeline AM / PM / Overnight Period Sub-bars

### What changed
- **Today's bar and future forecast bars** in the SnowTimeline are now split into 3 grouped mini-bars per day: **AM** (6 AM–12 PM), **PM** (12 PM–6 PM), and **Overnight** (6 PM–6 AM), each with its own color:
  - AM = amber/gold
  - PM = sky blue (matches existing future bar color)
  - Overnight = purple
- Each sub-bar has a tooltip: "Morning snow: X″", "Afternoon snow: X″", "Overnight snow: X″".
- Today's period track has a subtle accent border to maintain its visual distinction.
- Falls back to the original single bar when hourly data is unavailable or the day has zero snowfall.
- Past bars remain unchanged (single bars, muted style).
- SnowTimeline now accepts an optional `forecastHourly` prop (`HourlyMetrics[]`) used to compute the period breakdown.
- ResortPage passes `bandData.hourly` to SnowTimeline.

---

### Snowfall Methodology Info Popover
- Added a small (i) info icon button in the top-right FAB group, next to the timezone picker.
- Clicking it opens a popover panel explaining how Pow.fyi calculates snowfall: multi-model averaging, temperature-dependent SLR, freezing level rain/snow split, and NWS cross-referencing.
- Follows the existing timezone picker pattern (outside-click close, absolute-positioned dropdown, same `.fab` styling).
- Key files: `src/components/Layout.tsx`, `src/components/Layout.css`, `src/components/__tests__/Layout.test.tsx`.

### Why it changed
- Provides powder hunters with finer-grained visibility into *when* significant snowfall is expected during the day, rather than just a daily total.

### Key files affected
- `src/components/SnowTimeline.tsx` — Added `forecastHourly` prop, `splitDayPeriods()` helper, period sub-bar rendering for today + future
- `src/components/SnowTimeline.css` — New `.snow-timeline__bar--am`, `--pm`, `--overnight` styles with period track layout; `.snow-timeline__bar-track--today` accent border
- `src/pages/ResortPage.tsx` — Passes `forecastHourly={bandData.hourly}` to SnowTimeline
- `src/components/__tests__/SnowTimeline.test.tsx` — 8 new tests for period sub-bars (today + future)

---

## Rebrand: FreeSnow → Pow.fyi

### What changed
- Full rebrand from "FreeSnow" / "Free OpenSnow" / "OpenSnow.App" to **Pow.fyi** across all user-facing text, metadata, and internal identifiers.

### Details
- **HTML title** — `Free OpenSnow.app — Ski Resort Snow Forecasts` → `Pow.fyi — Ski Resort Snow Forecasts`
- **PWA manifest** — `name` and `short_name` updated to `Pow.fyi`
- **package.json** — package name changed to `pow-fyi`
- **README.md** — heading, description, and all body references rebranded
- **Footer** — display text and GitHub links updated to `pow-fyi` repo
- **NWS User-Agent** — `FreeSnow/1.0` → `Pow.fyi/1.0` with new repo URL
- **localStorage keys** — `freesnow_*` prefix changed to `pow_*` (`pow_favorites`, `pow_units`, `pow_tz`, `pow_snow_alert_settings_v1`, `pow_snow_alert_notified_v1`)
- **Periodic sync tag** — `freesnow-snow-alert-check` → `pow-snow-alert-check`
- **ECharts theme** — registered theme name `freesnow` → `pow`
- **Code comments** — all "Free OpenSnow" / "FreeSnow" references in JSDoc and inline comments updated
- **All test files** — updated to match new localStorage keys, URLs, and identifiers

### Key files affected
- `index.html`, `package.json`, `vite.config.ts`, `README.md`
- `src/components/Layout.tsx`, `src/data/nws.ts`
- `src/data/favorites.ts`, `src/hooks/useFavorites.ts`
- `src/context/UnitsContext.tsx`, `src/context/TimezoneContext.tsx`
- `src/alerts/storage.ts`, `src/alerts/snowAlerts.ts`, `src/sw.ts`
- `src/components/charts/echarts-theme.ts`, `src/components/charts/BaseChart.tsx`
- `src/components/SnowTimeline.tsx`
- All corresponding `__tests__/` files

### Follow-up notes
- Existing users will lose localStorage preferences (keys renamed). This is acceptable for an early-stage rebrand.
- `bun.lock` / `package-lock.json` will auto-update on next install.

---

## MiniSnowTimeline for Favourite Cards

### What changed
Added a compact 5-day snow timeline bar chart to the FavoriteCard component shown in the Favourites section of the Home Page. The mini timeline displays yesterday + today + next 3 days of snowfall, with today highlighted in accent color. Future days (including today) show AM/PM/Overnight sub-bars when hourly forecast data is available, matching the visual language of the full SnowTimeline on resort detail pages.

### Why
Gives users an at-a-glance snowfall trend for their favourited resorts directly on the home page, without needing to navigate to each resort's detail page.

### Key files affected
- `src/components/MiniSnowTimeline.tsx` — New compact 5-day snow timeline component
- `src/components/MiniSnowTimeline.css` — Styling (bar heights, period colours, today accent)
- `src/components/FavoriteCard.tsx` — Stores daily + hourly timeline data from forecast; renders MiniSnowTimeline
- `src/components/__tests__/MiniSnowTimeline.test.tsx` — 14 new tests covering rendering, past/future bars, AM/PM/Overnight period splits, edge cases

---

## Search Dropdown for Home Page

### What changed
Replaced the plain search `<input>` on the Home Page with a `SearchDropdown` combobox component. When the user types, a floating dropdown panel appears directly below the search bar showing up to 8 matching resorts (name + region). Results are keyboard-navigable (Arrow keys + Enter) and clickable — selecting a result navigates straight to that resort's detail page. The dropdown includes a search icon, slide-in animation, scroll for overflow, and dismisses on Escape or outside click.

### Why
On mobile, the previous search-and-filter experience made it hard to see which resorts matched the query because the grid reflow was far below the input. The dropdown gives immediate, obvious visual feedback right under the user's thumb.

### Key files affected
- `src/components/SearchDropdown.tsx` — New combobox component (keyboard nav, ARIA roles, outside-click dismiss)
- `src/components/SearchDropdown.css` — Dropdown panel styling (dark theme, slide-in animation, scrollbar, hover/active states)
- `src/pages/HomePage.tsx` — Swapped raw `<input>` for `<SearchDropdown />`
- `src/pages/HomePage.css` — Removed old `.home__search` styles, added spacing rule for the dropdown
- `src/components/__tests__/SearchDropdown.test.tsx` — 9 new tests (rendering, ARIA, dropdown open/close, navigation, keyboard, max results)
- `src/pages/__tests__/HomePage.test.tsx` — Updated 2 tests to handle duplicate text from dropdown + card

---

## Overnight Period Consistency Across Snow Visualizations

### What changed
Aligned the 7-Day Overview chart bars with the SnowTimeline/MiniSnowTimeline period logic by reusing a shared `splitDayPeriods` helper. Overnight is now consistently calculated as target-day 18:00–23:59 plus next-day 00:00–05:59, instead of combining same-day early-morning with same-day evening.

### Why
Prevents conflicting snowfall period totals between different snow visualizations and matches user expectations for overnight windows that span midnight.

### Key files affected
- `src/components/snowTimelinePeriods.ts` — Shared AM/PM/Overnight splitter (cross-date overnight semantics)
- `src/components/charts/DailyForecastChart.tsx` — 7-Day Overview now uses shared splitter
- `src/components/MiniSnowTimeline.tsx` — Uses shared splitter for identical behavior with SnowTimeline
- `src/components/__tests__/SnowTimeline.test.tsx` and `src/components/__tests__/MiniSnowTimeline.test.tsx` — Updated coverage/expectations for cross-date overnight behavior

### Follow-up notes
- All validation scripts pass after this alignment: `bun run lint`, `bun run build`, `bun run test`.

---

## Phase 18: Homepage Forecast Algorithm Parity

### What changed
- Updated `FavoriteCard` forecast loading to use `fetchMultiModelForecast` with `modelsForCountry(...)`, matching the ResortPage multi-model averaging pipeline.
- Added optional US-only NWS snowfall blending on homepage cards via `fetchNWSSnowfall` + `nwsToSnowMap` + `blendWithNWS`, consistent with `useForecast`.
- Updated `FavoriteCard` tests to mock the new data dependencies and restore module mocks after the suite to avoid cross-suite contamination.

### Why
- Homepage mini timeline and resort-page main timeline could show different snowfall totals for the same resort/day because FavoriteCard previously used a single-model fetch path.
- This change aligns homepage snowfall numbers with the main forecast algorithm so values are consistent across surfaces.

### Key files affected
- `src/components/FavoriteCard.tsx`
- `src/components/__tests__/FavoriteCard.test.tsx`

### Follow-up notes
- ResortPage still allows switching elevation bands; homepage cards remain mid-band only, so differences can still appear if users compare against non-mid selected bands.

---

## Favorites Mini Timeline Window Alignment

### What changed
- Updated FavoriteCard timeline inputs and MiniSnowTimeline rendering to match the SnowTimeline window: past 7 days, next 24 hours (today), and next 7 days.
- MiniSnowTimeline now renders all 7 past-day bars and up to 7 future-day bars after today, instead of the previous 5-day window (yesterday + today + next 3).
- Updated FavoriteCard summary stat labels/values to the same windows (Past 7 Days, Next 24h, Next 7 Days) so card totals match the mini timeline horizon.
- Updated MiniSnowTimeline tests to cover the expanded window and limits.

### Why
- Keeps snowfall timeline windows consistent between resort detail pages and favorite cards, so users see the same time horizon across both views.

### Key files affected
- `src/components/FavoriteCard.tsx`
- `src/components/MiniSnowTimeline.tsx`
- `src/components/MiniSnowTimeline.css`
- `src/components/__tests__/MiniSnowTimeline.test.tsx`

---

## FavoriteCard Past-Call Forecast Days Increase

### What changed
- Increased `forecastDays` in the FavoriteCard past-data API call from `2` to `5`, so that when the primary 14-day future call fails, the fallback still provides enough forecast days (today + 3 future) for a full 5-column mini timeline.

### Why
- Canadian resorts (using `gem_seamless` model) were intermittently seeing only 3 timeline columns (1 past + today + tomorrow) instead of 5, because the 14-day future fetch would fail and the past call only carried 2 forecast days as fallback.

### Key files affected
- `src/components/FavoriteCard.tsx` — past call `forecastDays` 2 → 5
- `src/components/__tests__/FavoriteCard.test.tsx` — updated assertion to match new value



---

## HRRR Model Name Update & Null-Safe Averaging

### What changed
- Updated Open-Meteo model name from `hrrr` to `ncep_hrrr_conus` in `modelsForCountry()` -- the old name was returning 400 errors.
- Added null-safe value filtering in `averageHourlyArrays` and `averageDailyArrays`. The `ncep_hrrr_conus` model returns `null` for unsupported fields (e.g. `uv_index_max`) and for hours/days beyond its 48h forecast range. These nulls were leaking into averages and causing toFixed crashes.

### Why
- Open-Meteo renamed the HRRR model identifier, breaking all US resort forecasts with 400 errors.
- After fixing the model name, the previously-failing HRRR model started returning data with null values that the averaging code did not handle, causing crashes on resort pages and Forecast unavailable on favorite cards.

### Key files affected
- `src/utils/modelAverage.ts` -- model name fix + pushNum null-filter helper
- `src/utils/__tests__/modelAverage.test.ts` -- updated model name assertions + null-handling tests

---

## API Response Cache + Request Deduplication

### What changed
- Added a URL-keyed in-memory response cache (5 min TTL) and in-flight request deduplication to `fetchJSONWithRetry`. All Open-Meteo and NWS calls now benefit automatically.
- Errors are never cached — a failed request lets the next caller retry fresh.
- Exported `clearFetchCache()` so the ResortPage Refresh button bypasses stale cache.
- Fixed ResortPage `recentDays` effect to always use mid elevation, removing `band` from its dependency array (was causing unnecessary refetches on elevation toggle).
- Added staggered loading for FavoriteCards on the homepage (200 ms per card) to spread the burst of concurrent API requests.

### Why
- Open-Meteo 429 rate-limit errors were frequent because every component mount fired fresh API calls with no caching or deduplication. A homepage with 10 US favorites triggered ~60 Open-Meteo + ~20 NWS requests simultaneously.

### Key files affected
- `src/data/retryFetch.ts` — cache + dedup layer, `clearFetchCache()` export
- `src/hooks/useWeather.ts` — `clearFetchCache()` on manual refresh
- `src/pages/ResortPage.tsx` — removed `band` dep from recentDays effect
- `src/components/FavoriteCard.tsx` — `loadDelay` prop for staggered loading
- `src/pages/HomePage.tsx` — passes `loadDelay={i * 200}` to FavoriteCards
- `src/data/__tests__/retryFetch.test.ts` — 5 new tests for cache/dedup behavior

---

## GitHub Repository Link Fixes

### What changed
- Updated all remaining GitHub URLs from the old `pow-fyi` slug to the correct `pow.fyi` repository path.
- Corrected footer open-source and feedback links, metadata/docs repository links, and the NWS User-Agent repository reference.
- Updated the layout test expectation to match the corrected feedback URL.

### Why
- Ensures all in-app, metadata, and API-identification links point to the live repository and issue tracker, avoiding broken navigation.

### Key files affected
- `src/components/Layout.tsx`
- `src/components/__tests__/Layout.test.tsx`
- `public/llms.txt`
- `src/data/nws.ts`

---

## Share Links Feature

### What Changed
Added ability to share the forecast for a specific resort as a branded screenshot image with a link back to the site.

### Why
Users wanted to share snow forecasts with friends via messaging apps and social media. The share feature generates a visual card with the 7-day snow forecast, resort info, and pow.fyi branding so recipients can see the forecast at a glance and follow the link for details.

### Implementation
- **Canvas-based share card** (`src/utils/shareCard.ts`): Renders a 600×420 branded image using the native Canvas API — no external dependencies. Includes resort name, region, elevation, 7-day snow bars with temperatures, date range, total snowfall, and pow.fyi URL watermark.
- **ShareButton component** (`src/components/ShareButton.tsx`): Handles the full share flow:
  1. Generates the share card image via Canvas
  2. Tries the Web Share API with file support (mobile-native share sheets)
  3. Falls back to copying the image to clipboard via `ClipboardItem`
  4. Final fallback: copies the resort URL to clipboard
  5. Shows a toast notification with the result
- **ResortPage integration**: Share button added to header next to Refresh button, styled consistently with existing action buttons. Passes current resort data, elevation band, units, and 7-day forecast to the share card renderer.

### Key files affected
- `src/utils/shareCard.ts` (new)
- `src/components/ShareButton.tsx` (new)
- `src/pages/ResortPage.tsx`
- `src/pages/ResortPage.css`
- `src/utils/__tests__/shareCard.test.ts` (new)
- `src/components/__tests__/ShareButton.test.tsx` (new)

---

## Share FAB Follow-up

### What changed
- Moved resort-page sharing into a layout-level FAB backed by `ShareContext`, so the share target follows the active resort, selected elevation band, and selected day without duplicating a page-header button.
- Extended `ShareButton` with an icon-only FAB mode and a richer clipboard fallback that attempts to copy both the rendered image and the deep-linked resort URL before degrading to image-only or URL-only copy.
- Updated shared test providers and layout/share button tests so app-level renders exercise the same share context wiring as production.
- Added the PR screenshot workflow guard so forked pull requests still upload screenshot artifacts without failing when the token lacks permission to comment upstream.

### Why
- Keeps sharing prominent and consistent across resort pages while preserving existing deep-link share URLs.
- Improves fallback sharing behavior in browsers that support multi-type clipboard writes and closes the provider/test gap called out in PR review.

### Key files affected
- `src/context/ShareContext.tsx`
- `src/components/Layout.tsx`
- `src/components/Layout.css`
- `src/components/ShareButton.tsx`
- `src/pages/ResortPage.tsx`
- `src/test/test-utils.tsx`
- `src/components/__tests__/Layout.test.tsx`
- `src/components/__tests__/ShareButton.test.tsx`
- `.github/workflows/pr-ci.yml`

---

## MFJH Easter Egg

### What changed
Added a second easter egg triggered by searching "mfjh" (case-insensitive) in the home page search bar. Unlike the existing Ofek spinner, this easter egg shows an image that starts small (10vh) and expands by 10% of viewport height every 500ms until it fills the entire screen (100vh). After holding at full size for 1 second, the overlay auto-dismisses by clearing the search query and returning to the home page. Clicking the overlay also dismisses it early.

### Why
Requested feature (GitHub issue: "MFJH easter egg") to add a fun animated easter egg for the "mfjh" keyword with a grow-to-fullscreen sequence.

### Key files affected
- `src/pages/HomePage.tsx` — added `isMfjhEasterEgg` derived state, `mfjhSize` state, growth interval effect, auto-dismiss timeout effect, and MFJH overlay JSX
- `src/pages/HomePage.css` — added `.home__easter-egg--mfjh` and `.home__easter-egg-image--mfjh` styles with smooth `height` transition
- `src/pages/__tests__/HomePage.test.tsx` — added tests for case-insensitive mfjh detection and partial-match exclusion

---

## Babka Easter Egg

### What changed
Added a third easter egg triggered by searching "babka" (case-insensitive) in the home page search bar. When triggered, a full-screen dark overlay displays the Babka dog image (a basset hound with glowing red eyes) that bounces around the screen indefinitely using a `requestAnimationFrame` animation loop. Two red laser beams shoot from the dog's eyes to the left and right edges of the screen, rendered as SVG lines with a red glow filter and a pulsing animation. The overlay runs until the user dismisses it by clicking, pressing Escape, or pressing Enter. The animation is skipped when `prefers-reduced-motion: reduce` is set.

The bounce animation is isolated in a separate `BabkaOverlay` component that updates the image position and SVG laser endpoints directly via DOM refs on each frame — avoiding full `HomePage` re-renders at 60fps.

### Why
Requested feature (GitHub issue: "Babka Easter Egg") to add a bouncing laser-eyes easter egg for the "babka" keyword. Auto-dismiss was removed so the animation runs until the user explicitly dismisses it.

### Key files affected
- `src/pages/HomePage.tsx` — added `BabkaOverlay` component (RAF animation via DOM refs, document-level Escape/Enter handler, `prefers-reduced-motion` check), `isBabkaEasterEgg` derived state, and `babkaDismiss` callback
- `src/pages/HomePage.css` — added `.home__easter-egg--babka`, `.home__babka-image`, `.home__babka-lasers`, `.home__babka-laser`, `@keyframes babkaLaserPulse`, and `@media (prefers-reduced-motion: reduce)` override
- `src/pages/__tests__/HomePage.test.tsx` — added tests for case-insensitive babka detection, partial-match exclusion, SVG laser line rendering, and indefinite-run behavior

---

## Argo Easter Egg

### What changed
Added a fourth easter egg triggered by searching "argo" (case-insensitive) in the home page search bar. When triggered, a full-screen dark overlay displays the Argo image centered on screen. The image holds still for 3 seconds, then shoots off-screen to the right via a CSS `translateX(120vw)` transition (0.5s ease-in), and auto-dismisses once the animation completes (3.5s total). Clicking or pressing Enter/Space on the overlay also dismisses it early.

### Why
Requested feature to add a fun easter egg for the "argo" keyword, following the same pattern as the existing ofek, mfjh, and babka easter eggs.

### Key files affected
- `src/pages/HomePage.tsx` — added `isArgoEasterEgg` derived state, `isArgoShooting` state, shoot+dismiss `useEffect`, and argo overlay JSX with `data-testid="argo-easter-egg"`
- `src/pages/HomePage.css` — added `.home__easter-egg-image--argo` (static, no spin) and `.home__easter-egg-image--argo-shoot` (translateX + transition) styles
- `src/pages/__tests__/HomePage.test.tsx` — added tests for case-insensitive argo detection, partial-match exclusion, and shoot animation timing (3s hold → shoot class added)
- `src/resources/images/argo.jpg` — new image asset
## Stale PWA Auto-Refresh

### What changed
Added a stale-session guard in the PWA bootstrap that automatically reloads visible pages after they have been open for at least one hour. Before reloading, the app clears the in-memory fetch cache and deletes the weather-related service worker caches so refreshed sessions fetch fresh forecast data instead of immediately reusing stale responses.

The stale check runs on an hourly interval and also when the page regains attention via `focus`, `pageshow`, or `visibilitychange`, which helps installed web-app sessions and long-lived tabs recover without requiring a manual refresh.

### Why
Installed PWAs and long-lived tabs could keep showing stale forecast data indefinitely, especially when resumed later from a saved web-app session. This behavior change ensures the app self-recovers from stale client-side data during active use.

### Key files affected
- `src/pwa.ts` — added the stale-session timer, visibility-aware reload checks, fetch-cache clearing, and weather-cache invalidation before reload
- `src/__tests__/pwa.test.ts` — added coverage for stale reload behavior and the browser-global mocks used by the PWA bootstrap tests

### Follow-up notes
- Automatic reloads only happen for visible pages after the one-hour threshold; hidden tabs are left alone until the user returns to them.

---

## Calendar Day / Ski Day Toggle on Home Screen

### What changed
Added the calendar day / ski day snow attribution toggle to the home screen (it already existed on the resort detail page). The selected value is now shared across both pages and persisted as a cookie (`pow_snow_attribution`) with a 1-year expiry.

- A new `SnowAttributionContext` (with `SnowAttributionProvider` and `useSnowAttribution` hook) manages the attribution mode globally and reads/writes it as a cookie.
- `ResortPage` now reads the mode from context instead of managing it as local state.
- `HomePage` renders a compact radio toggle ("Calendar day" / "Ski day") below the search bar using the same context.
- `FavoriteCard` passes the attribution mode down to `MiniSnowTimeline`, which now supports ski mode — computing overnight (6 pm prev day–8 am) vs daytime (8 am–6 pm) bars, with an updated legend.
- All providers and test utilities updated to include `SnowAttributionProvider`.

### Why
Requested feature (issue: "Add calendar day/ski day toggle to home screen") to let users set their preferred attribution mode once and have it apply consistently across both the home page favorites cards and the resort detail page, with the choice saved durably as a cookie.

### Key files affected
- `src/context/SnowAttributionContext.tsx` — new context with cookie persistence
- `src/main.tsx` — added `SnowAttributionProvider` to provider chain
- `src/test/test-utils.tsx` — added `SnowAttributionProvider` to `AllProviders`
- `src/pages/ResortPage.tsx` — uses `useSnowAttribution` instead of local `useState`
- `src/pages/HomePage.tsx` — adds attribution toggle UI and uses context
- `src/pages/HomePage.css` — toggle styles (`.home__attribution-*`)
- `src/components/FavoriteCard.tsx` — reads attribution mode from context and passes to `MiniSnowTimeline`
- `src/components/MiniSnowTimeline.tsx` — new `attributionMode` prop; ski mode uses `splitSnowAttributionPeriods` for overnight/daytime bars and shows updated legend
- `src/pages/__tests__/ResortPage.test.tsx` — added `SnowAttributionProvider` to render helpers, cleared cookie in `beforeEach`
- `src/pages/__tests__/ResortPage.timezone.test.tsx` — added `SnowAttributionProvider` to render helper
## Homepage Cleanup — Remove Static Resort Listings

### What changed
Removed all static resort cards grouped by region from the homepage. The homepage now shows only the Favorites section (when the user has favorited resorts) and a helpful empty state message ("Use the search bar to find and favorite resorts") when no favorites exist. Users browse resorts exclusively through the SearchDropdown search bar, which already supported searching, navigating to resort pages, and toggling favorites.

### Why
The static resort listing made the homepage cluttered. The search bar provides a better UX for discovering resorts, and the Favorites section gives users quick access to their preferred resorts.

### Key files affected
- `src/pages/HomePage.tsx` — removed `searchResorts`, `RESORTS`, and `ResortCard` imports; removed `filtered` and `grouped` useMemo computations; removed grouped-by-region resort card sections; added empty state message for users with no favorites
- `src/pages/__tests__/HomePage.test.tsx` — updated tests to reflect the new homepage behavior (no static resort cards, no region groupings, empty state message)
