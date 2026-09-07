# AIEWF App

Frontend-only React SPA for the AI Engineer World's Fair 2026.

The app includes a multi-day schedule browser, a port of swyx's "The Highest
Loop" interactive deck, and a Homa protocol tutorial. It is built with Vite,
React, TypeScript, and Material UI defaults.

## Develop

Use Node.js 24.20.0, which is pinned in `.nvmrc`, and install from the lockfile:

```bash
nvm use
npm ci
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

## Validate

```bash
npm test
npm run build
```

The repository-level `../dependency-baseline.json` records the shared frontend
dependency targets. Packages used by this app are pinned to those exact
versions in `package.json`.

## Features

- Full Day 2, Day 3, and Day 4 schedule grouped by time slot.
- Search across titles, speakers, tracks, and descriptions.
- Filter by session type (Keynote / Session / Sponsor / Workshop) and by track.
- Star talks to build **My Schedule**; favorites persist in `localStorage`.
- Overlapping favorites are flagged with a conflict warning and red card outlines.
- Share a compact schedule URL without overwriting an existing saved schedule.
- Open session video links when derived video metadata is available.
- Explore the Loopcraft and Homa modules from the top-level view switcher.

## Layout

The app mirrors a small MVC-style separation:

- `src/models` — domain types, the embedded schedule data, and pure helpers (filtering, sorting, grouping, conflict detection, favorites persistence).
- `src/controllers` — React hooks (`useSchedule`, `useFavorites`) that own state.
- `src/views` — top-level view shells (`App`, `Loopcraft`, `Homa`) and tab navigation.
- `src/components` — Material UI presentational components (cards, lists, filters).

The schedule data in `src/models/scheduleData.ts` is generated from
`src/data/sessions.json`, `src/data/speakers.json`, and optional derived video
metadata.

See `../architecture.md` for the fuller code map and user journey diagrams.
