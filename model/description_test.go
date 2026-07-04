package model

import (
	"context"
	"path/filepath"
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

func TestAttachDescriptionProposalsOnlyAugmentsThinDescriptions(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "day2-keynote-descriptions.json")
	writeFile(t, path, `{
  "source": "app/src/data/keynotes-day2.txt",
  "model": "gemma-4-31b-it",
  "tokens_used": 123,
  "descriptions": [
    {
      "session_id": "thin",
      "title": "Thin Session",
      "description": "This generated description is long enough to ground a first-pass lesson for a previously thin keynote session.",
      "confidence": 0.9
    },
    {
      "session_id": "rich",
      "title": "Rich Session",
      "description": "Replacement text should not override source schedule descriptions that already have enough detail.",
      "confidence": 0.9
    }
  ]
}`)

	proposals, err := LoadDescriptionProposals(path)
	if err != nil {
		t.Fatal(err)
	}

	richDescription := "The existing schedule description already contains enough detail to serve as the authoritative source text."
	sessions := AttachDescriptionProposals([]Session{
		{SessionID: "thin", Description: "TBD"},
		{SessionID: "rich", Description: richDescription},
		{SessionID: "missing", Description: ""},
	}, proposals)

	if got := sessions[0].Description; !strings.Contains(got, "first-pass lesson") {
		t.Fatalf("thin description = %q, want generated proposal", got)
	}
	if got := sessions[1].Description; got != richDescription {
		t.Fatalf("rich description = %q, want unchanged source description", got)
	}
	if got := sessions[2].Description; got != "" {
		t.Fatalf("missing description = %q, want unchanged empty description", got)
	}
}
