package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"aiewf-lessons/client"
	"aiewf-lessons/model"
	"aiewf-lessons/storage"
)

const (
	defaultSessions              = "app/src/data/sessions.json"
	defaultSpeakers              = "app/src/data/speakers.json"
	defaultTranscripts           = "app/src/data/keynote_segments_day*.json"
	defaultDescriptions          = "app/src/data/day*-keynote-descriptions.json"
	defaultPromptsDir            = "prompts"
	defaultJudgePrompt           = "prompts/judge-v002.txt"
	defaultGoldens               = "goldens"
	defaultTunerDir              = "tuner"
	defaultDB                    = "tuner/optimizer.db"
	defaultStartVersion          = "v001"
	defaultLessonModel           = "gemma-4-31b"
	defaultJudgeModel            = "gemini-3.5-flash"
	defaultOptimizerModel        = "gemini-3.5-flash"
	defaultGenerationTemperature = 0
	defaultOptimizerTemperature  = 0.2
	defaultMaxIterations         = 10
	defaultRequiredGoldenCount   = 4
)

type config struct {
	sessions              string
	speakers              string
	transcripts           string
	descriptions          string
	noTranscripts         bool
	includeWorkshops      bool
	promptsDir            string
	judgePrompt           string
	goldens               string
	tunerDir              string
	dbPath                string
	startVersion          string
	latest                bool
	generationModel       string
	judgeModel            string
	optimizerModel        string
	generationTemperature float64
	optimizerTemperature  float64
	maxIterations         int
	requiredGoldenCount   int
	overwritePrompts      bool
}

type goldenCase struct {
	Session model.Session `json:"session"`
	Golden  model.Lesson  `json:"golden"`
}

type iterationLog struct {
	Iteration         int                     `json:"iteration"`
	CurrentVersion    string                  `json:"current_version"`
	CandidateVersion  string                  `json:"candidate_version"`
	Baseline          model.EvaluationSummary `json:"baseline"`
	Candidate         model.EvaluationSummary `json:"candidate"`
	FailureTraces     []model.FailureTrace    `json:"failure_traces"`
	MutationRationale string                  `json:"mutation_rationale"`
	OptimizerTokens   int                     `json:"optimizer_tokens"`
	Decision          model.TuningDecision    `json:"decision"`
	Accepted          bool                    `json:"accepted"`
	StopReason        string                  `json:"stop_reason,omitempty"`
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
	return tune(ctx, cfg)
}

func parse(args []string) (config, error) {
	fs := flag.NewFlagSet("optimizer", flag.ContinueOnError)
	cfg := config{}
	fs.StringVar(&cfg.sessions, "sessions", defaultSessions, "source sessions JSON path")
	fs.StringVar(&cfg.speakers, "speakers", defaultSpeakers, "source speakers JSON path")
	fs.StringVar(&cfg.transcripts, "transcripts", defaultTranscripts, "transcript augmentation override path, glob, or comma-separated paths")
	fs.StringVar(&cfg.descriptions, "descriptions", defaultDescriptions, "optional description augmentation JSON path, glob, or comma-separated paths")
	fs.BoolVar(&cfg.noTranscripts, "no-transcripts", false, "disable transcript augmentation")
	fs.BoolVar(&cfg.includeWorkshops, "include-workshops", false, "include Day 1 workshop sessions")
	fs.StringVar(&cfg.promptsDir, "prompts", defaultPromptsDir, "directory containing versioned generation prompts")
	fs.StringVar(&cfg.judgePrompt, "judge-prompt", defaultJudgePrompt, "judge prompt template path")
	fs.StringVar(&cfg.goldens, "goldens", defaultGoldens, "golden JSON directory")
	fs.StringVar(&cfg.tunerDir, "tuner-dir", defaultTunerDir, "directory for per-iteration tuner JSON logs")
	fs.StringVar(&cfg.dbPath, "db", defaultDB, "SQLite database path")
	fs.StringVar(&cfg.startVersion, "start-version", defaultStartVersion, "starting generation prompt version")
	fs.BoolVar(&cfg.latest, "latest", false, "start from latest vNNN.txt prompt in --prompts")
	fs.StringVar(&cfg.generationModel, "model", envDefault("LESSON_MODEL", defaultLessonModel), "generation model")
	fs.StringVar(&cfg.judgeModel, "judge-model", envDefault("JUDGE_MODEL", defaultJudgeModel), "judge model")
	fs.StringVar(&cfg.optimizerModel, "optimizer-model", envDefault("OPTIMIZER_MODEL", defaultOptimizerModel), "optimizer model")
	fs.Float64Var(&cfg.generationTemperature, "temperature", defaultGenerationTemperature, "generation temperature")
	fs.Float64Var(&cfg.optimizerTemperature, "optimizer-temperature", defaultOptimizerTemperature, "optimizer mutation temperature")
	fs.IntVar(&cfg.maxIterations, "max-iterations", defaultMaxIterations, "maximum tuning iterations")
	fs.IntVar(&cfg.requiredGoldenCount, "required-golden-count", defaultRequiredGoldenCount, "required number of golden files; 0 disables the check")
	fs.BoolVar(&cfg.overwritePrompts, "overwrite-prompts", false, "overwrite candidate prompt files if they already exist")
	if err := fs.Parse(args); err != nil {
		return cfg, err
	}
	if cfg.maxIterations < 1 {
		return cfg, fmt.Errorf("max-iterations must be >= 1")
	}
	return cfg, nil
}

