package storage

import "testing"

func TestInsertAndReadLatestGeneration(t *testing.T) {
	db, err := Open(t.TempDir() + "/lessons.db")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	if err := db.InsertGeneration("s1", "v001", "model-a", `{"session_id":"s1"}`, 12); err != nil {
		t.Fatal(err)
	}
	generation, err := db.LatestGeneration("s1", "v001")
	if err != nil {
		t.Fatal(err)
	}
	if generation.SessionID != "s1" {
		t.Fatalf("SessionID = %q, want s1", generation.SessionID)
	}
	if generation.TokensUsed != 12 {
		t.Fatalf("TokensUsed = %d, want 12", generation.TokensUsed)
	}
	if generation.CreatedAt == "" {
		t.Fatal("CreatedAt is empty")
	}
}
