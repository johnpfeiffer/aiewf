package model

import (
	"path/filepath"
	"testing"
)

func TestLoadAndAttachTranscriptSegments(t *testing.T) {
	path := filepath.Join(t.TempDir(), "segments.json")
	writeFile(t, path, `{
  "source": "app/src/data/keynotes-day2.txt",
  "segments": [{
    "session_id": "s1",
    "title": "Keynote",
    "speaker_names": ["Speaker"],
    "start": "00:00:01",
    "end": "00:10:00",
    "transcript": "A transcript segment with enough detail to ground a lesson.",
    "extracted_summary": "",
    "confidence": 0.8
  }]
}`)

	segments, err := LoadTranscriptSegments(path)
	if err != nil {
		t.Fatal(err)
	}
	sessions := AttachTranscriptSegments([]Session{{SessionID: "s1"}}, segments)
	if sessions[0].Transcript == nil {
		t.Fatal("Transcript was not attached")
	}
	if sessions[0].Transcript.Start != "00:00:01" {
		t.Fatalf("Start = %q, want 00:00:01", sessions[0].Transcript.Start)
	}
}

func TestLoadTranscriptSegmentsFromMultipleFiles(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "keynote_segments_day2.json"), `{
  "source": "app/src/data/keynotes-day2.txt",
  "segments": [{"session_id": "s1", "start": "00:00:01", "transcript": "day two transcript"}]
}`)
	writeFile(t, filepath.Join(dir, "keynote_segments_day3.json"), `{
  "source": "app/src/data/keynotes-day3.txt",
  "segments": [{"session_id": "s2", "start": "00:00:02", "transcript": "day three transcript"}]
}`)

	segments, err := LoadTranscriptSegments(filepath.Join(dir, "keynote_segments_day*.json"))
	if err != nil {
		t.Fatal(err)
	}
	if len(segments) != 2 {
		t.Fatalf("len(segments) = %d, want 2", len(segments))
	}
	if segments["s2"].Start != "00:00:02" {
		t.Fatalf("s2 start = %q, want 00:00:02", segments["s2"].Start)
	}

	segments, err = LoadTranscriptSegments(
		filepath.Join(dir, "keynote_segments_day2.json") + "," + filepath.Join(dir, "keynote_segments_day3.json"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(segments) != 2 {
		t.Fatalf("len(segments) from comma paths = %d, want 2", len(segments))
	}

	list, err := LoadTranscriptSegmentList(
		filepath.Join(dir, "keynote_segments_day2.json") + "," + filepath.Join(dir, "keynote_segments_day3.json"),
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("len(list) = %d, want 2", len(list))
	}
	if list[0].SessionID != "s1" || list[1].SessionID != "s2" {
		t.Fatalf("list order = %q, %q; want s1, s2", list[0].SessionID, list[1].SessionID)
	}
}

func TestEvidenceCanComeFromTranscriptSegment(t *testing.T) {
	session := Session{
		SessionID:   "s1",
		Description: "TBD",
		Transcript: &TranscriptSegment{
			Transcript: "Production agents need replayable traces so teams can debug failures after deployment.",
		},
	}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "The talk covered replayability for production agents.",
		KeyLesson:   "Replayable traces make production agent failures easier to debug.",
		Evidence:    []string{"replayable traces so teams can debug failures"},
		PersonaTags: []string{"engineer"},
		ActionItems: []string{"Capture replayable traces for one production agent workflow."},
		Confidence:  0.8,
		Status:      StatusComplete,
	}
	if checks := ValidateLesson(lesson, session); !HardChecksPass(checks) {
		t.Fatalf("hard checks failed: %#v", checks)
	}
}

func TestEvidenceCanComeFromSpeakerBio(t *testing.T) {
	session := Session{
		SessionID:   "s1",
		Description: "TBD",
		Speakers: []Speaker{{
			Name: "swyx",
			Bio:  "swyx created the AI Engineer conference as an organic extension of technical community building and writing about how people organize around technology.",
		}},
	}
	lesson := Lesson{
		SessionID:   "s1",
		Summary:     "The lesson connects community building with technical influence.",
		KeyLesson:   "Technical influence compounds when people organize around shared practices.",
		Evidence:    []string{"how people organize around technology"},
		PersonaTags: []string{"dev-rel"},
		ActionItems: []string{"Write down one repeatable community practice around a technical workflow."},
		Confidence:  0.7,
		Status:      StatusComplete,
	}
	if checks := ValidateLesson(lesson, session); !HardChecksPass(checks) {
		t.Fatalf("hard checks failed: %#v", checks)
	}
}

func TestThinSourceMaterialUsesTranscript(t *testing.T) {
	session := Session{
		Description: "TBD",
		Transcript:  &TranscriptSegment{Transcript: "This transcript segment is long enough to support grounded generation from approved source material."},
	}
	if ThinSourceMaterial(session) {
		t.Fatal("ThinSourceMaterial returned true with rich transcript text")
	}
}

func TestThinSourceMaterialUsesSpeakerBio(t *testing.T) {
	session := Session{
		Description: "TBD",
		Speakers: []Speaker{{
			Bio: "This speaker bio is long enough to provide approved context about technical community building and organization around engineering practice.",
		}},
	}
	if ThinSourceMaterial(session) {
		t.Fatal("ThinSourceMaterial returned true with rich speaker bio")
	}
}
