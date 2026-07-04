package client

import (
	"context"
	"fmt"

	"google.golang.org/genai"
)

type Gemini struct {
	client *genai.Client
}

func NewGemini(ctx context.Context, apiKey string) (*Gemini, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is required")
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, err
	}
	return &Gemini{client: client}, nil
}

func (g *Gemini) GenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (string, int, error) {
	result, err := g.client.Models.GenerateContent(
		ctx,
		modelName,
		genai.Text(userPrompt),
		&genai.GenerateContentConfig{
			SystemInstruction: genai.NewContentFromText(systemPrompt, "system"),
			Temperature:       genai.Ptr(temperature),
			ResponseMIMEType:  "application/json",
		},
	)
	if err != nil {
		return "", 0, err
	}
	tokens := 0
	if result.UsageMetadata != nil {
		tokens = int(result.UsageMetadata.TotalTokenCount)
	}
	return result.Text(), tokens, nil
}
