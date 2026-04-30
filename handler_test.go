package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"downloader/database"
)

// newTestHandler creates a fresh handler with an in-memory database.
// Used at the start of every test — keeps tests independent.
func newTestHandler(t *testing.T) *Handler {
	db, err := database.New(":memory:")
	if err != nil {
		t.Fatalf("could not create test database: %s", err.Error())
	}
	return New(db)
}

// newFakeFileServer creates a fake HTTP server that serves a small file.
// Any request to this server gets back "fake file content" as the response.
// We use this so our handler tests do not need real internet.
func newFakeFileServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("fake file content"))
	}))
}

// ── /download tests ───────────────────────────────────────────────────────────

func TestHandleDownload_WrongMethod(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// POST is not allowed — only GET
	req := httptest.NewRequest(http.MethodPost, "/download?url=https://example.com/file.txt", nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405 but got %d", w.Code)
	}
}

func TestHandleDownload_NoURLs(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// No url query param at all
	req := httptest.NewRequest(http.MethodGet, "/download", nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 but got %d", w.Code)
	}

	// Check error message is in the response body
	body, _ := io.ReadAll(w.Result().Body)
	if string(body) == "" {
		t.Error("expected error message in body but got empty")
	}
}

func TestHandleDownload_TooManyURLs(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// Send 6 URLs — exceeds the limit of 5
	req := httptest.NewRequest(http.MethodGet,
		"/download?url=a&url=b&url=c&url=d&url=e&url=f", nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 but got %d", w.Code)
	}
}

func TestHandleDownload_Success(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// Start a fake file server
	fakeServer := newFakeFileServer()
	defer fakeServer.Close()

	// Build request with one URL pointing to our fake server
	fakeURL := fakeServer.URL + "/testfile.txt"
	req := httptest.NewRequest(http.MethodGet, "/download?url="+fakeURL, nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 but got %d", w.Code)
	}

	// Parse the response body
	var response downloadListResponse
	err := json.NewDecoder(w.Result().Body).Decode(&response)
	if err != nil {
		t.Fatalf("could not decode response body: %s", err.Error())
	}

	// Should have exactly one result
	if len(response.Results) != 1 {
		t.Fatalf("expected 1 result but got %d", len(response.Results))
	}

	// That result should be a success
	if response.Results[0].Status != "success" {
		t.Errorf("expected status 'success' but got '%s'", response.Results[0].Status)
	}
}

func TestHandleDownload_MultipleURLs(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// Start a fake file server
	fakeServer := newFakeFileServer()
	defer fakeServer.Close()

	// Send 3 URLs to the same fake server with different filenames
	url1 := fakeServer.URL + "/file1.txt"
	url2 := fakeServer.URL + "/file2.txt"
	url3 := fakeServer.URL + "/file3.txt"

	req := httptest.NewRequest(http.MethodGet,
		"/download?url="+url1+"&url="+url2+"&url="+url3, nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 but got %d", w.Code)
	}

	var response downloadListResponse
	err := json.NewDecoder(w.Result().Body).Decode(&response)
	if err != nil {
		t.Fatalf("could not decode response body: %s", err.Error())
	}

	// Should have 3 results
	if len(response.Results) != 3 {
		t.Fatalf("expected 3 results but got %d", len(response.Results))
	}
}

func TestHandleDownload_SavesToDB(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	fakeServer := newFakeFileServer()
	defer fakeServer.Close()

	fakeURL := fakeServer.URL + "/dbtest.txt"
	req := httptest.NewRequest(http.MethodGet, "/download?url="+fakeURL, nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	// After download, check the DB has one record
	downloads, err := h.DB.ListDownloads()
	if err != nil {
		t.Fatalf("could not list downloads: %s", err.Error())
	}

	if len(downloads) != 1 {
		t.Fatalf("expected 1 record in DB but got %d", len(downloads))
	}

	if downloads[0].Status != "success" {
		t.Errorf("expected DB record status 'success' but got '%s'", downloads[0].Status)
	}
}

func TestHandleDownload_FailedURLSavesToDB(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// Use a URL that will definitely fail
	req := httptest.NewRequest(http.MethodGet,
		"/download?url=http://localhost:0/file.txt", nil)
	w := httptest.NewRecorder()
	h.HandleDownload(w, req)

	// Response should still be 200 — server worked, download just failed
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 but got %d", w.Code)
	}

	// DB should still have a record with status failed
	downloads, err := h.DB.ListDownloads()
	if err != nil {
		t.Fatalf("could not list downloads: %s", err.Error())
	}

	if len(downloads) != 1 {
		t.Fatalf("expected 1 record in DB but got %d", len(downloads))
	}

	if downloads[0].Status != "failed" {
		t.Errorf("expected DB record status 'failed' but got '%s'", downloads[0].Status)
	}
}

// ── /list tests ───────────────────────────────────────────────────────────────

func TestHandleList_WrongMethod(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	req := httptest.NewRequest(http.MethodPost, "/list", nil)
	w := httptest.NewRecorder()
	h.HandleList(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405 but got %d", w.Code)
	}
}

func TestHandleList_EmptyDB(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	req := httptest.NewRequest(http.MethodGet, "/list", nil)
	w := httptest.NewRecorder()
	h.HandleList(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 but got %d", w.Code)
	}

	// Parse the response
	var response listResponse
	err := json.NewDecoder(w.Result().Body).Decode(&response)
	if err != nil {
		t.Fatalf("could not decode response: %s", err.Error())
	}

	// Empty DB should return empty list, not null
	if len(response.Downloads) != 0 {
		t.Errorf("expected 0 downloads but got %d", len(response.Downloads))
	}
}

func TestHandleList_ReturnsRecords(t *testing.T) {
	h := newTestHandler(t)
	defer h.DB.Close()

	// Insert two records directly into DB
	h.DB.InsertDownload("https://example.com/a.pdf", "a.pdf", "/downloads/a.pdf", "success")
	h.DB.InsertDownload("https://example.com/b.png", "b.png", "/downloads/b.png", "failed")

	req := httptest.NewRequest(http.MethodGet, "/list", nil)
	w := httptest.NewRecorder()
	h.HandleList(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200 but got %d", w.Code)
	}

	var response listResponse
	err := json.NewDecoder(w.Result().Body).Decode(&response)
	if err != nil {
		t.Fatalf("could not decode response: %s", err.Error())
	}

	if len(response.Downloads) != 2 {
		t.Errorf("expected 2 downloads but got %d", len(response.Downloads))
	}
}
