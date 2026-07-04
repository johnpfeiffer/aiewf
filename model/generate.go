package model

import (
	"context"
	"fmt"
)

type JSONClient interface {
	GenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (text string, tokens int, err error)
}

type Generator struct {
	Client JSONClient
}

func (g Generator) Generate(ctx context.Context, session Session, promptTemplate, modelName string, temperature float32) (Lesson, int, error) {
	if ThinSourceMaterial(session) {
		return InsufficientDataLesson(session), 0, nil
	}
	if g.Client == nil {
		return Lesson{}, 0, fmt.Errorf("generation client is required for non-thin session %s", session.SessionID)
	}
	systemPrompt, err := RenderSessionPrompt(promptTemplate, session)
	if err != nil {
		return Lesson{}, 0, err
	}
	text, tokens, err := g.Client.GenerateJSON(ctx, modelName, systemPrompt, "Generate the lesson JSON now.", temperature)
	if err != nil {
		return Lesson{}, 0, err
	}
	lesson, err := ParseLessonJSON(text)
	if err != nil {
		return Lesson{}, tokens, err
	}
	if lesson.SessionID == "" {
		lesson.SessionID = session.SessionID
	}
	return lesson, tokens, nil
}

func InsufficientDataLesson(session Session) Lesson {
	return Lesson{
		SessionID:   session.SessionID,
		Summary:     "The source description is too thin to summarize reliably.",
		KeyLesson:   "Insufficient source detail prevents a grounded transferable lesson.",
		Evidence:    []string{},
		PersonaTags: []string{"other"},
		ActionItems: []string{},
		Confidence:  0,
		Status:      StatusInsufficientData,
	}
}

func SeedLesson(session Session) Lesson {
	if ThinSourceMaterial(session) {
		return InsufficientDataLesson(session)
	}
	return Lesson{
		SessionID:   session.SessionID,
		Summary:     "",
		KeyLesson:   "",
		Evidence:    []string{},
		PersonaTags: []string{"other"},
		ActionItems: []string{},
		Confidence:  0,
		Status:      StatusNeedsReview,
	}
}
