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

func TestRenderJudgePromptLabelsGeneratedAndGoldenInputs(t *testing.T) {
	session := Session{SessionID: "s1", Description: "A long enough description for prompt rendering."}
	lesson := Lesson{SessionID: "s1", KeyLesson: "Generated lesson."}
	golden := Lesson{SessionID: "s1", KeyLesson: "Golden lesson."}
	template := "Generated lesson JSON:\n{lesson_json}\nGolden reference JSON:\n{golden_json}"

	rendered, err := RenderJudgePrompt(template, session, lesson, golden)
	if err != nil {
		t.Fatal(err)
	}
	for _, placeholder := range []string{"{lesson_json}", "{golden_json}"} {
		if strings.Contains(rendered, placeholder) {
			t.Fatalf("unreplaced placeholder %s in %q", placeholder, rendered)
		}
	}
	if !strings.Contains(rendered, "Generated lesson JSON:") || !strings.Contains(rendered, "Golden reference JSON:") {
		t.Fatalf("rendered prompt missing labels: %s", rendered)
	}
	if !strings.Contains(rendered, "Generated lesson.") || !strings.Contains(rendered, "Golden lesson.") {
		t.Fatalf("rendered prompt missing lesson content: %s", rendered)
	}
}
