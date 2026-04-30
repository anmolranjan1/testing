package downloader

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestExtractFilename_Normal checks a regular URL with a clear filename
func TestExtractFilename_Normal(t *testing.T) {
	url := "https://example.com/files/report.pdf"
	result := ExtractFilename(url)
	if result != "report.pdf" {
		t.Errorf("expected 'report.pdf' but got '%s'", result)
	}
}

// TestExtractFilename_JustFilename checks a URL that is just a filename
func TestExtractFilename_JustFilename(t *testing.T) {
	url := "https://example.com/image.png"
	result := ExtractFilename(url)
	if result != "image.png" {
		t.Errorf("expected 'image.png' but got '%s'", result)
	}
}

// TestEnsureFolder checks that the folder is created if it does not exist
func TestEnsureFolder(t *testing.T) {
	// os.TempDir() gives us the system temp folder — safe place to create test folders
	// filepath.Join builds the full path to our test folder
	testFolder := filepath.Join(os.TempDir(), "test_downloads_folder")

	// clean up after the test runs — remove the folder we created
	defer os.RemoveAll(testFolder)

	err := EnsureFolder(testFolder)
	if err != nil {
		t.Errorf("expected no error but got: %s", err.Error())
	}

	// Check the folder actually exists now
	_, err = os.Stat(testFolder)
	if os.IsNotExist(err) {
		t.Error("expected folder to exist but it does not")
	}
}

// TestEnsureFolder_AlreadyExists checks that calling EnsureFolder twice does not error
func TestEnsureFolder_AlreadyExists(t *testing.T) {
	testFolder := filepath.Join(os.TempDir(), "test_downloads_existing")
	defer os.RemoveAll(testFolder)

	// Create it once
	EnsureFolder(testFolder)

	// Call again — should not error
	err := EnsureFolder(testFolder)
	if err != nil {
		t.Errorf("expected no error on second call but got: %s", err.Error())
	}
}

// TestDownloadFile_Success checks that a file downloads and saves correctly.
// We use httptest.NewServer to create a fake local server — no real internet needed.
func TestDownloadFile_Success(t *testing.T) {
	// Create a fake server that serves a simple text file
	// When our downloader calls http.Get on this server's URL,
	// it gets back "hello file content" as the file body
	fakeServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("hello file content"))
	}))
	defer fakeServer.Close() // shut down fake server when test finishes

	// Use a temp folder to save the file — not the real Downloads folder
	testFolder := filepath.Join(os.TempDir(), "test_download_success")
	defer os.RemoveAll(testFolder)
	os.MkdirAll(testFolder, 0755)

	// Build a fake URL that points to our fake server
	// fakeServer.URL looks like "http://127.0.0.1:PORT"
	// We add /testfile.txt so ExtractFilename gives us "testfile.txt"
	fakeURL := fakeServer.URL + "/testfile.txt"

	result := DownloadFile(fakeURL, testFolder)

	// Check status is success
	if result.Status != "success" {
		t.Errorf("expected status 'success' but got '%s' — error: %s", result.Status, result.Error)
	}

	// Check filename is correct
	if result.Filename != "testfile.txt" {
		t.Errorf("expected filename 'testfile.txt' but got '%s'", result.Filename)
	}

	// Check the file actually exists on disk
	_, err := os.Stat(result.FilePath)
	if os.IsNotExist(err) {
		t.Error("expected file to exist on disk but it does not")
	}

	// Check the file content is correct
	content, err := os.ReadFile(result.FilePath)
	if err != nil {
		t.Errorf("could not read saved file: %s", err.Error())
	}
	if string(content) != "hello file content" {
		t.Errorf("expected file content 'hello file content' but got '%s'", string(content))
	}
}

// TestDownloadFile_BadURL checks that an invalid URL returns a failed result
func TestDownloadFile_BadURL(t *testing.T) {
	testFolder := filepath.Join(os.TempDir(), "test_download_badurl")
	defer os.RemoveAll(testFolder)
	os.MkdirAll(testFolder, 0755)

	// This URL does not exist — http.Get will fail
	result := DownloadFile("http://localhost:0/file.txt", testFolder)

	if result.Status != "failed" {
		t.Errorf("expected status 'failed' but got '%s'", result.Status)
	}

	if result.Error == "" {
		t.Error("expected an error message but got empty string")
	}
}

// TestDownloadFile_ServerReturns404 checks that a 404 response is treated as failure
func TestDownloadFile_ServerReturns404(t *testing.T) {
	// Fake server that always returns 404
	fakeServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer fakeServer.Close()

	testFolder := filepath.Join(os.TempDir(), "test_download_404")
	defer os.RemoveAll(testFolder)
	os.MkdirAll(testFolder, 0755)

	result := DownloadFile(fakeServer.URL+"/missing.txt", testFolder)

	if result.Status != "failed" {
		t.Errorf("expected status 'failed' but got '%s'", result.Status)
	}

	if !strings.Contains(result.Error, "404") {
		t.Errorf("expected error to mention 404 but got: '%s'", result.Error)
	}
}
