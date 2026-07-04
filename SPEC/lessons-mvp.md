# Lessons Learned MVP Specification

This document is derived from `KERNEL/requirements-v2.md`, `KERNEL/INVARIANTS.md`, and the first-pass planning answers from July 3, 2026.

## Scope

Build a root-level Go CLI for a crawl-stage "lesson learned" agent. The MVP runs generation and judging by hand rather than an automated improvement loop.

The source schedule data is read-only:

- `app/src/data/sessions.json`
- `app/src/data/speakers.json`

Optional transcript augmentation is read from:

- `app/src/data/keynote_segments_day*.json`

The raw transcript sources remain:

- `app/src/data/keynotes-day*.txt`

The implementation must not modify files under `KERNEL/`.

## Architecture

Use a root Go module with this package split:

- `cmd/lessons`: CLI entry point.
- `model`: source data, lesson schema, prompt rendering, hard checks, generation orchestration, judge orchestration.
- `client`: Gemini API client wrapper.
- `storage`: SQLite persistence.

The CLI uses standard library plumbing where practical. SQLite persistence uses `modernc.org/sqlite`. Gemini calls use `google.golang.org/genai`.

## Commands

### `lessons generate`

Reads sessions, renders a generation prompt, calls the Gemini API for each selected session, validates the generated lesson JSON, and stores the result in SQLite.

Default flags:

- `--sessions app/src/data/sessions.json`
- `--speakers app/src/data/speakers.json`
- `--transcripts app/src/data/keynote_segments_day*.json`
- `--prompt prompts/v001.txt`
- `--prompt-version v001`
- `--db lessons.db`
- `--model $LESSON_MODEL`, falling back to `gemma-4-31b-it`
- `--temperature 0`
- `--limit 0` where `0` means all selected sessions
- `--session-id ""` where empty means no single-session filter

If a session description is empty or under 50 characters after trimming and no approved transcript segment is attached, the generator must not call the LLM. It must return `status="insufficient_data"`, `confidence=0`, no evidence, and no action items.

### `lessons seed-goldens`

Creates human-reviewable seed golden files under `goldens/`. If a stored generation exists for a session and prompt version, that generation is used as the seed. Otherwise a schema-valid placeholder is written.

### `lessons judge`

Loads the latest stored generation for each selected session and the matching golden file, runs hard checks, and then calls a judge model if hard checks pass.

Default flags:

- `--judge-prompt prompts/judge-v001.txt`
- `--judge-model $JUDGE_MODEL`, falling back to `gemini-2.5-flash`

The judge model must be configurable and should be different from the generation model to reduce self-grading bias.

### `lessons run`

Runs `generate` followed by `judge` with the same session selection.

## Source Adaptation

`KERNEL/requirements-v2.md` describes source sessions with `session_id` and rich speaker objects. The current source file has canonical ASN-backed `session_id` values and preserves the former hash id at `source_ids.derived`:

- If `session_id` or `id` is present, use it.
- Otherwise derive a deterministic id from day, time, room, and title with a short hash suffix.
- Speaker role and company are joined from `app/src/data/speakers.json` by speaker name when available.
- `format` maps from the source `type` field.
- `duration_minutes` is computed from the source time range when possible.

## Transcript Augmentation

`app/src/data/keynote_segments_day*.json` files are AI-derived, human-reviewable augmentation files. They map canonical keynote session ids to transcript segments extracted from `app/src/data/keynotes-day*.txt`.

The schedule app consumes a smaller consolidated derived map at `app/src/data/video-links-for-sessions.json`.

The generator and judge load transcript segments into a session-id map. When a session id is present in the map, the prompt receives both:

- `session_json`
- `transcript_json`

Evidence hard checks accept verbatim phrases from either the schedule description or the matched transcript segment. A session is considered thin only when both the schedule description and transcript segment are missing or under 50 characters.

The extracted JSON is intentionally not written back into `sessions.json`.

## Lesson Schema

Generated lessons use this JSON shape:

```json
{
  "session_id": "string",
  "summary": "string",
  "key_lesson": "string",
  "evidence": ["string"],
  "persona_tags": ["engineer"],
  "action_items": ["string"],
  "confidence": 0.8,
  "status": "complete"
}
```

Allowed statuses:

- `complete`
- `insufficient_data`
- `needs_review`

Allowed persona tags:

- `engineer`
- `product`
- `design`
- `gtm`
- `leadership`
- `founder`
- `recruiting`
- `manager`
- `c-suite`
- `finance`
- `hr`
- `dev-rel`
- `ai-researcher`
- `scientist`
- `other`

## Persistence

SQLite tables:

- `generations(session_id, prompt_version, model, output_json, tokens_used, created_at)`
- `scores(session_id, prompt_version, judge_model, rubric_scores_json, total_score, created_at)`

## First-Pass Non-Goals

- No automatic prompt revision loop.
- No frontend integration.
- No mutation of source schedule, raw transcript, or kernel files.
- No full golden authoring automation beyond seed files.
