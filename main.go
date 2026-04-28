package main

import (
	"fmt"
	"net/http"

	"downloader/database"
	"downloader/handler"
)

func main() {
	// Step 1: Open the SQLite database.
	// "downloads.db" will be created in the project folder if it does not exist.
	db, err := database.New("downloads.db")
	if err != nil {
		fmt.Println("Error opening database:", err)
		return
	}
	defer db.Close()

	// Step 2: Create the handler with the database
	h := handler.New(db)

	// Step 3: Register routes
	mux := http.NewServeMux()
	mux.HandleFunc("/download", h.HandleDownload)
	mux.HandleFunc("/list", h.HandleList)

	// Step 4: Start the server
	fmt.Println("Server starting on port 8080...")
	err = http.ListenAndServe(":8080", mux)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
