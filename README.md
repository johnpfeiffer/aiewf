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
- `app/src/data/speakers.json` for speaker role, company, and bio context
- `app/src/data/keynote_segments_day*.json` for optional keynote transcript augmentation
- `app/src/data/day*-keynote-descriptions.json` for optional generated description augmentation

The raw keynote transcripts remain in `app/src/data/keynotes-day*.txt`. The derived `app/src/data/keynote_segments_day*.json` files map transcript segments to canonical ASN-backed schedule session ids. The lesson-agent commands load those segment files by default and automatically attach a transcript when the selected session id is present. Use `--no-transcripts` only when you want to disable transcript augmentation, or `--transcripts <path-or-glob>` to override the default source.

The same extraction step writes the consolidated `app/src/data/video-links-for-sessions.json`, which the schedule app uses to show timestamped external video links in session details.

The CLI only uses generated description proposals when the source session description is empty or under 50 characters. The CLI writes generated lessons and judge scores to SQLite, and writes seed golden files to `goldens/` for manual review.

Day 1 was a paid workshop day rather than normal conference talks, so the lesson-agent commands skip `Day 1 — Workshop Day` by default. Use `--include-workshops` to process those sessions explicitly.

`cmd/descriptions` is a separate helper command for filling missing keynote descriptions from derived transcript segments before running the lesson generator.

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
go run ./cmd/descriptions --out app/src/data/day2-keynote-descriptions.json app/src/data/keynote_segments_day2.json
```

Run `generate` before `seed-goldens` when you want the seed file to start from an AI-generated lesson. If no stored generation exists for the same `--db`, `--prompt-version`, and session id, `seed-goldens` writes a schema-valid placeholder for manual authoring.

Description generation writes one valid JSON batch to stdout by default. Use `--out app/src/data/dayN-keynote-descriptions.json` to write a reviewable file for a whole day, and `--session-id <asn-id>` to generate one session.

Rebuild the derived keynote augmentation file after changing the raw transcript or schedule:

```bash
node scripts/reconcile_session_ids.mjs
node scripts/build_keynote_segments.mjs
```

### Validate

```bash
go test ./...
```
