package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSelectedSessionsSkipsWorkshopsByDefault(t *testing.T) {
	dir := t.TempDir()
	sessionsPath := filepath.Join(dir, "sessions.json")
	writeFile(t, sessionsPath, `{
  "sessions": [
    {
      "session_id": "workshop",
      "title": "Workshop",
      "description": "This workshop has a description long enough to be valid source data.",
      "day": "Day 1 — Workshop Day",
      "time": "9:00am-10:00am",
      "room": "Track 1",
      "type": "workshop",
      "speakers": ["Ada"]
    },
    {
      "session_id": "session",
      "title": "Session",
      "description": "This session has a description long enough to be valid source data.",
      "day": "Day 2 — Session Day 1",
      "time": "9:00am-9:20am",
      "room": "Main Stage",
      "type": "session",
      "speakers": ["Grace"]
    }
  ]
}`)

	cfg := commonConfig{
		sessions:      sessionsPath,
		descriptions:  "",
		noTranscripts: true,
	}
	sessions, err := selectedSessions(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 1 {
		t.Fatalf("len(sessions) = %d, want 1", len(sessions))
	}
	if sessions[0].SessionID != "session" {
		t.Fatalf("SessionID = %q, want session", sessions[0].SessionID)
	}

	cfg.includeWorkshops = true
	sessions, err = selectedSessions(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 2 {
		t.Fatalf("len(sessions) with includeWorkshops = %d, want 2", len(sessions))
	}
}

func TestGenerateDefaultsTranscriptLookupOn(t *testing.T) {
	cfg, err := parseGenerate(nil)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.modelName != "gemma-4-31b" {
		t.Fatalf("modelName = %q, want gemma-4-31b", cfg.modelName)
	}
	if cfg.transcripts != defaultTranscripts {
		t.Fatalf("transcripts = %q, want default %q", cfg.transcripts, defaultTranscripts)
	}
	if cfg.noTranscripts {
		t.Fatal("noTranscripts = true, want false")
	}
}

func TestJudgeDefaultsToGeminiFlash(t *testing.T) {
	cfg, err := parseJudge(nil)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.judgeModel != "gemini-3.5-flash" {
		t.Fatalf("judgeModel = %q, want gemini-3.5-flash", cfg.judgeModel)
	}
	if cfg.judgePrompt != "prompts/judge-v002.txt" {
		t.Fatalf("judgePrompt = %q, want prompts/judge-v002.txt", cfg.judgePrompt)
	}
}

func TestGoldenPathUsesSessionJSONFilename(t *testing.T) {
	got := goldenPath("goldens", "s1")
	want := filepath.Join("goldens", "s1.json")
	if got != want {
		t.Fatalf("goldenPath = %q, want %q", got, want)
	}
}

func TestTranscriptSourceDefaultsUnlessDisabled(t *testing.T) {
	if got := transcriptSource(commonConfig{}); got != defaultTranscripts {
		t.Fatalf("transcriptSource(empty config) = %q, want %q", got, defaultTranscripts)
	}
	if got := transcriptSource(commonConfig{transcripts: "custom.json"}); got != "custom.json" {
		t.Fatalf("transcriptSource(custom config) = %q, want custom.json", got)
	}
	if got := transcriptSource(commonConfig{noTranscripts: true}); got != "" {
		t.Fatalf("transcriptSource(disabled config) = %q, want empty", got)
	}
}

func TestSelectedSessionsAttachesTranscriptBySessionID(t *testing.T) {
	dir := t.TempDir()
	sessionsPath := filepath.Join(dir, "sessions.json")
	transcriptsPath := filepath.Join(dir, "keynote_segments_day2.json")
	writeFile(t, sessionsPath, `{
  "sessions": [
    {
      "session_id": "s1",
      "title": "Session",
      "description": "short",
      "day": "Day 2 — Session Day 1",
      "time": "9:00am-9:20am",
      "room": "Main Stage",
      "type": "keynote",
      "speakers": ["Grace"]
    }
  ]
}`)
	writeFile(t, transcriptsPath, `{
  "source": "test",
  "segments": [
    {
      "session_id": "s1",
      "title": "Session",
      "speaker_names": ["Grace"],
      "start": "00:00:01",
      "end": "00:20:00",
      "transcript": "This transcript is long enough to support grounded lesson generation from a short schedule description.",
      "extracted_summary": "",
      "confidence": 0.95
    }
  ]
}`)

	sessions, err := selectedSessions(commonConfig{
		sessions:     sessionsPath,
		transcripts:  transcriptsPath,
		descriptions: "",
		sessionID:    "s1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 1 {
		t.Fatalf("len(sessions) = %d, want 1", len(sessions))
	}
	if sessions[0].Transcript == nil {
		t.Fatal("Transcript was not attached")
	}
	if sessions[0].Transcript.Start != "00:00:01" {
		t.Fatalf("Transcript.Start = %q, want 00:00:01", sessions[0].Transcript.Start)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
