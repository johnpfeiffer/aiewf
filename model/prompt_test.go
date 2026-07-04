package model

import (
	"strings"
	"testing"
)

func TestRenderSessionPromptReplacesPlaceholders(t *testing.T) {
	session := Session{SessionID: "s1", Title: "Title", Description: "A long enough description for prompt rendering."}
	rendered, err := RenderSessionPrompt("id={session_id}\njson={session_json}", session)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(rendered, "{session_id}") || strings.Contains(rendered, "{session_json}") {
		t.Fatalf("unreplaced placeholder in %q", rendered)
	}
	if !strings.Contains(rendered, `"session_id": "s1"`) {
		t.Fatalf("rendered prompt missing session JSON: %s", rendered)
	}
}
