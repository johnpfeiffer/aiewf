package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"aiewf-lessons/client"
	"aiewf-lessons/model"
	"aiewf-lessons/storage"
)

const (
	defaultSessions     = "app/src/data/sessions.json"
	defaultSpeakers     = "app/src/data/speakers.json"
	defaultTranscripts  = "app/src/data/keynote_segments_day*.json"
	defaultDescriptions = "app/src/data/day*-keynote-descriptions.json"
	defaultPrompt       = "prompts/v001.txt"
	defaultJudgePrompt  = "prompts/judge-v001.txt"
	defaultPromptVer    = "v001"
	defaultDB           = "lessons.db"
	defaultGoldens      = "goldens"
	defaultLessonModel  = "gemma-4-31b-it"
	defaultJudgeModel   = "gemini-2.5-flash"
	defaultTemperature  = 0
)

type commonConfig struct {
	sessions      string
	speakers      string
	transcripts   string
	descriptions  string
	dbPath        string
	promptVersion string
	limit         int
	sessionID     string
}

type generateConfig struct {
	commonConfig
	prompt      string
	modelName   string
	temperature float64
}

type judgeConfig struct {
	commonConfig
	goldens     string
	judgePrompt string
	judgeModel  string
}

func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string) error {
	if len(args) == 0 {
		usage()
		return nil
	}

	switch args[0] {
	case "generate":
		cfg, err := parseGenerate(args[1:])
		if err != nil {
			return err
		}
		return generate(ctx, cfg)
	case "seed-goldens":
		cfg, err := parseJudge(args[1:])
		if err != nil {
			return err
		}
		return seedGoldens(cfg)
	case "judge":
		cfg, err := parseJudge(args[1:])
		if err != nil {
			return err
		}
		return judge(ctx, cfg)
	case "run":
		genCfg, judgeCfg, err := parseRun(args[1:])
		if err != nil {
			return err
		}
		if err := generate(ctx, genCfg); err != nil {
			return err
		}
		return judge(ctx, judgeCfg)
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}
}

