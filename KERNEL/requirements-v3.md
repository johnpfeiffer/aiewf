# Project: AIEWF Lessons Learned Generator

## Module 3: optimizer

The optimization loop:
1. Load the current (latest) prompt version from prompts/
2. Run generate on all golden sessions (initial training set)
3. Run judge on each output
4. Collect failure traces: which rubric items scored < .6, why
5. Call optimizer LLM with:
   - current prompt text
   - failure traces with specific examples
   - instruction: "Propose exactly ONE modification to the prompt to address the most common failure. Return the full new prompt."
6. Save as next version (prompts/v002.txt)
7. Re-run the generate and judge against the "initial training set"
8. Accept the new prompt only if:
- mean total_score across all 4 goldens improves by >= 0.05 AND no individual golden's total_score drops by > 0.1.

9. Repeat until plateau or 10 iterations

Rules for prompt modifications:
- Never reference specific session titles, speaker names, or session content from the goldens
- Never embed example JSON output in the prompt
- Modifications must be generalizable instructions, not memorized patterns from the training set
- State what you changed and why in a "mutation_rationale" field alongside the new prompt

Log everything to tuner/ as JSON per iteration.
