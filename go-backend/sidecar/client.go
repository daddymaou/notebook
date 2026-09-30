package sidecar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

var baseURL = func() string {
	if u := os.Getenv("SIDECAR_URL"); u != "" {
		return u
	}
	return "http://localhost:4000"
}()

var httpClient = &http.Client{Timeout: 30 * time.Second}

// Page is the document stored in the gramobase "pages" collection.
type Page struct {
	Slug      string          `json:"slug"`
	Title     string          `json:"title"`
	Content   json.RawMessage `json:"content"` // node tree
	CreatedAt string          `json:"createdAt"`
}

type createResp struct {
	Slug string `json:"slug"`
	URL  string `json:"url"`
}

// CreatePage posts a new page to the sidecar.
func CreatePage(title string, content json.RawMessage) (*createResp, error) {
	body, _ := json.Marshal(map[string]interface{}{
		"title":   title,
		"content": content,
	})
	resp, err := httpClient.Post(baseURL+"/pages", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sidecar create: %s — %s", resp.Status, string(b))
	}
	var out createResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetPage fetches a page by slug.
func GetPage(slug string) (*Page, error) {
	resp, err := httpClient.Get(baseURL + "/pages/" + slug)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("not found")
	}
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sidecar get: %s — %s", resp.Status, string(b))
	}
	var p Page
	if err := json.NewDecoder(resp.Body).Decode(&p); err != nil {
		return nil, err
	}
	return &p, nil
}

// UpdatePage patches title/content for an existing page.
func UpdatePage(slug, title string, content json.RawMessage) error {
	body, _ := json.Marshal(map[string]interface{}{
		"title":   title,
		"content": content,
	})
	req, err := http.NewRequest(http.MethodPatch, baseURL+"/pages/"+slug, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sidecar update: %s — %s", resp.Status, string(b))
	}
	return nil
}

// ListPages returns recent pages (newest first).
func ListPages() ([]Page, error) {
	resp, err := httpClient.Get(baseURL + "/pages")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sidecar list: %s — %s", resp.Status, string(b))
	}
	var pages []Page
	if err := json.NewDecoder(resp.Body).Decode(&pages); err != nil {
		return nil, err
	}
	return pages, nil
}

// UploadFile forwards a multipart file to the sidecar and returns the CDN URL.
func UploadFile(filename string, r io.Reader) (string, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(part, r); err != nil {
		return "", err
	}
	w.Close()

	resp, err := httpClient.Post(baseURL+"/upload", w.FormDataContentType(), &buf)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("sidecar upload: %s — %s", resp.Status, string(b))
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.URL, nil
}
