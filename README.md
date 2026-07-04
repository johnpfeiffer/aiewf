# AI Engineer World's Fair App

This is based on data graciously provided by <https://www.ai.engineer/worldsfair/2026>

> For hackers: our sessions and speakers data is open! 

The app helps attendees and super-fans

## What It Does

- Displays the schedule grouped by start time.
- Searches session titles, descriptions, speakers, speaker roles, and tracks.
- Filters sessions by type and track.
- Lets users star sessions into "My Schedule".
- Links to session video when derived video metadata is available.
- Persists saved sessions in the current browser.
- Detects overlapping saved sessions and highlights conflicts.
- Runs entirely in the browser with embedded schedule data.

Also bonus functions of a port of Swyx interactive demo and the HOMA protocol

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

## Lessons Learned CLI

This repo also contains a root-level Go CLI for generating and judging structured "lesson learned" records from the read-only conference schedule data.

The CLI reads:

- `app/src/data/sessions.json`
- `app/src/data/speakers.json`
- `app/src/data/keynote_segments_day*.json` for optional keynote transcript augmentation

The raw keynote transcripts remain in `app/src/data/keynotes-day*.txt`. The derived `app/src/data/keynote_segments_day*.json` files map transcript segments to schedule session ids without mutating `sessions.json`.

The same extraction step writes the consolidated `app/src/data/session-video-links.json`, which the schedule app uses to show timestamped external video links in session details.

The CLI writes generated lessons and judge scores to SQLite, and writes seed golden files to `goldens/` for manual review.

### Setup

```bash
go mod tidy
export GEMINI_API_KEY=...
```

The default generation model is `gemma-4-31b-it`. Override it with `LESSON_MODEL` or `--model` if your Gemini API account uses a different model id. The default judge model is `gemini-2.5-flash`; override it with `JUDGE_MODEL` or `--judge-model`.

### Commands

```bash
go run ./cmd/lessons generate --limit 1
go run ./cmd/lessons seed-goldens --limit 1
go run ./cmd/lessons judge --limit 1
go run ./cmd/lessons run --limit 1
```

Rebuild the derived keynote augmentation file after changing the raw transcript or schedule:

```bash
node scripts/build_keynote_segments.mjs
```

### Validate

```bash
go test ./...
```
