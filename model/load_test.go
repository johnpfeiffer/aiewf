package model

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadSessionsAdaptsCurrentScheduleShape(t *testing.T) {
	dir := t.TempDir()
	sessionsPath := filepath.Join(dir, "sessions.json")
	speakersPath := filepath.Join(dir, "speakers.json")

	writeFile(t, sessionsPath, `{
  "sessions": [{
    "title": "Useful Talk",
    "description": "This description is long enough to support a grounded lesson about evaluation loops and production feedback.",
    "day": "Day 2",
    "time": "9:00am-9:20am",
    "room": "Track 1",
    "type": "session",
    "track": "Agents",
    "speakers": ["Ada Lovelace"]
  }]
}`)
	writeFile(t, speakersPath, `{
  "speakers": [{
    "name": "Ada Lovelace",
    "role": "Engineer",
    "company": "Analytical Engines"
  }]
}`)

	sessions, err := LoadSessions(sessionsPath, speakersPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(sessions) != 1 {
		t.Fatalf("len(sessions) = %d, want 1", len(sessions))
	}
	session := sessions[0]
	if session.SessionID == "" {
		t.Fatal("SessionID is empty")
	}
	if session.DurationMinutes != 20 {
		t.Fatalf("DurationMinutes = %d, want 20", session.DurationMinutes)
	}
	if got := session.Speakers[0].Title; got != "Engineer" {
		t.Fatalf("speaker title = %q, want Engineer", got)
	}
	if got := session.Speakers[0].Company; got != "Analytical Engines" {
		t.Fatalf("speaker company = %q, want Analytical Engines", got)
	}
}

func TestStableSessionIDIsDeterministic(t *testing.T) {
	raw := RawSession{Title: "A Talk", Day: "Day 1", Time: "1:00pm-1:20pm", Room: "Track 1"}
	first := stableSessionID(raw)
	second := stableSessionID(raw)
	if first != second {
		t.Fatalf("stableSessionID changed: %q != %q", first, second)
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
