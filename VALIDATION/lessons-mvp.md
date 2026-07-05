# Lessons Learned MVP Validation

This document records the proof obligations for the first-pass implementation.

## Required Checks

Run:

```bash
rtk go test ./...
```

## Blackbox Test Targets

The minimal high-value tests cover:

- Loading the existing schedule shape and deriving a stable session id when no id exists.
- Joining speaker role, company, and bio metadata from `speakers.json`.
- Loading transcript augmentation JSON and attaching it by `session_id`.
- Loading generated description proposal JSON and applying it only to source descriptions under 50 characters.
- Skipping `Day 1 — Workshop Day` in lesson-agent session selection unless `--include-workshops` is set.
- Rendering prompt placeholders.
- Returning deterministic `insufficient_data` lessons without an LLM call for descriptions under 50 characters.
- Calling the generator for a short-description session when an approved transcript segment is attached.
- Enforcing hard checks:
  - summary under 100 words
  - exactly one sentence in `key_lesson`
  - evidence appears verbatim in the source description, joined speaker bio, or approved transcript segment
  - confidence between 0 and 1
  - valid status and persona tags
- Zeroing judge totals when a hard check fails.
- Computing judge objective checks in Go:
  - tag F1 against the golden persona tags
  - generated status match against golden status
  - generated evidence-verbatim ratio against approved source material
- Combining the three LLM subjective rubric scores with the three Go-computed objective scores into `total_score`.

## Manual Validation

With `CEREBRAS_API_KEY` and `GEMINI_API_KEY` set:

```bash
rtk go run ./cmd/lessons generate --limit 1
rtk go run ./cmd/lessons seed-goldens --limit 1
rtk go run ./cmd/lessons judge --limit 1
```

Then manually review:

- The generated row in `lessons.db`.
- The seed file in `goldens/`.
- The score row in `lessons.db`.
- The segment mappings in `app/src/data/keynote_segments_day*.json`, especially entries with `confidence < 0.9`.
- The description proposals in `app/src/data/day*-keynote-descriptions.json`; omit sessions whose transcript does not describe a coherent session.

## Known First-Pass Risks

- The default generation model is `gemma-4-31b` on Cerebras because the user requested it. If the Cerebras API account does not expose that exact model id, use `--model` or `LESSON_MODEL` to override it.
- The default judge model is `gemini-3.5-flash` on Google Gemini. If the Gemini API account does not expose that exact model id, use `--judge-model` or `JUDGE_MODEL` to override it.
- Goldens produced by `seed-goldens` are only starting points and must be manually edited before judge scores should be trusted.
