package client

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestNewCerebrasRequiresAPIKey(t *testing.T) {
	if _, err := NewCerebras(""); err == nil {
		t.Fatal("NewCerebras returned nil error for empty API key")
	}
}

func TestCerebrasGenerateJSONUsesReasoningAndStructuredOutputs(t *testing.T) {
	var request cerebrasChatRequest
	transport := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.String() != defaultCerebrasEndpoint {
			t.Fatalf("url = %s, want %s", r.URL.String(), defaultCerebrasEndpoint)
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

	client := &Cerebras{
		apiKey:     "test-key",
		endpoint:   defaultCerebrasEndpoint,
		httpClient: &http.Client{Transport: transport},
	}
	text, tokens, err := client.GenerateJSON(context.Background(), "gemma-4-31b", "system", "user", 0)
	if err != nil {
		t.Fatal(err)
	}
	if text != `{"session_id":"s1"}` {
		t.Fatalf("text = %q, want JSON content", text)
	}
	if tokens != 17 {
		t.Fatalf("tokens = %d, want 17", tokens)
	}
	if request.Model != "gemma-4-31b" {
		t.Fatalf("model = %q, want gemma-4-31b", request.Model)
	}
	if request.ReasoningEffort != defaultCerebrasReasoningEffort {
		t.Fatalf("ReasoningEffort = %q, want %q", request.ReasoningEffort, defaultCerebrasReasoningEffort)
	}
	if request.ReasoningFormat != defaultCerebrasReasoningFormat {
		t.Fatalf("ReasoningFormat = %q, want %q", request.ReasoningFormat, defaultCerebrasReasoningFormat)
	}
	if request.ResponseFormat.Type != "json_schema" {
		t.Fatalf("ResponseFormat.Type = %q, want json_schema", request.ResponseFormat.Type)
	}
	if !request.ResponseFormat.JSONSchema.Strict {
		t.Fatal("ResponseFormat.JSONSchema.Strict = false, want true")
	}
	if request.ResponseFormat.JSONSchema.Name != "lesson_schema" {
		t.Fatalf("schema name = %q, want lesson_schema", request.ResponseFormat.JSONSchema.Name)
	}
	if got := request.ResponseFormat.JSONSchema.Schema["additionalProperties"]; got != false {
		t.Fatalf("additionalProperties = %#v, want false", got)
	}
	if len(request.Messages) != 2 || request.Messages[0].Role != "system" || request.Messages[1].Role != "user" {
		t.Fatalf("messages = %#v, want system and user messages", request.Messages)
	}
}

func TestCerebrasDebugGenerateJSONReturnsRawExchange(t *testing.T) {
	rawResponse := `{"choices":[{"message":{"role":"assistant","content":"{\"session_id\":\"s1\"}","reasoning":"thinking"}}],"usage":{"total_tokens":17}}`
	var request cerebrasChatRequest
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

	client := &Cerebras{
		apiKey:     "test-key",
		endpoint:   defaultCerebrasEndpoint,
		httpClient: &http.Client{Transport: transport},
	}
	exchange, err := client.DebugGenerateJSON(context.Background(), "gemma-4-31b", "system", "user", 0)
	if err != nil {
		t.Fatal(err)
	}
	if exchange.Endpoint != defaultCerebrasEndpoint {
		t.Fatalf("Endpoint = %q, want %q", exchange.Endpoint, defaultCerebrasEndpoint)
	}
	if exchange.StatusCode != http.StatusAccepted {
		t.Fatalf("StatusCode = %d, want %d", exchange.StatusCode, http.StatusAccepted)
	}
	if string(exchange.ResponseBody) != rawResponse {
		t.Fatalf("ResponseBody = %q, want raw response", string(exchange.ResponseBody))
	}
	if request.ResponseFormat.Type != "json_schema" {
		t.Fatalf("ResponseFormat.Type = %q, want json_schema", request.ResponseFormat.Type)
	}
	if request.ReasoningEffort != defaultCerebrasReasoningEffort {
		t.Fatalf("ReasoningEffort = %q, want %q", request.ReasoningEffort, defaultCerebrasReasoningEffort)
	}
}
