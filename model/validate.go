package model

import (
	"fmt"
	"regexp"
	"strings"
)

func ValidateLesson(lesson Lesson, session Session) []HardCheck {
	checks := []HardCheck{
		check("session_id", lesson.SessionID == session.SessionID, fmt.Sprintf("got %q, want %q", lesson.SessionID, session.SessionID)),
		check("summary_under_100_words", wordCount(lesson.Summary) <= 100, "summary exceeds 100 words"),
		check("key_lesson_one_sentence", exactlyOneSentence(lesson.KeyLesson), "key_lesson must be exactly one sentence"),
		check("confidence_range", lesson.Confidence >= 0 && lesson.Confidence <= 1, "confidence must be between 0 and 1"),
		check("valid_status", validStatus(lesson.Status), "status is not allowed"),
		check("valid_persona_tags", validPersonaTags(lesson.PersonaTags), "persona_tags contain an unknown tag"),
	}

	for i, evidence := range lesson.Evidence {
		name := fmt.Sprintf("evidence_%d_verbatim", i)
		pass := EvidenceAppearsInSourceMaterial(session, evidence)
		checks = append(checks, check(name, pass, "evidence item does not appear verbatim in approved source material"))
	}

	if ThinSourceMaterial(session) {
		checks = append(checks,
			check("thin_status", lesson.Status == StatusInsufficientData, "thin source material must be insufficient_data"),
			check("thin_confidence", lesson.Confidence < 0.3, "thin source material requires confidence < 0.3"),
			check("thin_no_evidence", len(lesson.Evidence) == 0, "thin source material must not include evidence"),
			check("thin_no_action_items", len(lesson.ActionItems) == 0, "thin source material must not include action_items"),
		)
	}

	if len(lesson.ActionItems) > 3 {
		checks = append(checks, check("action_items_count", false, "action_items must contain 0-3 items"))
	} else {
		checks = append(checks, check("action_items_count", true, ""))
	}

	return checks
}

func HardChecksPass(checks []HardCheck) bool {
	for _, check := range checks {
		if !check.Pass {
			return false
		}
	}
	return true
}

func check(name string, pass bool, reason string) HardCheck {
	if pass {
		reason = ""
	}
	return HardCheck{Name: name, Pass: pass, Reason: reason}
}

func validStatus(status string) bool {
	switch status {
	case StatusComplete, StatusInsufficientData, StatusNeedsReview:
		return true
	default:
		return false
	}
}

func validPersonaTags(tags []string) bool {
	if len(tags) == 0 {
		return false
	}
	for _, tag := range tags {
		if _, ok := PersonaTags[tag]; !ok {
			return false
		}
	}
	return true
}

func wordCount(value string) int {
	return len(strings.Fields(value))
}

var sentenceEnd = regexp.MustCompile(`[.!?]`)

func exactlyOneSentence(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	matches := sentenceEnd.FindAllStringIndex(value, -1)
	if len(matches) != 1 {
		return false
	}
	last := matches[0]
	return strings.TrimSpace(value[last[1]:]) == ""
}
