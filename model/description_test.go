package model

import (
	"context"
	"strings"
	"testing"
)

type descriptionClient struct {
	systemPrompt string
	userPrompt   string
}

func (c *descriptionClient) GenerateJSON(_ context.Context, _ string, systemPrompt, userPrompt string, _ float32) (string, int, error) {
	c.systemPrompt = systemPrompt
	c.userPrompt = userPrompt
	return `{
  "description": "This session explains how durable evaluation loops help teams improve production agents from real feedback.",
  "evidence": ["durable evaluation loops", "production agents"],
  "confidence": 0.86
}`, 37, nil
}

func TestDescriptionDistillerRendersSegmentAndFillsIdentity(t *testing.T) {
	client := &descriptionClient{}
	segment := TranscriptSegment{
		SessionID:  "asn1",
		Title:      "Agent Eval Loops",
		Start:      "00:01:00",
		End:        "00:10:00",
		Transcript: strings.Repeat("durable evaluation loops for production agents ", 3),
	}

	proposal, tokens, err := (DescriptionDistiller{Client: client}).DistillDescription(
		context.Background(),
		segment,
		"Describe {title}\n{segment_json}",
		"model",
		0,
	)
	if err != nil {
		t.Fatal(err)
	}
	if tokens != 37 {
		t.Fatalf("tokens = %d, want 37", tokens)
	}
	if proposal.SessionID != "asn1" {
		t.Fatalf("SessionID = %q, want asn1", proposal.SessionID)
	}
	if proposal.Title != "Agent Eval Loops" {
		t.Fatalf("Title = %q, want Agent Eval Loops", proposal.Title)
	}
	if !strings.Contains(client.systemPrompt, "durable evaluation loops") {
		t.Fatalf("system prompt did not include transcript: %s", client.systemPrompt)
	}
	if client.userPrompt != "Generate the session description JSON now." {
		t.Fatalf("user prompt = %q", client.userPrompt)
	}
}
