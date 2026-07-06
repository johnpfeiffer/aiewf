package model

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNextPromptVersionPreservesWidth(t *testing.T) {
	got, err := NextPromptVersion("v009")
	if err != nil {
		t.Fatal(err)
	}
	if got != "v010" {
		t.Fatalf("NextPromptVersion = %q, want v010", got)
	}
}

func TestLatestPromptVersionIgnoresNonGenerationPrompts(t *testing.T) {
	dir := t.TempDir()
	writePromptFile(t, filepath.Join(dir, "v001.txt"), "one")
	writePromptFile(t, filepath.Join(dir, "judge-v999.txt"), "judge")
	writePromptFile(t, filepath.Join(dir, "v006.txt"), "six")

	got, err := LatestPromptVersion(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got != "v006" {
		t.Fatalf("LatestPromptVersion = %q, want v006", got)
	}
}

func TestDecidePromptAcceptanceRequiresMeanLiftAndNoLargeDrop(t *testing.T) {
	current := EvaluationSummary{
		MeanTotalScore: 0.70,
		SessionScores:  map[string]float64{"s1": 0.7, "s2": 0.7},
	}
	candidate := EvaluationSummary{
		MeanTotalScore: 0.76,
		SessionScores:  map[string]float64{"s1": 0.65, "s2": 0.87},
	}
	decision := DecidePromptAcceptance(current, candidate)
	if !decision.Accepted {
		t.Fatalf("Accepted = false, reason=%s", decision.Reason)
	}

	candidate.SessionScores["s1"] = 0.59
	candidate.MeanTotalScore = 0.78
	decision = DecidePromptAcceptance(current, candidate)
	if decision.Accepted {
		t.Fatal("Accepted = true, want false for >0.10 individual drop")
	}
}

func TestBuildFailureTracesReportsLowRubricItems(t *testing.T) {
	evaluations := []SessionEvaluation{
		{
			SessionID: "s1",
			Result: JudgeResult{
				TotalScore: 0.52,
				DimensionScores: DimensionScores{
					Faithfulness:    DimensionScore{Fraction: 0.8},
					Coverage:        DimensionScore{Fraction: 0.5},
					Transferability: DimensionScore{Fraction: 0.4},
					Actionability:   DimensionScore{Fraction: 0.7},
				},
				ObjectiveScores: ObjectiveScores{ConfidenceCalibration: 0.9},
				HardChecks:      []HardCheck{{Name: "summary", Pass: false, Reason: "too long"}},
			},
		},
	}

	traces := BuildFailureTraces(evaluations)
	if len(traces) != 1 {
		t.Fatalf("len(traces) = %d, want 1", len(traces))
	}
	if len(traces[0].FailedHardChecks) != 1 {
		t.Fatalf("failed hard checks = %d, want 1", len(traces[0].FailedHardChecks))
	}
	if len(traces[0].LowScoringRubricItems) != 2 {
		t.Fatalf("low scoring items = %d, want 2", len(traces[0].LowScoringRubricItems))
	}
}

func TestParsePromptMutationJSON(t *testing.T) {
	mutation, err := ParsePromptMutationJSON(`{
  "new_prompt": "new",
  "mutation_rationale": "because"
}`)
	if err != nil {
		t.Fatal(err)
	}
	if mutation.NewPrompt != "new" {
		t.Fatalf("NewPrompt = %q, want new", mutation.NewPrompt)
	}
}

func TestPromptLeaksGoldenIdentifiers(t *testing.T) {
	sessions := []Session{{
		SessionID: "asn_123",
		Title:     "Specific Talk Title",
		Speakers:  []Speaker{{Name: "Ada Lovelace"}},
	}}
	leaks := PromptLeaksGoldenIdentifiers("Use Ada Lovelace as a pattern.", sessions)
	if len(leaks) != 1 || leaks[0] != "Ada Lovelace" {
		t.Fatalf("leaks = %#v, want Ada Lovelace", leaks)
	}
}

func writePromptFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
