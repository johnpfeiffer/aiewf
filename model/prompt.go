package model

import (
	"encoding/json"
	"os"
	"strings"
)

func ReadPrompt(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func RenderSessionPrompt(template string, session Session) (string, error) {
	sessionJSON, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		return "", err
	}
	transcriptJSON, err := transcriptJSON(session)
	if err != nil {
		return "", err
	}
	replacements := map[string]string{
		"{session_json}":    string(sessionJSON),
		"{transcript_json}": transcriptJSON,
		"{session_id}":      session.SessionID,
		"{title}":           session.Title,
		"{description}":     session.Description,
		"{track}":           session.Track,
		"{format}":          session.Format,
		"{day}":             session.Day,
	}
	rendered := template
	for placeholder, value := range replacements {
		rendered = strings.ReplaceAll(rendered, placeholder, value)
	}
	return rendered, nil
}

func RenderJudgePrompt(template string, session Session, lesson Lesson, golden Lesson) (string, error) {
	sessionJSON, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		return "", err
	}
	transcriptJSON, err := transcriptJSON(session)
	if err != nil {
		return "", err
	}
	lessonJSON, err := json.MarshalIndent(lesson, "", "  ")
	if err != nil {
		return "", err
	}
	goldenJSON, err := json.MarshalIndent(golden, "", "  ")
	if err != nil {
		return "", err
	}
	replacements := map[string]string{
		"{session_json}":    string(sessionJSON),
		"{transcript_json}": transcriptJSON,
		"{lesson_json}":     string(lessonJSON),
		"{golden_json}":     string(goldenJSON),
	}
	rendered := template
	for placeholder, value := range replacements {
		rendered = strings.ReplaceAll(rendered, placeholder, value)
	}
	return rendered, nil
}

func transcriptJSON(session Session) (string, error) {
	if session.Transcript == nil {
		return "null", nil
	}
	data, err := json.MarshalIndent(session.Transcript, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
