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
	defaultGroqEndpoint            = "https://api.groq.com/openai/v1/chat/completions"
	defaultGroqMaxCompletionTokens = 6000
	defaultGroqReasoningFormat     = "parsed"
)

type Groq struct {
	apiKey     string
	endpoint   string
	httpClient *http.Client
}

func NewGroq(apiKey string) (*Groq, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("GROQ_API_KEY is required")
	}
	return &Groq{
		apiKey:     apiKey,
		endpoint:   defaultGroqEndpoint,
		httpClient: http.DefaultClient,
	}, nil
}

func (g *Groq) GenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (string, int, error) {
	data, err := marshalGroqRequest(modelName, systemPrompt, userPrompt, temperature, true)
	if err != nil {
		return "", 0, err
	}
	statusCode, body, err := g.postChatCompletion(ctx, data)
	if err != nil {
		return "", 0, err
	}
	if statusCode < 200 || statusCode >= 300 {
		return "", 0, fmt.Errorf("groq chat completion failed: status=%d body=%s", statusCode, strings.TrimSpace(string(body)))
	}

	var response groqChatResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", 0, err
	}
	if len(response.Choices) == 0 {
		return "", 0, fmt.Errorf("groq chat completion returned no choices")
	}
	return response.Choices[0].Message.Content, response.Usage.TotalTokens, nil
}

type GroqDebugExchange struct {
	Endpoint     string
	RequestBody  []byte
	StatusCode   int
	ResponseBody []byte
}

func (g *Groq) DebugGenerateJSON(ctx context.Context, modelName, systemPrompt, userPrompt string, temperature float32) (GroqDebugExchange, error) {
	data, err := marshalGroqRequest(modelName, systemPrompt, userPrompt, temperature, false)
	if err != nil {
		return GroqDebugExchange{}, err
	}
	exchange := GroqDebugExchange{
		Endpoint:    g.endpoint,
		RequestBody: data,
	}
	statusCode, body, err := g.postChatCompletion(ctx, data)
	exchange.StatusCode = statusCode
	exchange.ResponseBody = body
	if err != nil {
		return exchange, err
	}
	if statusCode < 200 || statusCode >= 300 {
		return exchange, fmt.Errorf("groq chat completion failed: status=%d body=%s", statusCode, strings.TrimSpace(string(body)))
	}
	return exchange, nil
}

func marshalGroqRequest(modelName, systemPrompt, userPrompt string, temperature float32, includeResponseFormat bool) ([]byte, error) {
	requestBody := groqChatRequest{
		Model: modelName,
		Messages: []groqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature:         temperature,
		MaxCompletionTokens: defaultGroqMaxCompletionTokens,
		// Groq reasoning docs: JSON mode rejects raw reasoning; keep reasoning separate from content.
		// https://console.groq.com/docs/reasoning
		ReasoningFormat: defaultGroqReasoningFormat,
	}
	if includeResponseFormat {
		requestBody.ResponseFormat = &groqResponseFormat{
			Type: "json_object",
		}
	}
	return json.Marshal(requestBody)
}

func (g *Groq) postChatCompletion(ctx context.Context, data []byte) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.endpoint, bytes.NewReader(data))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	httpClient := g.httpClient
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

type groqChatRequest struct {
	Model               string              `json:"model"`
	Messages            []groqMessage       `json:"messages"`
	Temperature         float32             `json:"temperature"`
	MaxCompletionTokens int                 `json:"max_completion_tokens"`
	ReasoningFormat     string              `json:"reasoning_format"`
	ResponseFormat      *groqResponseFormat `json:"response_format,omitempty"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponseFormat struct {
	Type string `json:"type"`
}

type groqChatResponse struct {
	Choices []struct {
		Message groqMessage `json:"message"`
	} `json:"choices"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}
