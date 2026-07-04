package model

import (
	"context"
	"strings"
	"testing"
)

type panicClient struct{}

func (panicClient) GenerateJSON(context.Context, string, string, string, float32) (string, int, error) {
	panic("client should not be called")
}

func TestGeneratorDoesNotCallClientForThinDescription(t *testing.T) {
	session := Session{SessionID: "s1", Description: "short"}
	lesson, tokens, err := (Generator{Client: panicClient{}}).Generate(context.Background(), session, "ignored", "model", 0)
	if err != nil {
		t.Fatal(err)
	}
	if tokens != 0 {
		t.Fatalf("tokens = %d, want 0", tokens)
	}
	if lesson.Status != StatusInsufficientData {
		t.Fatalf("status = %q, want %q", lesson.Status, StatusInsufficientData)
	}
	if len(lesson.ActionItems) != 0 {
		t.Fatalf("thin lesson has action items: %#v", lesson.ActionItems)
	}
}

type staticClient struct {
	calls int
}

func (c *staticClient) GenerateJSON(context.Context, string, string, string, float32) (string, int, error) {
	c.calls++
	return `{
  "session_id": "s1",
  "summary": "The talk covered production feedback loops.",
  "key_lesson": "Production agents need replayable feedback loops.",
  "evidence": ["replayable feedback loops"],
  "persona_tags": ["engineer"],
  "action_items": ["Capture replayable feedback loops for one workflow."],
  "confidence": 0.8,
  "status": "complete"
}`, 42, nil
}

func TestGeneratorUsesTranscriptForShortDescription(t *testing.T) {
	client := &staticClient{}
	session := Session{
		SessionID:   "s1",
		Description: "TBD",
		Transcript:  &TranscriptSegment{Transcript: strings.Repeat("replayable feedback loops ", 4)},
	}
	lesson, tokens, err := (Generator{Client: client}).Generate(context.Background(), session, "{session_json}\n{transcript_json}", "model", 0)
	if err != nil {
		t.Fatal(err)
	}
	if client.calls != 1 {
		t.Fatalf("client calls = %d, want 1", client.calls)
	}
	if tokens != 42 {
		t.Fatalf("tokens = %d, want 42", tokens)
	}
	if lesson.Status != StatusComplete {
		t.Fatalf("status = %q, want complete", lesson.Status)
	}
}
