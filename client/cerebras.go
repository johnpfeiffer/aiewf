package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	defaultCerebrasEndpoint        = "https://api.cerebras.ai/v1/chat/completions"
	defaultCerebrasReasoningEffort = "medium"
	defaultCerebrasReasoningFormat = "parsed"
)

type Cerebras struct {
	apiKey     string
	endpoint   string
	httpClient *http.Client
}

func NewCerebras(apiKey string) (*Cerebras, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("CEREBRAS_API_KEY is required")
	}
	return &Cerebras{
		apiKey:     apiKey,
		endpoint:   defaultCerebrasEndpoint,
		httpClient: http.DefaultClient,
	}, nil
}

func (c *Cerebras) GenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (string, int, error) {
	data, err := marshalCerebrasLessonRequest(modelName, systemPrompt, userPrompt, temperature)
	if err != nil {
		return "", 0, err
	}
	statusCode, body, err := c.postChatCompletion(ctx, data)
	if err != nil {
		return "", 0, err
	}
	if statusCode < 200 || statusCode >= 300 {
		return "", 0, fmt.Errorf("cerebras chat completion failed: status=%d body=%s", statusCode, strings.TrimSpace(string(body)))
	}

	var response cerebrasChatResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", 0, err
	}
	if len(response.Choices) == 0 {
		return "", 0, fmt.Errorf("cerebras chat completion returned no choices")
	}
	return response.Choices[0].Message.Content, response.Usage.TotalTokens, nil
}

type CerebrasDebugExchange struct {
	Endpoint     string
	RequestBody  []byte
	StatusCode   int
	ResponseBody []byte
}

func (c *Cerebras) DebugGenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (CerebrasDebugExchange, error) {
	data, err := marshalCerebrasLessonRequest(modelName, systemPrompt, userPrompt, temperature)
	if err != nil {
		return CerebrasDebugExchange{}, err
	}
	exchange := CerebrasDebugExchange{
		Endpoint:    c.endpoint,
		RequestBody: data,
	}
	statusCode, body, err := c.postChatCompletion(ctx, data)
	exchange.StatusCode = statusCode
	exchange.ResponseBody = body
	if err != nil {
		return exchange, err
	}
	if statusCode < 200 || statusCode >= 300 {
		return exchange, fmt.Errorf("cerebras chat completion failed: status=%d body=%s", statusCode, strings.TrimSpace(string(body)))
	}
	return exchange, nil
}

func marshalCerebrasLessonRequest(modelName, systemPrompt, userPrompt string, temperature float32) ([]byte, error) {
	requestBody := cerebrasChatRequest{
		Model: modelName,
		Messages: []cerebrasMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: temperature,
		// Cerebras Gemma 4 disables reasoning by default; medium enables reasoning.
		// https://inference-docs.cerebras.ai/capabilities/reasoning
		ReasoningEffort: defaultCerebrasReasoningEffort,
		ReasoningFormat: defaultCerebrasReasoningFormat,
		ResponseFormat: cerebrasResponseFormat{
			Type: "json_schema",
			JSONSchema: cerebrasJSONSchemaFormat{
				Name:   "lesson_schema",
				Strict: true,
				Schema: lessonJSONSchema,
			},
		},
	}
	return json.Marshal(requestBody)
}

func (c *Cerebras) postChatCompletion(ctx context.Context, data []byte) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(data))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	httpClient := c.httpClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, nil, err
	}
	return resp.StatusCode, body, nil
}

type cerebrasChatRequest struct {
	Model           string                 `json:"model"`
	Messages        []cerebrasMessage      `json:"messages"`
	Temperature     float32                `json:"temperature"`
	ReasoningEffort string                 `json:"reasoning_effort"`
	ReasoningFormat string                 `json:"reasoning_format"`
	ResponseFormat  cerebrasResponseFormat `json:"response_format"`
}

type cerebrasMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type cerebrasResponseFormat struct {
	Type       string                   `json:"type"`
	JSONSchema cerebrasJSONSchemaFormat `json:"json_schema"`
}

type cerebrasJSONSchemaFormat struct {
	Name   string         `json:"name"`
	Strict bool           `json:"strict"`
	Schema map[string]any `json:"schema"`
}

type cerebrasChatResponse struct {
	Choices []struct {
		Message struct {
			Role      string `json:"role"`
			Content   string `json:"content"`
			Reasoning string `json:"reasoning,omitempty"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

var lessonJSONSchema = map[string]any{
	"type":                 "object",
	"additionalProperties": false,
	"properties": map[string]any{
		"session_id": map[string]any{"type": "string"},
		"summary":    map[string]any{"type": "string"},
		"key_lesson": map[string]any{"type": "string"},
		"evidence": map[string]any{
			"type":  "array",
			"items": map[string]any{"type": "string"},
		},
		"persona_tags": map[string]any{
			"type": "array",
			"items": map[string]any{
				"type": "string",
				"enum": []string{
					"engineer",
					"product",
					"design",
					"gtm",
					"leadership",
					"founder",
					"recruiting",
					"manager",
					"c-suite",
					"finance",
					"hr",
					"dev-rel",
					"ai-researcher",
					"scientist",
					"other",
				},
			},
		},
		"action_items": map[string]any{
			"type":  "array",
			"items": map[string]any{"type": "string"},
		},
		"confidence": map[string]any{"type": "number"},
		"status": map[string]any{
			"type": "string",
			"enum": []string{"complete", "insufficient_data", "needs_review"},
		},
	},
	"required": []string{
		"session_id",
		"summary",
		"key_lesson",
		"evidence",
		"persona_tags",
		"action_items",
		"confidence",
		"status",
	},
}
