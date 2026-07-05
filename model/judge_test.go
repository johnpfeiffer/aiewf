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
  "rubric_scores": {
    "faithfulness": 5,
    "transferability": 3,
    "actionability": 4
  },
  "rationale_per_dimension": {
    "faithfulness": "The generated evidence quotes source phrase.",
    "transferability": "Diff notes a less causal framing.",
    "actionability": "Diff notes weaker specificity."
  }
}`, 37, nil
}

func TestJudgeCombinesSubjectiveAndObjectiveScores(t *testing.T) {
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
		Confidence:  0.9,
		Status:      StatusComplete,
	}
	golden := Lesson{
		SessionID:   "s1",
		PersonaTags: []string{"engineer", "manager"},
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
	if result.ObjectiveScores.EvidenceVerbatim != 1 {
		t.Fatalf("EvidenceVerbatim = %v, want 1", result.ObjectiveScores.EvidenceVerbatim)
	}
	if result.TotalScore != 4.17 {
		t.Fatalf("TotalScore = %v, want 4.17", result.TotalScore)
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
		Status:      StatusNeedsReview,
	}
	golden := Lesson{
		PersonaTags: []string{"engineer", "manager"},
		Status:      StatusComplete,
	}

	scores := ComputeObjectiveScores(session, lesson, golden)
	if scores.TagF1 != 0.5 {
		t.Fatalf("TagF1 = %v, want 0.5", scores.TagF1)
	}
	if scores.StatusMatch {
		t.Fatal("StatusMatch = true, want false")
	}
	if scores.EvidenceVerbatim != 0.5 {
		t.Fatalf("EvidenceVerbatim = %v, want 0.5", scores.EvidenceVerbatim)
	}
	if scores.TagScore != 3 {
		t.Fatalf("TagScore = %v, want 3", scores.TagScore)
	}
	if scores.StatusScore != 1 {
		t.Fatalf("StatusScore = %v, want 1", scores.StatusScore)
	}
	if scores.EvidenceVerbatimScore != 3 {
		t.Fatalf("EvidenceVerbatimScore = %v, want 3", scores.EvidenceVerbatimScore)
	}
}
