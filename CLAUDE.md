# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build (vite build)
npm run lint     # Type-check only (tsc --noEmit); no test runner configured
npm run clean    # Remove dist/ and server.js
```

No test suite exists. `npm run lint` is the only automated check.

## Environment

Copy `.env.example` to `.env`. The only required variable is `GEMINI_API_KEY`. `VITE_OPENWEATHER_API_KEY` is optional — without it the app falls back to keyless providers.

## Architecture

This is a React 19 + TypeScript + Vite app styled with Tailwind CSS v4. It renders a weather timeline for a selected location.

### Data flow

1. **`App.tsx`** — root state owner. Holds `UserSettings`, active location, and fetched `WeatherData`. Calls `fetchWeatherForLocation` from the orchestrator; passes slices down to child components.

2. **`src/services/weather/weatherOrchestrator.ts`** — coordinates everything: resolves the provider chain, manages an in-memory cache keyed by `(lat, lon, provider)`, deduplicates in-flight requests, and returns a `WeatherFetchResult`.

3. **Provider adapters** (`src/services/weather/providers/`) — each implements `WeatherProviderAdapter` with `fetchRaw` + `fetch`. Registered in `providerRegistry.ts`. Current providers: `openweather`, `meteoswiss`, `nws`, `arpae` (Open-Meteo global). Warnings are fetched separately via `warningsService.ts` (NWS, OpenWeather, MeteoAlarm).

4. **`forecastNormalize.ts`** — converts raw provider data into the canonical `WeatherData` shape. `buildForecast` is the main entry point; `mergeRawHourlyLayers` and `mergeDailyLayers` handle multi-provider blending.

5. **`assembleTimeline.ts`** — turns normalized `DailyForecast` data into the ordered `WeatherTimelineEvent[]` array rendered by `WeatherTimeline`.

### Key types (`src/types.ts`)

- `WeatherTimelineEvent` — a single card on the timeline (hourly status, sunrise/sunset, moon events, wind shifts, peak temp). Carries `colorTheme` and optional `warnings`.
- `DailyForecast` — one calendar day with `timelineEvents[]`.
- `WeatherData` — full response including `current` conditions, `daily[]`, timezone fields, and `forecastDayCount`/`realForecastDayCount`.
- `WeatherWarning` — a weather alert with severity, event, and time window.
- `UserSettings` — persisted preferences (provider, units, theme, clock format, refresh interval, show sunrise/moonrise toggles).
- `WeatherKind` (`src/services/weather/weatherKind.ts`) — canonical enum of ~35 condition kinds shared across all providers. Values match the background image filenames in `assets/images/weather/`.

### Components

- `WeatherHeader` — settings panel, current conditions, and warnings modal trigger (~561 lines).
- `LocationsScreen` — full-screen location manager: search, saved locations list, geolocation, delete (~381 lines). Replaces the inline location search that used to live in `WeatherHeader`.
- `DailyScroller` — horizontal day selector that syncs the visible timeline day.
- `WeatherTimeline` — scrollable vertical list of `TimelineMarkerCard` components.
- `TimelineMarkerCard` — individual event card with background images and animations via the `motion` library.
- `WeatherIcon` / `WindDirectionArrow` — pure display helpers.

### Geocoding (`src/services/geocoding/`)

`geocodingService.ts` fans out to OpenWeather or Open-Meteo geocoding depending on API key availability. Results are `SavedLocation` objects. The active location is stored in `localStorage` under `sky_timeline_active_location`; saved locations list under `sky_timeline_saved_locations_v2` (v1 key is migrated on load).

### Utils (`src/utils/`)

- `conditionPalette.ts` — maps `WeatherKind` → color theme and background image. Images are statically imported (ESM) so Vite resolves them at build time. `conditionCardStyle` / `conditionRowStyle` return inline `CSSProperties`.
- `savedLocation.ts` — helpers to build `SavedLocation` from geocoding results, generate stable IDs, and read/write the saved locations localStorage keys.
- `weatherFetcher.ts` — thin re-export barrel for `fetchWeatherForLocation`, `resolveProvider`, geocoding helpers, and `getWindDirectionArrow`.
- `unitConverter.ts` — temperature and wind speed conversion for display.

### Weather service helpers (`src/services/weather/`)

Beyond the main pipeline files, several focused modules:
- `weatherKind.ts` — `WeatherKind` enum + mapping functions from WMO codes, OWM condition arrays, icon strings, and NWS short forecasts.
- `warningsService.ts` — `fetchAllWarnings` aggregates NWS, OpenWeather, and MeteoAlarm alerts into `WeatherWarning[]`.
- `wmoUtils.ts`, `openMeteoShared.ts` — shared WMO/Open-Meteo parsing utilities.
- `moonUtils.ts`, `dateUtils.ts`, `windUtils.ts`, `numbers.ts` — pure utility functions.
- `forecastConstants.ts` — shared numeric constants (interpolation windows, day counts, etc.).
- `sharedTypes.ts` — internal types shared across provider adapters and the normalizer.

### Path alias

`@/` resolves to the repo root (not `src/`). So `@/src/types` not `@/types`.

## Conventions

- All temperatures are stored in Celsius internally; `unitConverter.ts` handles display conversion.
- Wind speed is stored in m/s internally.
- Provider-specific raw data is always converted through `forecastNormalize.ts` before reaching components — components never touch raw API shapes.
- Theme is applied via `data-theme` attribute on `<html>` and a `dark` class; Tailwind dark-mode variants use the class strategy.
- Background images must be statically imported in `conditionPalette.ts` — do not use `new URL(...)` or dynamic imports; Vite cannot tree-shake or hash those at build time.
- `WeatherKind` string values double as image filenames (`${kind}.png` in `assets/images/weather/`). Adding a new kind requires a matching PNG.
