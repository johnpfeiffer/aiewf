# Project: AIEWF Lessons Learned Generator

Golang CLI preferring the standard library

use https://pkg.go.dev/modernc.org/sqlite to add persistence with sqlite

## System overview
An eval-driven pipeline that takes raw conference session JSON  and produces structured "lesson learned" records.

MVP of the system has components: generator, judge

## Data model

Source input per session (from sessions.json):
- session_id: str (canonical, e.g. "asn_slot_2026_06_30_...")
- title: str
- description: str | None (many are empty — this is a key edge case)
- speakers: list[{name, title, company}]
- track: str
- format: str (talk | panel | workshop | lightning)
- duration_minutes: int
- day: str

Generated output per session (Lesson):
- session_id: str
- summary: str (2-3 sentences, what the talk covered)
- key_lesson: str (1 sentence, transferable insight)
- evidence: list[str] (phrases from description that support key_lesson)
- persona_tags: list[str] (can be multiple from the fixed taxonomy: 
    ["engineer", "product", "design", "gtm", "leadership", "founder", "recruiting", "manager", "c-suite", "finance", "hr", "dev-rel", "ai-researcher", "scientist", "other"])
- action_items: list[str] (0-3, concrete next steps)
- confidence: float (0-1, generator's self-assessed confidence based on input richness)
- status: "complete" | "insufficient_data" | "needs_review"

Storage: SQLite, two tables:
- generations(session_id, prompt_version, model, output_json, tokens_used, created_at)
- scores(session_id, prompt_version, judge_model, rubric_scores_json, total_score, created_at)

## Module 1: generator

Takes a session and a prompt template (loaded from prompts/ dir as versioned .txt files, e.g. prompts/v001.txt).

The prompt template uses {placeholders} for session fields.

Calls the LLM API with:
- system prompt: the template with session data interpolated
- response forced to JSON via prefill or tool_use
- temperature 0 for eval runs, 0.3 for production

CRITICAL: if description is empty or < 50 chars, the generator MUST return status="insufficient_data" and confidence < 0.3. 
Do not hallucinate lessons from titles alone.


## Module 2: judge

Takes a generated Lesson + the golden reference (from goldens/ dir as JSON files keyed by session_id).

Scoring rubric (each 1-5):
- faithfulness: every claim in key_lesson traceable to evidence[]
    which traces to description. 1 = fabricated, 5 = fully grounded
- transferability: lesson useful beyond this specific talk/product.
    1 = "Speaker X announced Y", 5 = pattern applicable elsewhere  
- actionability: action_items are concrete, not generic.
    1 = "learn more about X", 5 = "implement X pattern in Y context"
- tag_accuracy: F1 score of persona_tags vs golden, mapped to 1-5
- appropriate_caution: did it correctly flag insufficient_data when input was thin?
  Binary: 5 if correct, 1 if wrong direction

Hard checks (pass/fail, not scored):
- Valid JSON matching schema
- summary under 100 words
- key_lesson is exactly 1 sentence
- evidence[] items each appear verbatim in source description
- 0 <= confidence <= 1

Total = mean of rubric scores, zeroed if any hard check fails.

The judge uses a DIFFERENT model (configurable and ENV) to avoid self-grading bias.
It gets: the source session data, the generated lesson, the golden reference, and the rubric definitions.


