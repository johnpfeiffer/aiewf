package model

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type DescriptionProposal struct {
	SessionID   string   `json:"session_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Evidence    []string `json:"evidence,omitempty"`
	Confidence  float64  `json:"confidence"`
}

type DescriptionBatch struct {
	Source       string                `json:"source"`
	Model        string                `json:"model"`
	TokensUsed   int                   `json:"tokens_used"`
	Descriptions []DescriptionProposal `json:"descriptions"`
}

type DescriptionDistiller struct {
	Client JSONClient
}

func (d DescriptionDistiller) DistillDescription(ctx context.Context, segment TranscriptSegment, promptTemplate, modelName string, temperature float32) (DescriptionProposal, int, error) {
	if d.Client == nil {
		return DescriptionProposal{}, 0, fmt.Errorf("description client is required")
	}
	if strings.TrimSpace(segment.Transcript) == "" {
		return DescriptionProposal{}, 0, fmt.Errorf("transcript is required for %s", segment.SessionID)
	}
	systemPrompt, err := RenderDescriptionPrompt(promptTemplate, segment)
	if err != nil {
		return DescriptionProposal{}, 0, err
	}
	text, tokens, err := d.Client.GenerateJSON(ctx, modelName, systemPrompt, "Generate the session description JSON now.", temperature)
	if err != nil {
		return DescriptionProposal{}, 0, err
	}
	proposal, err := ParseDescriptionProposalJSON(text)
	if err != nil {
		return DescriptionProposal{}, tokens, err
	}
	if proposal.SessionID == "" {
		proposal.SessionID = segment.SessionID
	}
	if proposal.Title == "" {
		proposal.Title = segment.Title
	}
	return proposal, tokens, nil
}

func RenderDescriptionPrompt(template string, segment TranscriptSegment) (string, error) {
	segmentJSON, err := json.MarshalIndent(segment, "", "  ")
	if err != nil {
		return "", err
	}
	replacements := map[string]string{
		"{segment_json}": string(segmentJSON),
		"{session_id}":   segment.SessionID,
		"{title}":        segment.Title,
		"{start}":        segment.Start,
		"{end}":          segment.End,
		"{transcript}":   segment.Transcript,
	}
	rendered := template
	for placeholder, value := range replacements {
		rendered = strings.ReplaceAll(rendered, placeholder, value)
	}
	return rendered, nil
}

func ParseDescriptionProposalJSON(raw string) (DescriptionProposal, error) {
	var proposal DescriptionProposal
	if err := json.Unmarshal([]byte(extractJSON(raw)), &proposal); err != nil {
		return DescriptionProposal{}, err
	}
	return proposal, nil
}

func DescriptionBatchToJSON(batch DescriptionBatch) (string, error) {
	data, err := json.MarshalIndent(batch, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func LoadDescriptionProposals(path string) (map[string]DescriptionProposal, error) {
	paths, err := transcriptPaths(path)
	if err != nil {
		return nil, err
	}

	proposals := make(map[string]DescriptionProposal)
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		var batch DescriptionBatch
		if err := json.Unmarshal(data, &batch); err != nil {
			return nil, err
		}
		for _, proposal := range batch.Descriptions {
			if strings.TrimSpace(proposal.SessionID) == "" || strings.TrimSpace(proposal.Description) == "" {
				continue
			}
			proposals[proposal.SessionID] = proposal
		}
	}
	return proposals, nil
}

func AttachDescriptionProposals(sessions []Session, proposals map[string]DescriptionProposal) []Session {
	if len(proposals) == 0 {
		return sessions
	}
	out := make([]Session, len(sessions))
	copy(out, sessions)
	for i := range out {
		if !ThinDescription(out[i]) {
			continue
		}
		proposal, ok := proposals[out[i].SessionID]
		if !ok {
			continue
		}
		description := strings.TrimSpace(proposal.Description)
		if description == "" {
			continue
		}
		out[i].Description = description
	}
	return out
}
