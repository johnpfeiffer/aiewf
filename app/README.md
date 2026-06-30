# AIEWF Schedule App

Frontend-only React SPA for browsing the AI Engineer World's Fair 2026 Day 2 schedule.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:8080.

## Validate

```bash
npm test
npm run build
```

## Features

- Full Day 2 schedule (Tuesday, June 30, 2026) grouped by time slot.
- Search across titles, speakers, tracks, and descriptions.
- Filter by session type (Keynote / Session / Sponsor) and by track.
- Star talks to build **My Schedule**; favorites persist in `localStorage`.
- Overlapping favorites are flagged with a conflict warning and red card outlines.

## Layout

The app mirrors a small MVC-style separation:

- `src/models` — domain types, the embedded schedule data, and pure helpers (filtering, sorting, grouping, conflict detection, favorites persistence).
- `src/controllers` — React hooks (`useSchedule`, `useFavorites`) that own state.
- `src/views` — the top-level `App` layout and tab navigation.
- `src/components` — Material UI presentational components (cards, lists, filters).

The schedule data in `src/models/scheduleData.ts` was parsed from the official printable schedule PDF.

See `../architecture.md` for a fuller code map and notes on where the "interactive loops" schedule entries live.
