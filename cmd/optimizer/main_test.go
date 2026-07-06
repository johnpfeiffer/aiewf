package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseDefaultsOptimizerModelToGeminiFlash(t *testing.T) {
	t.Setenv("OPTIMIZER_MODEL", "")
	cfg, err := parse(nil)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.optimizerModel != "gemini-3.5-flash" {
		t.Fatalf("optimizerModel = %q, want gemini-3.5-flash", cfg.optimizerModel)
	}
	if cfg.maxIterations != 10 {
		t.Fatalf("maxIterations = %d, want 10", cfg.maxIterations)
	}
	if cfg.requiredGoldenCount != 4 {
		t.Fatalf("requiredGoldenCount = %d, want 4", cfg.requiredGoldenCount)
	}
}

func TestGoldenSessionIDsSortedFromJSONFiles(t *testing.T) {
	dir := t.TempDir()
	writeTestFile(t, filepath.Join(dir, "b.json"), "{}")
	writeTestFile(t, filepath.Join(dir, "a.json"), "{}")
	writeTestFile(t, filepath.Join(dir, "notes.txt"), "ignore")

	ids, err := goldenSessionIDs(dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 2 || ids[0] != "a" || ids[1] != "b" {
		t.Fatalf("ids = %#v, want [a b]", ids)
	}
}

func TestWriteCandidatePromptRefusesOverwriteByDefault(t *testing.T) {
	dir := t.TempDir()
	cfg := config{promptsDir: dir}
	path := filepath.Join(dir, "v002.txt")
	writeTestFile(t, path, "old")

	if err := writeCandidatePrompt(cfg, "v002", "new"); err == nil {
		t.Fatal("writeCandidatePrompt succeeded, want existing-file error")
	}

	cfg.overwritePrompts = true
	if err := writeCandidatePrompt(cfg, "v002", "new"); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "new\n" {
		t.Fatalf("prompt contents = %q, want new newline", string(data))
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
