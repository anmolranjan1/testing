package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// Download represents one row in our downloads table.
// This is what we store in the database and what we send back in /list.
type Download struct {
	ID        int    `json:"id"`
	URL       string `json:"url"`
	Filename  string `json:"filename"`
	FilePath  string `json:"filepath"`
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
}

// DB wraps the sql.DB so we can attach our own methods to it.
// This is the same pattern as Project 1 — a struct with receiver functions.
type DB struct {
	sql *sql.DB
}

// New opens a connection to the SQLite database file at the given path.
// If the file does not exist, SQLite creates it automatically.
// It also creates the downloads table if it does not exist yet.
func New(dbPath string) (*DB, error) {
	// sql.Open does not actually connect yet — it just prepares the connection
	// "sqlite3" is the driver name registered by mattn/go-sqlite3
	sqlDB, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("could not open database: %w", err)
	}

	// Ping actually tests the connection — confirms database is reachable
	err = sqlDB.Ping()
	if err != nil {
		return nil, fmt.Errorf("could not connect to database: %w", err)
	}

	db := &DB{sql: sqlDB}

	// Create the table if it does not already exist
	err = db.createTable()
	if err != nil {
		return nil, fmt.Errorf("could not create table: %w", err)
	}

	return db, nil
}

// createTable creates the downloads table if it does not already exist.
// "IF NOT EXISTS" means it is safe to call every time — no error if table is already there.
func (db *DB) createTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS downloads (
			id        INTEGER PRIMARY KEY AUTOINCREMENT,
			url       TEXT NOT NULL,
			filename  TEXT NOT NULL,
			filepath  TEXT NOT NULL,
			status    TEXT NOT NULL,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`
	// Exec runs a query that does not return rows (CREATE, INSERT, DELETE etc.)
	_, err := db.sql.Exec(query)
	return err
}

// InsertDownload saves one download record into the database.
// Called after every download attempt — success or failure.
func (db *DB) InsertDownload(url, filename, filePath, status string) error {
	query := `
		INSERT INTO downloads (url, filename, filepath, status, timestamp)
		VALUES (?, ?, ?, ?, ?)
	`
	// The ? marks are placeholders — sql fills them in safely.
	// This prevents SQL injection attacks.
	// time.Now().Format gives us a readable timestamp string.
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	_, err := db.sql.Exec(query, url, filename, filePath, status, timestamp)
	if err != nil {
		return fmt.Errorf("could not insert download record: %w", err)
	}
	return nil
}

// ListDownloads returns all rows from the downloads table.
// Called when user hits GET /list.
func (db *DB) ListDownloads() ([]Download, error) {
	query := `SELECT id, url, filename, filepath, status, timestamp FROM downloads ORDER BY id DESC`

	// db.sql.Query runs a SELECT and returns multiple rows
	rows, err := db.sql.Query(query)
	if err != nil {
		return nil, fmt.Errorf("could not query downloads: %w", err)
	}
	defer rows.Close() // always close rows when done — same as closing a file

	// Build our results slice
	downloads := make([]Download, 0)

	// rows.Next() moves to the next row — returns false when no more rows
	for rows.Next() {
		var d Download
		// rows.Scan reads the current row's columns into our struct fields
		// order must match the SELECT order exactly
		err := rows.Scan(&d.ID, &d.URL, &d.Filename, &d.FilePath, &d.Status, &d.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("could not read row: %w", err)
		}
		downloads = append(downloads, d)
	}

	// Check if the loop ended because of an error
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading rows: %w", err)
	}

	return downloads, nil
}

// Close closes the database connection.
// Should be called when the program is shutting down.
func (db *DB) Close() error {
	return db.sql.Close()
}
