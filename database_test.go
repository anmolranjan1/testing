package database

import (
	"testing"
)

// helper function that creates a fresh in-memory SQLite database for each test.
// ":memory:" is a special SQLite keyword — it creates a temporary database
// that lives only in RAM. It is destroyed when the test finishes.
// This means tests never touch a real file on disk.
func newTestDB(t *testing.T) *DB {
	db, err := New(":memory:")
	if err != nil {
		t.Fatalf("could not create test database: %s", err.Error())
	}
	return db
}

// TestNew checks that a new database is created successfully
// and the downloads table exists
func TestNew_CreatesDatabase(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	// If New() worked without error, the DB is ready.
	// We verify by trying to insert — if table does not exist this would fail.
	err := db.InsertDownload("https://example.com/file.pdf", "file.pdf", "/downloads/file.pdf", "success")
	if err != nil {
		t.Errorf("expected no error after creating DB but got: %s", err.Error())
	}
}

// TestInsertDownload_Success checks that a record is inserted correctly
func TestInsertDownload_Success(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	err := db.InsertDownload(
		"https://example.com/file.pdf",
		"file.pdf",
		"/Users/name/Downloads/file.pdf",
		"success",
	)

	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}
}

// TestInsertDownload_Failed checks that a failed download record is also saved
func TestInsertDownload_Failed(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	// Even failed downloads should be saved to the DB
	err := db.InsertDownload(
		"https://bad-url.com/file.pdf",
		"file.pdf",
		"",
		"failed",
	)

	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}
}

// TestListDownloads_Empty checks that an empty database returns an empty slice
func TestListDownloads_Empty(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	downloads, err := db.ListDownloads()
	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}

	// Should return empty slice, not nil
	if len(downloads) != 0 {
		t.Errorf("expected 0 downloads but got %d", len(downloads))
	}
}

// TestListDownloads_ReturnsAllRecords checks that all inserted records come back
func TestListDownloads_ReturnsAllRecords(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	// Insert three records
	db.InsertDownload("https://example.com/file1.pdf", "file1.pdf", "/downloads/file1.pdf", "success")
	db.InsertDownload("https://example.com/file2.png", "file2.png", "/downloads/file2.png", "success")
	db.InsertDownload("https://bad.com/file3.zip", "file3.zip", "", "failed")

	downloads, err := db.ListDownloads()
	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}

	// Should have exactly 3 records
	if len(downloads) != 3 {
		t.Errorf("expected 3 downloads but got %d", len(downloads))
	}
}

// TestListDownloads_CorrectData checks that the data returned matches what was inserted
func TestListDownloads_CorrectData(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	// Insert one record with known values
	db.InsertDownload(
		"https://example.com/report.pdf",
		"report.pdf",
		"/Users/name/Downloads/report.pdf",
		"success",
	)

	downloads, err := db.ListDownloads()
	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}

	if len(downloads) == 0 {
		t.Fatal("expected at least one download but got none")
	}

	// ListDownloads returns newest first (ORDER BY id DESC)
	// so the first item is the one we just inserted
	d := downloads[0]

	if d.URL != "https://example.com/report.pdf" {
		t.Errorf("expected URL 'https://example.com/report.pdf' but got '%s'", d.URL)
	}

	if d.Filename != "report.pdf" {
		t.Errorf("expected filename 'report.pdf' but got '%s'", d.Filename)
	}

	if d.FilePath != "/Users/name/Downloads/report.pdf" {
		t.Errorf("expected filepath '/Users/name/Downloads/report.pdf' but got '%s'", d.FilePath)
	}

	if d.Status != "success" {
		t.Errorf("expected status 'success' but got '%s'", d.Status)
	}

	// Timestamp should not be empty — it is set automatically
	if d.Timestamp == "" {
		t.Error("expected timestamp to be set but it was empty")
	}
}

// TestListDownloads_OrderIsNewestFirst checks that newest records come first
func TestListDownloads_OrderIsNewestFirst(t *testing.T) {
	db := newTestDB(t)
	defer db.Close()

	db.InsertDownload("https://example.com/first.pdf", "first.pdf", "/downloads/first.pdf", "success")
	db.InsertDownload("https://example.com/second.pdf", "second.pdf", "/downloads/second.pdf", "success")

	downloads, err := db.ListDownloads()
	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}

	// Second inserted should come first because we ORDER BY id DESC
	if downloads[0].Filename != "second.pdf" {
		t.Errorf("expected newest record first but got '%s'", downloads[0].Filename)
	}
}