func tune(ctx context.Context, cfg config) error {
	if cfg.latest {
		latest, err := model.LatestPromptVersion(cfg.promptsDir)
		if err != nil {
			return err
		}
		cfg.startVersion = latest
	}

	cases, err := loadGoldenCases(cfg)
	if err != nil {
		return err
	}
	if cfg.requiredGoldenCount > 0 && len(cases) != cfg.requiredGoldenCount {
		return fmt.Errorf("found %d goldens, want %d", len(cases), cfg.requiredGoldenCount)
	}

	store, err := storage.Open(cfg.dbPath)
	if err != nil {
		return err
	}
	defer store.Close()

	currentVersion := cfg.startVersion
	currentPrompt, err := model.ReadPrompt(promptPath(cfg.promptsDir, currentVersion))
	if err != nil {
		return err
	}

	cerebras, err := client.NewCerebras(os.Getenv("CEREBRAS_API_KEY"))
	if err != nil {
		return err
	}
	gemini, err := client.NewGemini(ctx, os.Getenv("GEMINI_API_KEY"))
	if err != nil {
		return err
	}
	judgePrompt, err := model.ReadPrompt(cfg.judgePrompt)
	if err != nil {
		return err
	}

	currentEvaluations, err := evaluatePrompt(ctx, store, cases, currentVersion, currentPrompt, judgePrompt, cfg, cerebras, gemini)
	if err != nil {
		return err
	}
	currentSummary := model.SummarizeEvaluations(currentVersion, currentEvaluations)
	winningVersion := currentVersion

	for iteration := 1; iteration <= cfg.maxIterations; iteration++ {
		traces := model.BuildFailureTraces(currentEvaluations)
		mutation, optimizerTokens, err := (model.Optimizer{Client: gemini}).MutatePrompt(ctx, currentPrompt, traces, cfg.optimizerModel, float32(cfg.optimizerTemperature))
		if err != nil {
			return err
		}
		if leaks := model.PromptLeaksGoldenIdentifiers(mutation.NewPrompt, sessionsFromCases(cases)); len(leaks) > 0 {
			return fmt.Errorf("optimizer candidate leaks golden identifiers: %s", strings.Join(leaks, ", "))
		}

		candidateVersion, err := model.NextPromptVersion(currentVersion)
		if err != nil {
			return err
		}
		if err := writeCandidatePrompt(cfg, candidateVersion, mutation.NewPrompt); err != nil {
			return err
		}

		candidateEvaluations, err := evaluatePrompt(ctx, store, cases, candidateVersion, mutation.NewPrompt, judgePrompt, cfg, cerebras, gemini)
		if err != nil {
			return err
		}
		candidateSummary := model.SummarizeEvaluations(candidateVersion, candidateEvaluations)
		decision := model.DecidePromptAcceptance(currentSummary, candidateSummary)

		log := iterationLog{
			Iteration:         iteration,
			CurrentVersion:    currentVersion,
			CandidateVersion:  candidateVersion,
			Baseline:          currentSummary,
			Candidate:         candidateSummary,
			FailureTraces:     traces,
			MutationRationale: mutation.MutationRationale,
			OptimizerTokens:   optimizerTokens,
			Decision:          decision,
			Accepted:          decision.Accepted,
		}
		if !decision.Accepted {
			log.StopReason = "plateau"
		} else if iteration == cfg.maxIterations {
			log.StopReason = "max_iterations"
		}
		if err := writeIterationLog(cfg.tunerDir, log); err != nil {
			return err
		}

		fmt.Printf("iteration=%d current=%s candidate=%s mean_delta=%.2f worst_drop=%.2f accepted=%t\n",
			iteration, currentVersion, candidateVersion, decision.MeanDelta, decision.WorstDrop, decision.Accepted)

		if !decision.Accepted {
			break
		}
		winningVersion = candidateVersion
		currentVersion = candidateVersion
		currentPrompt = mutation.NewPrompt
		currentEvaluations = candidateEvaluations
		currentSummary = candidateSummary
	}

	fmt.Printf("winning prompt: %s\n", winningVersion)
	return nil
}

