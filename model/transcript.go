package model

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/johnpfeiffer/textmatch"
)

func LoadTranscriptSegments(path string) (map[string]TranscriptSegment, error) {
	paths, err := transcriptPaths(path)
	if err != nil {
		return nil, err
	}

	segments := make(map[string]TranscriptSegment)
	for _, path := range paths {
		file, err := LoadTranscriptFile(path)
		if err != nil {
			return nil, err
		}
		for _, segment := range file.Segments {
			if strings.TrimSpace(segment.SessionID) == "" {
				continue
			}
			segments[segment.SessionID] = segment
		}
	}
	return segments, nil
}

func LoadTranscriptSegmentList(path string) ([]TranscriptSegment, error) {
	paths, err := transcriptPaths(path)
	if err != nil {
		return nil, err
	}

	var segments []TranscriptSegment
	for _, path := range paths {
		file, err := LoadTranscriptFile(path)
		if err != nil {
			return nil, err
		}
		segments = append(segments, file.Segments...)
	}
	return segments, nil
}

func LoadTranscriptFile(path string) (TranscriptFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return TranscriptFile{}, err
	}
	var file TranscriptFile
	if err := json.Unmarshal(data, &file); err != nil {
		return TranscriptFile{}, err
	}
	return file, nil
}

func transcriptPaths(path string) ([]string, error) {
	var paths []string
	for _, part := range strings.Split(path, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if strings.ContainsAny(part, "*?[") {
			matches, err := filepath.Glob(part)
			if err != nil {
				return nil, err
			}
			paths = append(paths, matches...)
			continue
		}
		paths = append(paths, part)
	}
	return paths, nil
}

func AttachTranscriptSegments(sessions []Session, segments map[string]TranscriptSegment) []Session {
	if len(segments) == 0 {
		return sessions
	}
	out := make([]Session, len(sessions))
	copy(out, sessions)
	for i := range out {
		segment, ok := segments[out[i].SessionID]
		if !ok {
			continue
		}
		out[i].Transcript = &segment
	}
	return out
}

func ThinSourceMaterial(session Session) bool {
	return len(strings.TrimSpace(session.Description)) < 50 &&
		len(strings.TrimSpace(transcriptText(session))) < 50 &&
		len(strings.TrimSpace(speakerBioText(session))) < 50
}

func EvidenceAppearsInSourceMaterial(session Session, evidence string) bool {
	evidence = strings.TrimSpace(evidence)
	if evidence == "" {
		return false
	}
	return textmatch.ContainsNormalized(session.Description, evidence) > 0 ||
		textmatch.ContainsNormalized(transcriptText(session), evidence) > 0 ||
		textmatch.ContainsNormalized(speakerBioText(session), evidence) > 0
}

func transcriptText(session Session) string {
	if session.Transcript == nil {
		return ""
	}
	return session.Transcript.Transcript
}

func speakerBioText(session Session) string {
	var bios []string
	for _, speaker := range session.Speakers {
		if strings.TrimSpace(speaker.Bio) == "" {
			continue
		}
		bios = append(bios, speaker.Bio)
	}
	return strings.Join(bios, "\n")
}
