package model

import (
	"strings"
	"testing"
)

func TestValidateLessonPassesGroundedLesson(t *testing.T) {
	session := Session{
		SessionID:   "s1",
		Description: "Teams need eval loops because production agents fail in ways demos do not expose.",
	}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "The talk covers evaluation loops for production agents. It explains why demos miss production failures.",
		KeyLesson:   "Production agents need feedback loops that expose failures demos cannot reveal.",
		Evidence:    []string{"production agents fail in ways demos do not expose"},
		PersonaTags: []string{"engineer"},
		ActionItems: []string{"Add a regression eval for one agent failure mode."},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	if checks := ValidateLesson(lesson, session); !HardChecksPass(checks) {
		t.Fatalf("hard checks failed: %#v", checks)
	}
}

func TestValidateLessonAcceptsNormalizedEvidenceSourceMatch(t *testing.T) {
	session := Session{
		SessionID:   "s1",
		Description: "Production agents need replayable\u2014traces so teams can debug failures after deployment.",
	}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "The talk covered replayable traces for production agents.",
		KeyLesson:   "Replayable traces make production agent failures easier to debug.",
		Evidence:    []string{"replayable traces so teams can debug failures"},
		PersonaTags: []string{"engineer"},
		ActionItems: []string{"Capture replayable traces for one production agent workflow."},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	if checks := ValidateLesson(lesson, session); !HardChecksPass(checks) {
		t.Fatalf("hard checks failed: %#v", checks)
	}
}

func TestValidateLessonFailsEvidenceMissingFromSource(t *testing.T) {
	session := Session{SessionID: "s1", Description: strings.Repeat("grounded ", 10)}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "A summary.",
		KeyLesson:   "A lesson.",
		Evidence:    []string{"not in source"},
		PersonaTags: []string{"engineer"},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	checks := ValidateLesson(lesson, session)
	if HardChecksPass(checks) {
		t.Fatal("hard checks passed unexpectedly")
	}
}

func TestValidateLessonRequiresThinDescriptionCaution(t *testing.T) {
	session := Session{SessionID: "s1", Description: "short"}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "A summary.",
		KeyLesson:   "A lesson.",
		PersonaTags: []string{"engineer"},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	checks := ValidateLesson(lesson, session)
	if HardChecksPass(checks) {
		t.Fatal("hard checks passed unexpectedly")
	}
}
