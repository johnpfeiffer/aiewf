package model

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const OptimizerSystemPrompt = `You optimize a lesson-generation prompt for an eval-driven pipeline.

Return exactly one JSON object with:
{
  "new_prompt": "full replacement prompt text",
  "mutation_rationale": "what changed and why"
}

Rules:
- Propose exactly ONE modification that addresses the most common failure.
- Return the full new prompt, not a patch.
- Never reference specific session titles, speaker names, or session content from the goldens.
- Never embed example JSON output in the prompt.
- Make the change a generalizable instruction, not a memorized pattern from the training set.
- Output JSON only.`

type Optimizer struct {
	Client JSONClient
}

type PromptMutation struct {
	NewPrompt         string `json:"new_prompt"`
	MutationRationale string `json:"mutation_rationale"`
}

type LowScoringRubricItem struct {
	Name     string  `json:"name"`
	Fraction float64 `json:"fraction"`
	Reason   string  `json:"reason,omitempty"`
}

type FailureTrace struct {
	SessionID             string                 `json:"session_id"`
	TotalScore            float64                `json:"total_score"`
	FailedHardChecks      []HardCheck            `json:"failed_hard_checks,omitempty"`
	LowScoringRubricItems []LowScoringRubricItem `json:"low_scoring_rubric_items,omitempty"`
	Rationale             string                 `json:"rationale,omitempty"`
	RationalePerDimension map[string]string      `json:"rationale_per_dimension,omitempty"`
	Diff                  []string               `json:"diff,omitempty"`
	ObjectiveScores       ObjectiveScores        `json:"objective_scores"`
}

type SessionEvaluation struct {
	SessionID        string      `json:"session_id"`
	Lesson           Lesson      `json:"lesson"`
	Result           JudgeResult `json:"judge_result"`
	GenerationTokens int         `json:"generation_tokens"`
	JudgeTokens      int         `json:"judge_tokens"`
}

type EvaluationSummary struct {
	PromptVersion  string             `json:"prompt_version"`
	MeanTotalScore float64            `json:"mean_total_score"`
	SessionScores  map[string]float64 `json:"session_scores"`
}

type TuningDecision struct {
	Accepted  bool    `json:"accepted"`
	MeanDelta float64 `json:"mean_delta"`
	WorstDrop float64 `json:"worst_drop"`
	Reason    string  `json:"reason"`
}

func (o Optimizer) MutatePrompt(ctx context.Context, currentPrompt string, traces []FailureTrace, modelName string, temperature float32) (PromptMutation, int, error) {
	if o.Client == nil {
		return PromptMutation{}, 0, fmt.Errorf("optimizer client is required")
	}
	userPrompt, err := RenderOptimizerUserPrompt(currentPrompt, traces)
	if err != nil {
		return PromptMutation{}, 0, err
	}
	text, tokens, err := o.Client.GenerateJSON(ctx, modelName, OptimizerSystemPrompt, userPrompt, temperature)
	if err != nil {
		return PromptMutation{}, tokens, err
	}
	mutation, err := ParsePromptMutationJSON(text)
	if err != nil {
		return PromptMutation{}, tokens, err
	}
	if strings.TrimSpace(mutation.NewPrompt) == "" {
		return PromptMutation{}, tokens, fmt.Errorf("optimizer returned empty new_prompt")
	}
	if strings.TrimSpace(mutation.MutationRationale) == "" {
		return PromptMutation{}, tokens, fmt.Errorf("optimizer returned empty mutation_rationale")
	}
	return mutation, tokens, nil
}

func RenderOptimizerUserPrompt(currentPrompt string, traces []FailureTrace) (string, error) {
	traceJSON, err := json.MarshalIndent(traces, "", "  ")
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(`Current prompt:
%s

Failure traces from the golden-only evaluation:
%s

Instruction: Propose exactly ONE modification to the prompt to address the most common failure. Return the full new prompt.`, currentPrompt, string(traceJSON)), nil
}

func ParsePromptMutationJSON(raw string) (PromptMutation, error) {
	var mutation PromptMutation
	if err := json.Unmarshal([]byte(extractJSON(raw)), &mutation); err != nil {
		return PromptMutation{}, err
	}
	return mutation, nil
}

func BuildFailureTraces(evaluations []SessionEvaluation) []FailureTrace {
	traces := make([]FailureTrace, 0, len(evaluations))
	for _, evaluation := range evaluations {
		result := evaluation.Result
		trace := FailureTrace{
			SessionID:             evaluation.SessionID,
			TotalScore:            result.TotalScore,
			Rationale:             result.Rationale,
			RationalePerDimension: result.RationalePerDimension,
			Diff:                  result.Diff,
			ObjectiveScores:       result.ObjectiveScores,
		}
		for _, check := range result.HardChecks {
			if !check.Pass {
				trace.FailedHardChecks = append(trace.FailedHardChecks, check)
			}
		}
		trace.LowScoringRubricItems = lowScoringRubricItems(result)
		if trace.TotalScore < 1 || len(trace.FailedHardChecks) > 0 || len(trace.LowScoringRubricItems) > 0 {
			traces = append(traces, trace)
		}
	}
	sort.Slice(traces, func(i, j int) bool {
		if traces[i].TotalScore == traces[j].TotalScore {
			return traces[i].SessionID < traces[j].SessionID
		}
		return traces[i].TotalScore < traces[j].TotalScore
	})
	return traces
}

