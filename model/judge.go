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
			RubricScores:    RubricScores{},
			ObjectiveScores: objectiveScores,
			TotalScore:      0,
			Rationale:       "Hard checks failed; rubric score zeroed.",
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
	result.RubricScores = clampRubric(result.RubricScores)
	result.ObjectiveScores = objectiveScores
	result.TotalScore = combinedJudgeScore(result.RubricScores, objectiveScores)
	result.HardChecks = hardChecks
	return result, tokens, nil
}

func clampRubric(scores RubricScores) RubricScores {
	return RubricScores{
		Faithfulness:    clampScore(scores.Faithfulness),
		Transferability: clampScore(scores.Transferability),
		Actionability:   clampScore(scores.Actionability),
	}
}

func clampScore(score int) int {
	if score < 1 {
		return 1
	}
	if score > 5 {
		return 5
	}
	return score
}

func ComputeObjectiveScores(session Session, lesson Lesson, golden Lesson) ObjectiveScores {
	tagF1 := tagF1(lesson.PersonaTags, golden.PersonaTags)
	statusMatch := lesson.Status == golden.Status
	evidenceVerbatim := evidenceVerbatim(session, lesson)
	return ObjectiveScores{
		TagF1:                 round2(tagF1),
		StatusMatch:           statusMatch,
		EvidenceVerbatim:      round2(evidenceVerbatim),
		TagScore:              round2(scaleUnitScore(tagF1)),
		StatusScore:           boolScore(statusMatch),
		EvidenceVerbatimScore: round2(scaleUnitScore(evidenceVerbatim)),
	}
}

func combinedJudgeScore(scores RubricScores, objectiveScores ObjectiveScores) float64 {
	total := float64(scores.Faithfulness+scores.Transferability+scores.Actionability) +
		objectiveScores.TagScore +
		objectiveScores.StatusScore +
		objectiveScores.EvidenceVerbatimScore
	return round2(total / 6)
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

func evidenceVerbatim(session Session, lesson Lesson) float64 {
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

func scaleUnitScore(value float64) float64 {
	if value < 0 {
		value = 0
	}
	if value > 1 {
		value = 1
	}
	return 1 + 4*value
}

func boolScore(value bool) float64 {
	if value {
		return 5
	}
	return 1
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