func evaluatePrompt(ctx context.Context, store *storage.DB, cases []goldenCase, promptVersion, promptTemplate, judgePrompt string, cfg config, generationClient model.JSONClient, judgeClient model.JSONClient) ([]model.SessionEvaluation, error) {
	generator := model.Generator{Client: generationClient}
	judge := model.Judge{Client: judgeClient}
	evaluations := make([]model.SessionEvaluation, 0, len(cases))
	for _, golden := range cases {
		lesson, generationTokens, err := generator.Generate(ctx, golden.Session, promptTemplate, cfg.generationModel, float32(cfg.generationTemperature))
		if err != nil {
			return nil, fmt.Errorf("generate %s: %w", golden.Session.SessionID, err)
		}
		outputJSON, err := model.LessonToJSON(lesson)
		if err != nil {
			return nil, err
		}
		if err := store.InsertGeneration(golden.Session.SessionID, promptVersion, cfg.generationModel, outputJSON, generationTokens); err != nil {
			return nil, err
		}

		result, judgeTokens, err := judge.Judge(ctx, golden.Session, lesson, golden.Golden, judgePrompt, cfg.judgeModel)
		if err != nil {
			return nil, fmt.Errorf("judge %s: %w", golden.Session.SessionID, err)
		}
		resultJSON, err := model.JudgeResultToJSON(result)
		if err != nil {
			return nil, err
		}
		if err := store.InsertScore(golden.Session.SessionID, promptVersion, cfg.judgeModel, resultJSON, result.TotalScore); err != nil {
			return nil, err
		}
		evaluations = append(evaluations, model.SessionEvaluation{
			SessionID:        golden.Session.SessionID,
			Lesson:           lesson,
			Result:           result,
			GenerationTokens: generationTokens,
			JudgeTokens:      judgeTokens,
		})
		fmt.Printf("evaluated prompt=%s session=%s score=%.2f\n", promptVersion, golden.Session.SessionID, result.TotalScore)
	}
	return evaluations, nil
}

func loadGoldenCases(cfg config) ([]goldenCase, error) {
	ids, err := goldenSessionIDs(cfg.goldens)
	if err != nil {
		return nil, err
	}
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
	if source := transcriptSource(cfg); source != "" {
		segments, err := model.LoadTranscriptSegments(source)
		if err != nil {
			return nil, err
		}
		sessions = model.AttachTranscriptSegments(sessions, segments)
	}
	sessions = model.FilterLessonAgentSessions(sessions, cfg.includeWorkshops)

	cases := make([]goldenCase, 0, len(ids))
	for _, id := range ids {
		session, ok := model.FindSession(sessions, id)
		if !ok {
			return nil, fmt.Errorf("golden session %q not found in source sessions", id)
		}
		golden, err := readGolden(filepath.Join(cfg.goldens, id+".json"))
		if err != nil {
			return nil, err
		}
		cases = append(cases, goldenCase{Session: session, Golden: golden})
	}
	return cases, nil
}

func goldenSessionIDs(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	ids := []string{}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		ids = append(ids, strings.TrimSuffix(entry.Name(), ".json"))
	}
	sort.Strings(ids)
	return ids, nil
}

func readGolden(path string) (model.Lesson, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return model.Lesson{}, err
	}
	var lesson model.Lesson
	if err := json.Unmarshal(data, &lesson); err != nil {
		return model.Lesson{}, err
	}
	return lesson, nil
}

func writeCandidatePrompt(cfg config, version, prompt string) error {
	path := promptPath(cfg.promptsDir, version)
	if !cfg.overwritePrompts {
		if _, err := os.Stat(path); err == nil {
			return fmt.Errorf("%s already exists; use --overwrite-prompts to replace it", path)
		} else if !os.IsNotExist(err) {
			return err
		}
	}
	if err := os.MkdirAll(cfg.promptsDir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(strings.TrimRight(prompt, "\n")+"\n"), 0o644)
}

func writeIterationLog(dir string, log iterationLog) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(log, "", "  ")
	if err != nil {
		return err
	}
	path := filepath.Join(dir, fmt.Sprintf("iteration-%03d.json", log.Iteration))
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func promptPath(dir, version string) string {
	return filepath.Join(dir, version+".txt")
}

func transcriptSource(cfg config) string {
	if cfg.noTranscripts {
		return ""
	}
	if cfg.transcripts != "" {
		return cfg.transcripts
	}
	return defaultTranscripts
}

func sessionsFromCases(cases []goldenCase) []model.Session {
	sessions := make([]model.Session, 0, len(cases))
	for _, c := range cases {
		sessions = append(sessions, c.Session)
	}
	return sessions
}

func envDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