func lowScoringRubricItems(result JudgeResult) []LowScoringRubricItem {
	items := []LowScoringRubricItem{}
	add := func(name string, score DimensionScore) {
		if score.Fraction < 0.6 {
			items = append(items, LowScoringRubricItem{Name: name, Fraction: score.Fraction})
		}
	}
	add("faithfulness", result.DimensionScores.Faithfulness)
	add("coverage", result.DimensionScores.Coverage)
	add("transferability", result.DimensionScores.Transferability)
	add("actionability", result.DimensionScores.Actionability)
	if result.ObjectiveScores.ConfidenceCalibration < 0.6 {
		items = append(items, LowScoringRubricItem{Name: "confidence_calibration", Fraction: result.ObjectiveScores.ConfidenceCalibration})
	}
	return items
}

func SummarizeEvaluations(promptVersion string, evaluations []SessionEvaluation) EvaluationSummary {
	summary := EvaluationSummary{
		PromptVersion: promptVersion,
		SessionScores: make(map[string]float64, len(evaluations)),
	}
	if len(evaluations) == 0 {
		return summary
	}
	total := 0.0
	for _, evaluation := range evaluations {
		score := evaluation.Result.TotalScore
		summary.SessionScores[evaluation.SessionID] = score
		total += score
	}
	summary.MeanTotalScore = round2(total / float64(len(evaluations)))
	return summary
}

func DecidePromptAcceptance(current, candidate EvaluationSummary) TuningDecision {
	meanDelta := round2(candidate.MeanTotalScore - current.MeanTotalScore)
	worstDrop := 0.0
	for sessionID, currentScore := range current.SessionScores {
		candidateScore, ok := candidate.SessionScores[sessionID]
		if !ok {
			return TuningDecision{
				Accepted:  false,
				MeanDelta: meanDelta,
				WorstDrop: worstDrop,
				Reason:    fmt.Sprintf("candidate missing score for %s", sessionID),
			}
		}
		drop := round2(currentScore - candidateScore)
		if drop > worstDrop {
			worstDrop = drop
		}
	}
	if meanDelta < 0.05 {
		return TuningDecision{Accepted: false, MeanDelta: meanDelta, WorstDrop: worstDrop, Reason: "mean total_score did not improve by at least 0.05"}
	}
	if worstDrop > 0.1 {
		return TuningDecision{Accepted: false, MeanDelta: meanDelta, WorstDrop: worstDrop, Reason: "at least one golden total_score dropped by more than 0.10"}
	}
	return TuningDecision{Accepted: true, MeanDelta: meanDelta, WorstDrop: worstDrop, Reason: "accepted"}
}

var promptVersionRE = regexp.MustCompile(`^v([0-9]+)$`)

func NextPromptVersion(version string) (string, error) {
	number, width, err := parsePromptVersion(version)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("v%0*d", width, number+1), nil
}

func LatestPromptVersion(dir string) (string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}
	bestNumber := -1
	bestWidth := 3
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if filepath.Ext(name) != ".txt" {
			continue
		}
		version := strings.TrimSuffix(name, ".txt")
		number, width, err := parsePromptVersion(version)
		if err != nil {
			continue
		}
		if number > bestNumber {
			bestNumber = number
			bestWidth = width
		}
	}
	if bestNumber < 0 {
		return "", fmt.Errorf("no versioned prompts found in %s", dir)
	}
	return fmt.Sprintf("v%0*d", bestWidth, bestNumber), nil
}

func parsePromptVersion(version string) (number int, width int, err error) {
	matches := promptVersionRE.FindStringSubmatch(version)
	if matches == nil {
		return 0, 0, fmt.Errorf("invalid prompt version %q", version)
	}
	number, err = strconv.Atoi(matches[1])
	if err != nil {
		return 0, 0, err
	}
	return number, len(matches[1]), nil
}

func PromptLeaksGoldenIdentifiers(prompt string, sessions []Session) []string {
	lowerPrompt := strings.ToLower(prompt)
	leaks := []string{}
	seen := map[string]struct{}{}
	addLeak := func(value string) {
		value = strings.TrimSpace(value)
		if len(value) < 4 {
			return
		}
		lower := strings.ToLower(value)
		if strings.Contains(lowerPrompt, lower) {
			if _, ok := seen[value]; !ok {
				seen[value] = struct{}{}
				leaks = append(leaks, value)
			}
		}
	}
	for _, session := range sessions {
		addLeak(session.SessionID)
		addLeak(session.Title)
		for _, speaker := range session.Speakers {
			addLeak(speaker.Name)
		}
	}
	sort.Strings(leaks)
	return leaks
}
