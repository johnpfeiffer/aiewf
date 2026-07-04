package model

import (
	"context"
	"fmt"
	"math"
)

type Judge struct {
	Client JSONClient
}

func (j Judge) Judge(ctx context.Context, session Session, lesson Lesson, golden Lesson, judgePrompt, modelName string) (JudgeResult, int, error) {
	hardChecks := ValidateLesson(lesson, session)
	if !HardChecksPass(hardChecks) {
		return JudgeResult{
			RubricScores: RubricScores{},
			TotalScore:   0,
			Rationale:    "Hard checks failed; rubric score zeroed.",
			HardChecks:   hardChecks,
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
	result.TotalScore = meanRubric(result.RubricScores)
	result.HardChecks = hardChecks
	return result, tokens, nil
}

func clampRubric(scores RubricScores) RubricScores {
	return RubricScores{
		Faithfulness:       clampScore(scores.Faithfulness),
		Transferability:    clampScore(scores.Transferability),
		Actionability:      clampScore(scores.Actionability),
		TagAccuracy:        clampScore(scores.TagAccuracy),
		AppropriateCaution: clampScore(scores.AppropriateCaution),
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

func meanRubric(scores RubricScores) float64 {
	total := scores.Faithfulness + scores.Transferability + scores.Actionability + scores.TagAccuracy + scores.AppropriateCaution
	return math.Round((float64(total)/5)*100) / 100
}
