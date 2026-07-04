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
	defaultPrompt      = "prompts/description-v001.txt"
	defaultModel       = "gemma-4-31b-it"
	defaultTemperature = 0
)

type config struct {
	input       string
	output      string
	prompt      string
	modelName   string
	temperature float64
	limit       int
	sessionID   string
}

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	cfg, err := parse(args)
	if err != nil {
		return err
	}

	file, err := model.LoadTranscriptFile(cfg.input)
	if err != nil {
		return err
	}
	promptTemplate, err := model.ReadPrompt(cfg.prompt)
	if err != nil {
		return err
	}
	gemini, err := client.NewGemini(ctx, os.Getenv("GEMINI_API_KEY"))
	if err != nil {
		return err
	}

	distiller := model.DescriptionDistiller{Client: gemini}
	batch := model.DescriptionBatch{
		Source: firstNonEmpty(file.Source, cfg.input),
		Model:  cfg.modelName,
	}

	matchedSession := cfg.sessionID == ""
	for _, segment := range file.Segments {
		if strings.TrimSpace(segment.SessionID) == "" {
			continue
		}
		if cfg.sessionID != "" && segment.SessionID != cfg.sessionID {
			continue
		}
		matchedSession = true
		if cfg.limit > 0 && len(batch.Descriptions) >= cfg.limit {
			break
		}
		proposal, tokens, err := distiller.DistillDescription(ctx, segment, promptTemplate, cfg.modelName, float32(cfg.temperature))
		if err != nil {
			return fmt.Errorf("describe %s: %w", segment.SessionID, err)
		}
		batch.TokensUsed += tokens
		batch.Descriptions = append(batch.Descriptions, proposal)
		fmt.Fprintf(os.Stderr, "described %s tokens=%d\n", proposal.SessionID, tokens)
	}
	if !matchedSession {
		return fmt.Errorf("session %q not found in %s", cfg.sessionID, cfg.input)
	}

	outputJSON, err := model.DescriptionBatchToJSON(batch)
	if err != nil {
		return err
	}
	if cfg.output != "" {
		return os.WriteFile(cfg.output, []byte(outputJSON+"\n"), 0o644)
	}
	fmt.Println(outputJSON)
	return nil
}

func parse(args []string) (config, error) {
	fs := flag.NewFlagSet("descriptions", flag.ContinueOnError)
	cfg := config{}
	fs.StringVar(&cfg.output, "out", "", "optional output JSON path; stdout when empty")
	fs.StringVar(&cfg.prompt, "prompt", defaultPrompt, "description prompt template path")
	fs.StringVar(&cfg.modelName, "model", envDefault("LESSON_MODEL", defaultModel), "Gemini model")
	fs.Float64Var(&cfg.temperature, "temperature", defaultTemperature, "generation temperature")
	fs.IntVar(&cfg.limit, "limit", 0, "max sessions to process; 0 means all")
	fs.StringVar(&cfg.sessionID, "session-id", "", "single session id to process")
	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	if fs.NArg() != 1 {
		return cfg, fmt.Errorf("usage: descriptions [flags] JSONFILE")
	}
	if cfg.limit < 0 {
		return cfg, fmt.Errorf("limit must be >= 0")
	}
	cfg.input = fs.Arg(0)
	return cfg, nil
}

func envDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
