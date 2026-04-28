package handler

import (
	"encoding/json"
	"net/http"
	"sync"

	"downloader/database"
	"downloader/downloader"
)

// Handler holds the database connection.
// Every HTTP request that needs the DB goes through this.
type Handler struct {
	DB *database.DB
}

// New creates and returns a Handler with the given database.
func New(db *database.DB) *Handler {
	return &Handler{DB: db}
}

// downloadResponse is what we send back for each URL in /download
type downloadResponse struct {
	URL      string `json:"url"`
	Status   string `json:"status"`
	Filename string `json:"filename,omitempty"` // omitempty means: skip this field in JSON if it is empty
	FilePath string `json:"filepath,omitempty"`
	Error    string `json:"error,omitempty"`
}

// downloadListResponse is the full response body for /download
type downloadListResponse struct {
	Results []downloadResponse `json:"results"`
}

// listResponse is the full response body for /list
type listResponse struct {
	Downloads []database.Download `json:"downloads"`
}

// sendJSON is a helper that writes any value as JSON to the response.
// interface{} means it accepts any type — same concept as Project 1.
func sendJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// HandleDownload handles GET /download?url=x&url=y&url=z
// It downloads all given URLs in parallel and saves results to the DB.
func (h *Handler) HandleDownload(w http.ResponseWriter, r *http.Request) {

	// Step 1: Only allow GET requests
	if r.Method != http.MethodGet {
		sendJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "only GET method is allowed",
		})
		return
	}

	// Step 2: Get all ?url= values from the query string.
	// r.URL.Query() parses all query params.
	// ["url"] gets the slice of all values for the "url" key.
	// Example: ?url=a&url=b&url=c gives us []string{"a", "b", "c"}
	urls := r.URL.Query()["url"]

	// Step 3: Validate — must have at least one URL
	if len(urls) == 0 {
		sendJSON(w, http.StatusBadRequest, map[string]string{
			"error": "at least one url query parameter is required",
		})
		return
	}

	// Step 4: Validate — must not exceed 5 URLs
	if len(urls) > 5 {
		sendJSON(w, http.StatusBadRequest, map[string]string{
			"error": "maximum 5 urls allowed per request",
		})
		return
	}

	// Step 5: Get the system Downloads folder path
	folderPath, err := downloader.GetDownloadsFolder()
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "could not find downloads folder",
		})
		return
	}

	// Step 6: Make sure the Downloads folder exists
	err = downloader.EnsureFolder(folderPath)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "could not create downloads folder",
		})
		return
	}

	// Step 7: Download all files in parallel
	// results slice holds one downloadResponse per URL
	results := make([]downloadResponse, 0)

	// mu protects the results slice from concurrent writes
	var mu sync.Mutex

	// wg tracks how many goroutines are still running
	var wg sync.WaitGroup

	for _, url := range urls {
		wg.Add(1) // tell WaitGroup: one more goroutine starting

		// Pass url as argument to avoid goroutine variable capture problem
		go func(u string) {
			defer wg.Done() // tell WaitGroup: this goroutine is done

			// Download the file
			result := downloader.DownloadFile(u, folderPath)

			// Save to database — every attempt, success or failure
			h.DB.InsertDownload(
				result.URL,
				result.Filename,
				result.FilePath,
				result.Status,
			)

			// Build the response for this URL
			resp := downloadResponse{
				URL:      result.URL,
				Status:   result.Status,
				Filename: result.Filename,
				FilePath: result.FilePath,
				Error:    result.Error,
			}

			// Lock before writing to shared results slice
			mu.Lock()
			results = append(results, resp)
			mu.Unlock()

		}(url) // pass url here — creates a local copy for this goroutine
	}

	// Step 8: Wait for ALL goroutines to finish
	wg.Wait()

	// Step 9: Send the response
	sendJSON(w, http.StatusOK, downloadListResponse{Results: results})
}

// HandleList handles GET /list
// It returns all download records from the database.
func (h *Handler) HandleList(w http.ResponseWriter, r *http.Request) {

	// Only allow GET requests
	if r.Method != http.MethodGet {
		sendJSON(w, http.StatusMethodNotAllowed, map[string]string{
			"error": "only GET method is allowed",
		})
		return
	}

	// Fetch all records from the database
	downloads, err := h.DB.ListDownloads()
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "could not fetch downloads list",
		})
		return
	}

	sendJSON(w, http.StatusOK, listResponse{Downloads: downloads})
}
