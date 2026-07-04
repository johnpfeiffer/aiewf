package model

import (
	"encoding/json"
	"fmt"
	"strings"
)

func ParseLessonJSON(raw string) (Lesson, error) {
	var lesson Lesson
	if err := json.Unmarshal([]byte(extractJSON(raw)), &lesson); err != nil {
		return Lesson{}, err
	}
	return lesson, nil
}

func ParseJudgeResultJSON(raw string) (JudgeResult, error) {
	var result JudgeResult
	if err := json.Unmarshal([]byte(extractJSON(raw)), &result); err != nil {
		return JudgeResult{}, err
	}
	return result, nil
}

func LessonToJSON(lesson Lesson) (string, error) {
	data, err := json.MarshalIndent(lesson, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func JudgeResultToJSON(result JudgeResult) (string, error) {
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func MustLessonJSON(lesson Lesson) string {
	data, err := json.MarshalIndent(lesson, "", "  ")
	if err != nil {
		panic(fmt.Sprintf("marshal lesson: %v", err))
	}
	return string(data)
}

func extractJSON(raw string) string {
	value := strings.TrimSpace(raw)
	if strings.HasPrefix(value, "```") {
		lines := strings.Split(value, "\n")
		if len(lines) >= 3 {
			lines = lines[1 : len(lines)-1]
			value = strings.TrimSpace(strings.Join(lines, "\n"))
		}
	}
	startObj := strings.Index(value, "{")
	endObj := strings.LastIndex(value, "}")
	if startObj >= 0 && endObj > startObj {
		return value[startObj : endObj+1]
	}
	return value
}
