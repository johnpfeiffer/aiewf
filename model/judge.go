package model

import (
	"context"
	"fmt"
	"math"
	"strings"
)

type Judge struct {
	Client JSONClient
}

func (j Judge) Judge(ctx context.Context, session Session, lesson Lesson, golden Lesson, judgePrompt, modelName string) (JudgeResult, int, error) {
	hardChecks := ValidateLesson(lesson, session)
	objectiveScores := ComputeObjectiveScores(session, lesson, golden)
	if !HardChecksPass(hardChecks) {
		return JudgeResult{
			ObjectiveScores: objectiveScores,
			TotalScore:      0,
			Rationale:       "Hard checks failed; score zeroed.",
			HardChecks:      hardChecks,
		}, 0, nil
	}
	if j.Client == nil {
		return JudgeResult{}, 0, fmt.Errorf("judge client is required when hard checks pass")
	}
	systemPrompt, err := RenderJudgePrompt(judgePrompt, session, lesson, golden)
	if err != nil {
		return JudgeResult{}, 0, err
	}
	text, tokens, err := j.Client.GenerateJSON(ctx, modelName, systemPrompt, "Score the generated lesson JSON now.", 0)
	if err != nil {
		return JudgeResult{}, tokens, err
	}
	result, err := ParseJudgeResultJSON(text)
	if err != nil {
		return JudgeResult{}, tokens, err
	}
	result.DimensionScores = normalizeDimensionScores(result.DimensionScores)
	objectiveScores = applyConfidenceCalibration(result.DimensionScores, objectiveScores, lesson, golden)
	result.ObjectiveScores = objectiveScores
	result.TotalScore = combinedJudgeScore(result.DimensionScores, objectiveScores, lesson, golden)
	result.HardChecks = hardChecks
	return result, tokens, nil
}

func ComputeObjectiveScores(session Session, lesson Lesson, golden Lesson) ObjectiveScores {
	tagF1 := tagF1(lesson.PersonaTags, golden.PersonaTags)
	statusMatch := lesson.Status == golden.Status
	evidenceSourceMatch := evidenceSourceMatch(session, lesson)
	return ObjectiveScores{
		TagF1:               round2(tagF1),
		StatusMatch:         statusMatch,
		EvidenceSourceMatch: round2(evidenceSourceMatch),
		ConfidenceDelta:     round2(lesson.Confidence - golden.Confidence),
	}
}

func combinedJudgeScore(scores DimensionScores, objectiveScores ObjectiveScores, lesson Lesson, golden Lesson) float64 {
	if lesson.Status == StatusInsufficientData && golden.Status != StatusInsufficientData {
		return 0
	}
	if lesson.Status == StatusInsufficientData && golden.Status == StatusInsufficientData {
		return objectiveScores.ConfidenceCalibration
	}
	total := scores.Faithfulness.Fraction +
		scores.Coverage.Fraction +
		scores.Transferability.Fraction +
		scores.Actionability.Fraction +
		objectiveScores.ConfidenceCalibration
	return round2(total / 5)
}

func applyConfidenceCalibration(scores DimensionScores, objectiveScores ObjectiveScores, lesson Lesson, golden Lesson) ObjectiveScores {
	objectiveScores.ConfidenceCalibration = confidenceCalibration(scores, lesson, golden)
	return objectiveScores
}

func confidenceCalibration(scores DimensionScores, lesson Lesson, golden Lesson) float64 {
	qualityCeiling := dimensionMean(scores, lesson, golden)
	expectedCeiling := math.Min(golden.Confidence, qualityCeiling)
	overconfidence := lesson.Confidence - expectedCeiling
	if overconfidence <= 0 {
		return 1
	}
	return round2(clampFloat(1-2*overconfidence, 0, 1))
}

func dimensionMean(scores DimensionScores, lesson Lesson, golden Lesson) float64 {
	if lesson.Status == StatusInsufficientData && golden.Status == StatusInsufficientData {
		return 1
	}
	if lesson.Status == StatusInsufficientData && golden.Status != StatusInsufficientData {
		return 0
	}
	total := scores.Faithfulness.Fraction +
		scores.Coverage.Fraction +
		scores.Transferability.Fraction +
		scores.Actionability.Fraction
	return total / 4
}

func normalizeDimensionScores(scores DimensionScores) DimensionScores {
	return DimensionScores{
		Faithfulness:    normalizeDimensionScore(scores.Faithfulness),
		Coverage:        normalizeDimensionScore(scores.Coverage),
		Transferability: normalizeDimensionScore(scores.Transferability),
		Actionability:   normalizeDimensionScore(scores.Actionability),
	}
}

func normalizeDimensionScore(score DimensionScore) DimensionScore {
	if score.Total < 0 {
		score.Total = 0
	}
	if score.Passed < 0 {
		score.Passed = 0
	}
	if score.Passed > score.Total {
		score.Passed = score.Total
	}
	if score.Total == 0 {
		score.Fraction = 0
		return score
	}
	score.Fraction = round2(float64(score.Passed) / float64(score.Total))
	return score
}

func tagF1(generated []string, golden []string) float64 {
	generatedSet := stringSet(generated)
	goldenSet := stringSet(golden)
	if len(generatedSet) == 0 && len(goldenSet) == 0 {
		return 1
	}
	if len(generatedSet) == 0 || len(goldenSet) == 0 {
		return 0
	}
	intersection := 0
	for tag := range generatedSet {
		if _, ok := goldenSet[tag]; ok {
			intersection++
		}
	}
	if intersection == 0 {
		return 0
	}
	precision := float64(intersection) / float64(len(generatedSet))
	recall := float64(intersection) / float64(len(goldenSet))
	return (2 * precision * recall) / (precision + recall)
}

func stringSet(values []string) map[string]struct{} {
	out := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out[value] = struct{}{}
	}
	return out
}

func evidenceSourceMatch(session Session, lesson Lesson) float64 {
	if len(lesson.Evidence) == 0 {
		if lesson.Status == StatusInsufficientData {
			return 1
		}
		return 0
	}
	passing := 0
	for _, evidence := range lesson.Evidence {
		if EvidenceAppearsInSourceMaterial(session, evidence) {
			passing++
		}
	}
	return float64(passing) / float64(len(lesson.Evidence))
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}

func clampFloat(value, minValue, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}
