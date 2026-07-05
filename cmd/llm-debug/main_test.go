package main

import (
	"strings"
	"testing"
)

func TestParseArgsRequiresSessionID(t *testing.T) {
	_, err := parseArgs(nil)
	if err == nil {
		t.Fatal("parseArgs returned nil error without --session-id")
	}
	if !strings.Contains(err.Error(), "--session-id is required") {
		t.Fatalf("error = %q, want required session id", err)
	}
}

func TestParseArgsRejectsPositionalArguments(t *testing.T) {
	_, err := parseArgs([]string{"--session-id", "s1", "extra"})
	if err == nil {
		t.Fatal("parseArgs returned nil error with positional argument")
	}
	if !strings.Contains(err.Error(), "only --session-id is supported") {
		t.Fatalf("error = %q, want unsupported positional argument", err)
	}
}

func TestParseArgsAcceptsOnlySessionID(t *testing.T) {
	sessionID, err := parseArgs([]string{"--session-id", "s1"})
	if err != nil {
		t.Fatal(err)
	}
	if sessionID != "s1" {
		t.Fatalf("sessionID = %q, want s1", sessionID)
	}
}
