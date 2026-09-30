package handlers

import (
	"net/http"

	"notebook/sidecar"
)

// Upload handles POST /api/upload — forwards multipart file to the sidecar.
func Upload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseMultipartForm(12 << 20); err != nil { // 12 MB
		writeErr(w, http.StatusBadRequest, "the page is too heavy to tear off")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "no file found in the fold")
		return
	}
	defer file.Close()

	url, err := sidecar.UploadFile(header.Filename, file)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "something spilled on the ink")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}
