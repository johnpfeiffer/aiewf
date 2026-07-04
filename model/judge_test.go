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
