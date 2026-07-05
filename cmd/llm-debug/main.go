package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	"aiewf-lessons/client"
	"aiewf-lessons/model"
)

const (
	defaultSessions     = "app/src/data/sessions.json"
	defaultSpeakers     = "app/src/data/speakers.json"
	defaultTranscripts  = "app/src/data/keynote_segments_day*.json"
	defaultDescriptions = "app/src/data/day*-keynote-descriptions.json"
	defaultPrompt       = "prompts/v001.txt"
	defaultLessonModel  = "gemma-4-31b"
	defaultTemperature  = 0
)

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	sessionID, err := parseArgs(args)
	if err != nil {
		return err
	}

	session, err := debugSession(sessionID)
	if err != nil {
		return err
	}
	if model.ThinSourceMaterial(session) {
		return fmt.Errorf("session %q has insufficient source material; no LLM request would be sent by lessons generate", sessionID)
	}

	promptTemplate, err := model.ReadPrompt(defaultPrompt)
	if err != nil {
		return err
	}
	systemPrompt, err := model.RenderSessionPrompt(promptTemplate, session)
	if err != nil {
		return err
	}

	cerebras, err := client.NewCerebras(os.Getenv("CEREBRAS_API_KEY"))
	if err != nil {
		return err
	}
	exchange, err := cerebras.DebugGenerateJSON(ctx, defaultLessonModel, systemPrompt, "Generate the lesson JSON now.", defaultTemperature)
	printExchange(exchange)
	return err
}

func parseArgs(args []string) (string, error) {
	fs := flag.NewFlagSet("llm-debug", flag.ContinueOnError)
	sessionID := fs.String("session-id", "", "session id to debug")
	if err := fs.Parse(args); err != nil {
		return "", err
	}
	if fs.NArg() != 0 {
		return "", fmt.Errorf("unexpected positional argument %q; only --session-id is supported", fs.Arg(0))
	}
	if strings.TrimSpace(*sessionID) == "" {
		return "", fmt.Errorf("--session-id is required")
	}
	return *sessionID, nil
}

func debugSession(sessionID string) (model.Session, error) {
	sessions, err := model.LoadSessions(defaultSessions, defaultSpeakers)
	if err != nil {
		return model.Session{}, err
	}
	proposals, err := model.LoadDescriptionProposals(defaultDescriptions)
	if err != nil {
		return model.Session{}, err
	}
	sessions = model.AttachDescriptionProposals(sessions, proposals)
	segments, err := model.LoadTranscriptSegments(defaultTranscripts)
	if err != nil {
		return model.Session{}, err
	}
	sessions = model.AttachTranscriptSegments(sessions, segments)
	sessions = model.FilterLessonAgentSessions(sessions, false)

	session, ok := model.FindSession(sessions, sessionID)
	if !ok {
		return model.Session{}, fmt.Errorf("session %q not found", sessionID)
	}
	return session, nil
}

func printExchange(exchange client.CerebrasDebugExchange) {
	fmt.Printf("endpoint: %s\n", exchange.Endpoint)
	fmt.Println("request_body:")
	fmt.Println(string(exchange.RequestBody))
	fmt.Printf("response_status: %d\n", exchange.StatusCode)
	fmt.Println("response_body:")
	fmt.Println(string(exchange.ResponseBody))
}
