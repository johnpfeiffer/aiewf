package client

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestNewGroqRequiresAPIKey(t *testing.T) {
	if _, err := NewGroq(""); err == nil {
		t.Fatal("NewGroq returned nil error for empty API key")
	}
}

func TestGroqGenerateJSONUsesChatCompletionsJSONMode(t *testing.T) {
	var request groqChatRequest
	transport := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.String() != defaultGroqEndpoint {
			t.Fatalf("url = %s, want %s", r.URL.String(), defaultGroqEndpoint)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("Authorization = %q, want Bearer test-key", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatal(err)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body: io.NopCloser(bytes.NewBufferString(`{
  "choices": [{"message": {"role": "assistant", "content": "{\"session_id\":\"s1\"}"}}],
  "usage": {"total_tokens": 17}
}`)),
		}, nil
	})

	client := &Groq{
		apiKey:     "test-key",
		endpoint:   defaultGroqEndpoint,
		httpClient: &http.Client{Transport: transport},
	}
	text, tokens, err := client.GenerateJSON(context.Background(), "groq/compound", "system", "user", 0)
	if err != nil {
		t.Fatal(err)
	}
	if text != `{"session_id":"s1"}` {
		t.Fatalf("text = %q, want JSON content", text)
	}
	if tokens != 17 {
		t.Fatalf("tokens = %d, want 17", tokens)
	}
	if request.Model != "groq/compound" {
		t.Fatalf("model = %q, want groq/compound", request.Model)
	}
	if request.ResponseFormat == nil {
		t.Fatal("ResponseFormat = nil, want json_object")
	}
	if request.ResponseFormat.Type != "json_object" {
		t.Fatalf("response format = %q, want json_object", request.ResponseFormat.Type)
	}
	if request.MaxCompletionTokens != defaultGroqMaxCompletionTokens {
		t.Fatalf("MaxCompletionTokens = %d, want %d", request.MaxCompletionTokens, defaultGroqMaxCompletionTokens)
	}
	if request.ReasoningFormat != defaultGroqReasoningFormat {
		t.Fatalf("ReasoningFormat = %q, want %q", request.ReasoningFormat, defaultGroqReasoningFormat)
	}
	if len(request.Messages) != 2 || request.Messages[0].Role != "system" || request.Messages[1].Role != "user" {
		t.Fatalf("messages = %#v, want system and user messages", request.Messages)
	}
}

func TestGroqDebugGenerateJSONReturnsRawExchange(t *testing.T) {
	rawResponse := `{"choices":[{"message":{"role":"assistant","content":"{\"session_id\":\"s1\"}"}}],"usage":{"total_tokens":17}}`
	var request groqChatRequest
	transport := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatal(err)
		}
		return &http.Response{
			StatusCode: http.StatusAccepted,
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(bytes.NewBufferString(rawResponse)),
		}, nil
	})

	client := &Groq{
		apiKey:     "test-key",
		endpoint:   defaultGroqEndpoint,
		httpClient: &http.Client{Transport: transport},
	}
	exchange, err := client.DebugGenerateJSON(context.Background(), "groq/compound", "system", "user", 0)
	if err != nil {
		t.Fatal(err)
	}
	if exchange.Endpoint != defaultGroqEndpoint {
		t.Fatalf("Endpoint = %q, want %q", exchange.Endpoint, defaultGroqEndpoint)
	}
	if exchange.StatusCode != http.StatusAccepted {
		t.Fatalf("StatusCode = %d, want %d", exchange.StatusCode, http.StatusAccepted)
	}
	if string(exchange.ResponseBody) != rawResponse {
		t.Fatalf("ResponseBody = %q, want raw response", string(exchange.ResponseBody))
	}
	if err := json.Unmarshal(exchange.RequestBody, &request); err != nil {
		t.Fatalf("RequestBody is not JSON: %v", err)
	}
	if request.ResponseFormat != nil {
		t.Fatalf("ResponseFormat = %#v, want omitted", request.ResponseFormat)
	}
	if request.MaxCompletionTokens != defaultGroqMaxCompletionTokens {
		t.Fatalf("MaxCompletionTokens = %d, want %d", request.MaxCompletionTokens, defaultGroqMaxCompletionTokens)
	}
	if request.ReasoningFormat != defaultGroqReasoningFormat {
		t.Fatalf("ReasoningFormat = %q, want %q", request.ReasoningFormat, defaultGroqReasoningFormat)
	}
	var raw map[string]any
	if err := json.Unmarshal(exchange.RequestBody, &raw); err != nil {
		t.Fatalf("RequestBody is not JSON object: %v", err)
	}
	if _, ok := raw["response_format"]; ok {
		t.Fatalf("request body includes response_format: %s", string(exchange.RequestBody))
	}
	if got := raw["max_completion_tokens"]; got != float64(defaultGroqMaxCompletionTokens) {
		t.Fatalf("max_completion_tokens = %#v, want %d", got, defaultGroqMaxCompletionTokens)
	}
	if got := raw["reasoning_format"]; got != defaultGroqReasoningFormat {
		t.Fatalf("reasoning_format = %#v, want %q", got, defaultGroqReasoningFormat)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}
