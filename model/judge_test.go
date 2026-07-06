package model

import (
	"context"
	"testing"
)

func TestJudgeZeroesHardCheckFailure(t *testing.T) {
	session := Session{SessionID: "s1", Description: "short"}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "A summary.",
		KeyLesson:   "A lesson.",
		PersonaTags: []string{"engineer"},
		Confidence:  0.9,
		Status:      StatusComplete,
	}
	result, tokens, err := (Judge{Client: panicClient{}}).Judge(context.Background(), session, lesson, Lesson{}, "ignored", "judge")
	if err != nil {
		t.Fatal(err)
	}
	if tokens != 0 {
		t.Fatalf("tokens = %d, want 0", tokens)
	}
	if result.TotalScore != 0 {
		t.Fatalf("TotalScore = %v, want 0", result.TotalScore)
	}
}

type judgeClient struct {
	systemPrompt string
}

func (c *judgeClient) GenerateJSON(_ context.Context, _ string, systemPrompt, _ string, _ float32) (string, int, error) {
	c.systemPrompt = systemPrompt
	return `{
  "diff": ["generated action item is less specific"],
  "per_item_checks": {
    "faithfulness": [{"item": "source phrase", "reasoning": "It appears in the source.", "pass": true}],
    "coverage": [
      {"golden_concept": "source phrase", "reasoning": "The generated lesson includes this concept.", "pass": true},
      {"golden_concept": "evaluation", "reasoning": "The generated lesson omits evaluation.", "pass": false}
    ],
    "transferability": [
      {"check": "form", "reasoning": "The generated lesson states a need.", "pass": true},
      {"check": "substance", "reasoning": "It is narrow.", "pass": false}
    ],
    "actionability": [{"item": "Apply source phrase.", "reasoning": "The item is concrete.", "pass": true}]
  },
  "dimension_scores": {
    "faithfulness": {"passed": 1, "total": 1, "fraction": 0.0},
    "coverage": {"passed": 1, "total": 2, "fraction": 0.0},
    "transferability": {"passed": 1, "total": 2, "fraction": 0.0},
    "actionability": {"passed": 1, "total": 1, "fraction": 0.0}
  }
}`, 37, nil
}

func TestJudgeCombinesV2DimensionsAndConfidenceCalibration(t *testing.T) {
	client := &judgeClient{}
	session := Session{
		SessionID:   "s1",
		Description: "This source includes source phrase for grounded evaluation.",
	}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "A summary.",
		KeyLesson:   "Teams need source phrase.",
		Evidence:    []string{"source phrase"},
		PersonaTags: []string{"engineer", "product"},
		ActionItems: []string{"Apply source phrase."},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	golden := Lesson{
		SessionID:   "s1",
		PersonaTags: []string{"engineer", "manager"},
		Confidence:  0.9,
		Status:      StatusComplete,
	}

	result, tokens, err := (Judge{Client: client}).Judge(
		context.Background(),
		session,
		lesson,
		golden,
		"Generated lesson JSON:\n{lesson_json}\nGolden reference JSON:\n{golden_json}",
		"judge",
	)
	if err != nil {
		t.Fatal(err)
	}
	if tokens != 37 {
		t.Fatalf("tokens = %d, want 37", tokens)
	}
	if result.ObjectiveScores.TagF1 != 0.5 {
		t.Fatalf("TagF1 = %v, want 0.5", result.ObjectiveScores.TagF1)
	}
	if !result.ObjectiveScores.StatusMatch {
		t.Fatal("StatusMatch = false, want true")
	}
	if result.ObjectiveScores.EvidenceSourceMatch != 1 {
		t.Fatalf("EvidenceSourceMatch = %v, want 1", result.ObjectiveScores.EvidenceSourceMatch)
	}
	if result.DimensionScores.Coverage.Fraction != 0.5 {
		t.Fatalf("Coverage.Fraction = %v, want 0.5", result.DimensionScores.Coverage.Fraction)
	}
	if result.ObjectiveScores.ConfidenceCalibration != 0.9 {
		t.Fatalf("ConfidenceCalibration = %v, want 0.9", result.ObjectiveScores.ConfidenceCalibration)
	}
	if result.TotalScore != 0.78 {
		t.Fatalf("TotalScore = %v, want 0.78", result.TotalScore)
	}
	if client.systemPrompt == "" {
		t.Fatal("systemPrompt was empty")
	}
}

func TestComputeObjectiveScores(t *testing.T) {
	session := Session{Description: "alpha beta"}
	lesson := Lesson{
		Evidence:    []string{"alpha", "missing"},
		PersonaTags: []string{"engineer", "product"},
		Confidence:  0.9,
		Status:      StatusNeedsReview,
	}
	golden := Lesson{
		PersonaTags: []string{"engineer", "manager"},
		Confidence:  0.7,
		Status:      StatusComplete,
	}

	scores := ComputeObjectiveScores(session, lesson, golden)
	if scores.TagF1 != 0.5 {
		t.Fatalf("TagF1 = %v, want 0.5", scores.TagF1)
	}
	if scores.StatusMatch {
		t.Fatal("StatusMatch = true, want false")
	}
	if scores.EvidenceSourceMatch != 0.5 {
		t.Fatalf("EvidenceSourceMatch = %v, want 0.5", scores.EvidenceSourceMatch)
	}
	if scores.ConfidenceDelta != 0.2 {
		t.Fatalf("ConfidenceDelta = %v, want 0.2", scores.ConfidenceDelta)
	}
}

func TestCombinedJudgeScoreDingsOverconfidentPoorerGeneration(t *testing.T) {
	scores := DimensionScores{
		Faithfulness:    DimensionScore{Passed: 3, Total: 5},
		Coverage:        DimensionScore{Passed: 3, Total: 5},
		Transferability: DimensionScore{Passed: 3, Total: 5},
		Actionability:   DimensionScore{Passed: 3, Total: 5},
	}
	scores = normalizeDimensionScores(scores)
	lesson := Lesson{Confidence: 0.9}
	golden := Lesson{Confidence: 0.7}
	objectiveScores := applyConfidenceCalibration(scores, ObjectiveScores{}, lesson, golden)

	if objectiveScores.ConfidenceCalibration != 0.4 {
		t.Fatalf("ConfidenceCalibration = %v, want 0.4", objectiveScores.ConfidenceCalibration)
	}
	if total := combinedJudgeScore(scores, objectiveScores, lesson, golden); total != 0.56 {
		t.Fatalf("combinedJudgeScore = %v, want 0.56", total)
	}
}

func TestCombinedJudgeScoreZerosUnjustifiedInsufficientData(t *testing.T) {
	lesson := Lesson{Status: StatusInsufficientData, Confidence: 0}
	golden := Lesson{Status: StatusComplete, Confidence: 0.8}
	objectiveScores := applyConfidenceCalibration(DimensionScores{}, ObjectiveScores{}, lesson, golden)

	if total := combinedJudgeScore(DimensionScores{}, objectiveScores, lesson, golden); total != 0 {
		t.Fatalf("combinedJudgeScore = %v, want 0", total)
	}
}
