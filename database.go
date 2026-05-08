package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var db *sql.DB

func initDB() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home dir: %w", err)
	}

	dataDir := filepath.Join(homeDir, ".ai-prompt-manager")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "prompts.db")
	db, err = sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	return createTables()
}

func createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS collections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			color TEXT DEFAULT '#6C63FF',
			icon TEXT DEFAULT '📁',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS prompts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			description TEXT DEFAULT '',
			collection_id INTEGER DEFAULT NULL,
			is_favorite INTEGER DEFAULT 0,
			is_pinned INTEGER DEFAULT 0,
			rating INTEGER DEFAULT 0,
			use_count INTEGER DEFAULT 0,
			last_used_at DATETIME DEFAULT NULL,
			model_hint TEXT DEFAULT '',
			notes TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
		)`,
		`CREATE TABLE IF NOT EXISTS tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			color TEXT DEFAULT '#6C63FF'
		)`,
		`CREATE TABLE IF NOT EXISTS prompt_tags (
			prompt_id INTEGER NOT NULL,
			tag_id INTEGER NOT NULL,
			PRIMARY KEY (prompt_id, tag_id),
			FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
			FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS prompt_versions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			prompt_id INTEGER NOT NULL,
			content TEXT NOT NULL,
			version_note TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS variables (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			prompt_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			default_value TEXT DEFAULT '',
			description TEXT DEFAULT '',
			FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS prompt_chains (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS chain_steps (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chain_id INTEGER NOT NULL,
			prompt_id INTEGER NOT NULL,
			step_order INTEGER NOT NULL,
			FOREIGN KEY (chain_id) REFERENCES prompt_chains(id) ON DELETE CASCADE,
			FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("failed to create table: %w\nQuery: %s", err, q)
		}
	}
	return nil
}
