# AI Engineer World's Fair Schedule App

This repository contains a frontend-only schedule browser for AI Engineer World's Fair 2026 Day 2.

The app helps attendees browse the full Tuesday, June 30, 2026 schedule, search for talks, filter by session type or track, and build a local "My Schedule" list by starring sessions. Saved sessions persist in the browser with `localStorage`, and overlapping saved sessions are flagged as conflicts.

## What It Does

- Displays the full Day 2 schedule grouped by start time.
- Searches session titles, descriptions, speakers, speaker roles, and tracks.
- Filters sessions by type and track.
- Lets users star sessions into "My Schedule".
- Persists saved sessions in the current browser.
- Detects overlapping saved sessions and highlights conflicts.
- Runs entirely in the browser with embedded schedule data.

## Quick Start

```bash
cd app
npm install
npm run dev
```

Open http://localhost:8080.

## Validate

```bash
cd app
npm test
npm run build
```

## Project Map

- `app/src/models/scheduleData.ts` contains the generated schedule data.
- `app/src/models/session.ts` contains pure schedule helpers: searching, filtering, sorting, grouping, and conflict detection.
- `app/src/models/favorites.ts` contains browser persistence for saved sessions.
- `app/src/controllers/useSchedule.ts` owns filter state and derives visible sessions.
- `app/src/controllers/useFavorites.ts` owns saved-session state.
- `app/src/views/App.tsx` wires the top-level UI together.
- `app/src/components` contains the reusable Material UI components.

For more detail, including where the "interactive loops" schedule entries live, see [architecture.md](architecture.md).