func parseGenerate(args []string) (generateConfig, error) {
	fs := flag.NewFlagSet("generate", flag.ContinueOnError)
	cfg := generateConfig{}
	addCommonFlags(fs, &cfg.commonConfig)
	fs.StringVar(&cfg.prompt, "prompt", defaultPrompt, "generation prompt template path")
	fs.StringVar(&cfg.modelName, "model", envDefault("LESSON_MODEL", defaultLessonModel), "generation model")
	fs.Float64Var(&cfg.temperature, "temperature", defaultTemperature, "generation temperature")
	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func parseJudge(args []string) (judgeConfig, error) {
	fs := flag.NewFlagSet("judge", flag.ContinueOnError)
	cfg := judgeConfig{}
	addCommonFlags(fs, &cfg.commonConfig)
	fs.StringVar(&cfg.goldens, "goldens", defaultGoldens, "golden JSON directory")
	fs.StringVar(&cfg.judgePrompt, "judge-prompt", defaultJudgePrompt, "judge prompt template path")
	fs.StringVar(&cfg.judgeModel, "judge-model", envDefault("JUDGE_MODEL", defaultJudgeModel), "judge model")
	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func parseRun(args []string) (generateConfig, judgeConfig, error) {
	fs := flag.NewFlagSet("run", flag.ContinueOnError)
	common := commonConfig{}
	addCommonFlags(fs, &common)

	prompt := fs.String("prompt", defaultPrompt, "generation prompt template path")
	modelName := fs.String("model", envDefault("LESSON_MODEL", defaultLessonModel), "generation model")
	temperature := fs.Float64("temperature", defaultTemperature, "generation temperature")
	goldens := fs.String("goldens", defaultGoldens, "golden JSON directory")
	judgePrompt := fs.String("judge-prompt", defaultJudgePrompt, "judge prompt template path")
	judgeModel := fs.String("judge-model", envDefault("JUDGE_MODEL", defaultJudgeModel), "judge model")

	if err := fs.Parse(args); err != nil {
		return generateConfig{}, judgeConfig{}, err
	}
	return generateConfig{
			commonConfig: common,
			prompt:       *prompt,
			modelName:    *modelName,
			temperature:  *temperature,
		}, judgeConfig{
			commonConfig: common,
			goldens:      *goldens,
			judgePrompt:  *judgePrompt,
			judgeModel:   *judgeModel,
		}, nil
}

func addCommonFlags(fs *flag.FlagSet, cfg *commonConfig) {
	fs.StringVar(&cfg.sessions, "sessions", defaultSessions, "source sessions JSON path")
	fs.StringVar(&cfg.speakers, "speakers", defaultSpeakers, "source speakers JSON path")
	fs.StringVar(&cfg.transcripts, "transcripts", defaultTranscripts, "optional transcript augmentation JSON path, glob, or comma-separated paths")
	fs.StringVar(&cfg.descriptions, "descriptions", defaultDescriptions, "optional description augmentation JSON path, glob, or comma-separated paths")
	fs.StringVar(&cfg.dbPath, "db", defaultDB, "SQLite database path")
	fs.StringVar(&cfg.promptVersion, "prompt-version", defaultPromptVer, "prompt version")
	fs.IntVar(&cfg.limit, "limit", 0, "max sessions to process; 0 means all")
	fs.StringVar(&cfg.sessionID, "session-id", "", "single session id to process")
}

func generate(ctx context.Context, cfg generateConfig) error {
	sessions, err := selectedSessions(cfg.commonConfig)
	if err != nil {
		return err
	}
	promptTemplate, err := model.ReadPrompt(cfg.prompt)
	if err != nil {
		return err
	}
	store, err := storage.Open(cfg.dbPath)
	if err != nil {
		return err
	}
	defer store.Close()

	var gemini *client.Gemini
	generator := model.Generator{}
	for _, session := range sessions {
		if !model.ThinSourceMaterial(session) && generator.Client == nil {
			gemini, err = client.NewGemini(ctx, os.Getenv("GEMINI_API_KEY"))
			if err != nil {
				return err
			}
			generator.Client = gemini
		}

		lesson, tokens, err := generator.Generate(ctx, session, promptTemplate, cfg.modelName, float32(cfg.temperature))
		if err != nil {
			return fmt.Errorf("generate %s: %w", session.SessionID, err)
		}
		checks := model.ValidateLesson(lesson, session)
		if !model.HardChecksPass(checks) {
			return fmt.Errorf("generate %s failed hard checks: %s", session.SessionID, firstFailed(checks))
		}
		outputJSON, err := model.LessonToJSON(lesson)
		if err != nil {
			return err
		}
		if err := store.InsertGeneration(session.SessionID, cfg.promptVersion, cfg.modelName, outputJSON, tokens); err != nil {
			return err
		}
		fmt.Printf("generated %s status=%s tokens=%d\n", session.SessionID, lesson.Status, tokens)
	}
	return nil
}

func seedGoldens(cfg judgeConfig) error {
	sessions, err := selectedSessions(cfg.commonConfig)
	if err != nil {
		return err
	}
	store, err := storage.Open(cfg.dbPath)
	if err != nil {
		return err
	}
	defer store.Close()

	if err := os.MkdirAll(cfg.goldens, 0o755); err != nil {
		return err
	}
	for _, session := range sessions {
		lesson := model.SeedLesson(session)
		generation, err := store.LatestGeneration(session.SessionID, cfg.promptVersion)
		if err == nil {
			parsed, parseErr := model.ParseLessonJSON(generation.OutputJSON)
			if parseErr != nil {
				return parseErr
			}
			lesson = parsed
		} else if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		outputJSON, err := model.LessonToJSON(lesson)
		if err != nil {
			return err
		}
		path := filepath.Join(cfg.goldens, session.SessionID+".json")
		if err := os.WriteFile(path, []byte(outputJSON+"\n"), 0o644); err != nil {
			return err
		}
		fmt.Printf("seeded %s\n", path)
	}
	return nil
}

func judge(ctx context.Context, cfg judgeConfig) error {
	sessions, err := selectedSessions(cfg.commonConfig)
	if err != nil {
		return err
	}
	promptTemplate, err := model.ReadPrompt(cfg.judgePrompt)
	if err != nil {
		return err
	}
	store, err := storage.Open(cfg.dbPath)
	if err != nil {
		return err
	}
	defer store.Close()

	var gemini *client.Gemini
	judge := model.Judge{}
	for _, session := range sessions {
		generation, err := store.LatestGeneration(session.SessionID, cfg.promptVersion)
		if err != nil {
			return fmt.Errorf("load generation for %s: %w", session.SessionID, err)
		}
		lesson, err := model.ParseLessonJSON(generation.OutputJSON)
		if err != nil {
			return err
		}
		golden, err := readGolden(cfg.goldens, session.SessionID)
		if err != nil {
			return err
		}
		if model.HardChecksPass(model.ValidateLesson(lesson, session)) && judge.Client == nil {
			gemini, err = client.NewGemini(ctx, os.Getenv("GEMINI_API_KEY"))
			if err != nil {
				return err
			}
			judge.Client = gemini
		}
		result, tokens, err := judge.Judge(ctx, session, lesson, golden, promptTemplate, cfg.judgeModel)
		if err != nil {
			return fmt.Errorf("judge %s: %w", session.SessionID, err)
		}
		resultJSON, err := model.JudgeResultToJSON(result)
		if err != nil {
			return err
		}
		if err := store.InsertScore(session.SessionID, cfg.promptVersion, cfg.judgeModel, resultJSON, result.TotalScore); err != nil {
			return err
		}
		fmt.Printf("judged %s score=%.2f tokens=%d\n", session.SessionID, result.TotalScore, tokens)
	}
	return nil
}

func selectedSessions(cfg commonConfig) ([]model.Session, error) {
	sessions, err := model.LoadSessions(cfg.sessions, cfg.speakers)
	if err != nil {
		return nil, err
	}
	if cfg.descriptions != "" {
		proposals, err := model.LoadDescriptionProposals(cfg.descriptions)
		if err != nil {
			return nil, err
		}
		sessions = model.AttachDescriptionProposals(sessions, proposals)
	}
	if cfg.transcripts != "" {
		segments, err := model.LoadTranscriptSegments(cfg.transcripts)
		if err != nil {
			return nil, err
		}
		sessions = model.AttachTranscriptSegments(sessions, segments)
	}
	if cfg.sessionID != "" {
		session, ok := model.FindSession(sessions, cfg.sessionID)
		if !ok {
			return nil, fmt.Errorf("session %q not found", cfg.sessionID)
		}
		return []model.Session{session}, nil
	}
	if cfg.limit > 0 && cfg.limit < len(sessions) {
		return sessions[:cfg.limit], nil
	}
	return sessions, nil
}

func readGolden(dir, sessionID string) (model.Lesson, error) {
	data, err := os.ReadFile(filepath.Join(dir, sessionID+".json"))
	if err != nil {
		return model.Lesson{}, err
	}
	var lesson model.Lesson
	if err := json.Unmarshal(data, &lesson); err != nil {
		return model.Lesson{}, err
	}
	return lesson, nil
}

func firstFailed(checks []model.HardCheck) string {
	for _, check := range checks {
		if !check.Pass {
			return check.Name + ": " + check.Reason
		}
	}
	return ""
}

func envDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func usage() {
	fmt.Println(`usage:
  lessons generate [flags]
  lessons seed-goldens [flags]
  lessons judge [flags]
  lessons run [flags]

common flags:
  --sessions app/src/data/sessions.json
  --speakers app/src/data/speakers.json
  --transcripts app/src/data/keynote_segments_day*.json
  --descriptions app/src/data/day*-keynote-descriptions.json
  --db lessons.db
  --prompt-version v001
  --limit 0
  --session-id <id>`)
}
