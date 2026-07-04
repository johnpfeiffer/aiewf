package storage

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"

	"aiewf-lessons/model"

	_ "modernc.org/sqlite"
)

type DB struct {
	db *sql.DB
}

func Open(path string) (*DB, error) {
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	store := &DB{db: db}
	if err := store.init(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (d *DB) Close() error {
	return d.db.Close()
}

func (d *DB) init() error {
	_, err := d.db.Exec(`
CREATE TABLE IF NOT EXISTS generations (
  session_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,
  output_json TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scores (
  session_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  judge_model TEXT NOT NULL,
  rubric_scores_json TEXT NOT NULL,
  total_score REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generations_session_prompt_created
  ON generations(session_id, prompt_version, created_at);

CREATE INDEX IF NOT EXISTS idx_scores_session_prompt_created
  ON scores(session_id, prompt_version, created_at);
`)
	return err
}

func (d *DB) InsertGeneration(sessionID, promptVersion, modelName, outputJSON string, tokensUsed int) error {
	_, err := d.db.Exec(
		`INSERT INTO generations(session_id, prompt_version, model, output_json, tokens_used) VALUES (?, ?, ?, ?, ?)`,
		sessionID, promptVersion, modelName, outputJSON, tokensUsed,
	)
	return err
}

func (d *DB) LatestGeneration(sessionID, promptVersion string) (model.StoredGeneration, error) {
	row := d.db.QueryRow(
		`SELECT session_id, prompt_version, model, output_json, tokens_used, created_at
		 FROM generations
		 WHERE session_id = ? AND prompt_version = ?
		 ORDER BY created_at DESC, rowid DESC
		 LIMIT 1`,
		sessionID, promptVersion,
	)
	var generation model.StoredGeneration
	err := row.Scan(&generation.SessionID, &generation.PromptVersion, &generation.Model, &generation.OutputJSON, &generation.TokensUsed, &generation.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return model.StoredGeneration{}, err
	}
	return generation, err
}

func (d *DB) InsertScore(sessionID, promptVersion, judgeModel, rubricScoresJSON string, totalScore float64) error {
	_, err := d.db.Exec(
		`INSERT INTO scores(session_id, prompt_version, judge_model, rubric_scores_json, total_score) VALUES (?, ?, ?, ?, ?)`,
		sessionID, promptVersion, judgeModel, rubricScoresJSON, totalScore,
	)
	return err
}
