package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"notebook/handlers"
)

func main() {
	printBanner()

	mux := http.NewServeMux()

	// API — JSON errors stay notebook-voiced via writeErr
	mux.HandleFunc("/api/pages", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.ListPages(w, r)
		case http.MethodPost:
			handlers.CreatePage(w, r)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte(`{"error":"that isn't how this page opens"}`))
		}
	})
	mux.HandleFunc("/api/pages/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetPage(w, r)
		case http.MethodPatch:
			handlers.UpdatePage(w, r)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte(`{"error":"that isn't how this page opens"}`))
		}
	})
	mux.HandleFunc("/api/upload", handlers.Upload)

	// Pages
	mux.HandleFunc("/p/", handlers.ServeReader)
	mux.HandleFunc("/new", serveStatic("new.html"))
	mux.HandleFunc("/about", serveStatic("about.html"))
	mux.HandleFunc("/", serveHome)

	// Static + favicons
	mux.HandleFunc("/static/", serveFile)
	mux.HandleFunc("/favicon.ico", serveAsset("favicon.ico"))
	mux.HandleFunc("/favicon.svg", serveAsset("favicon.svg"))
	mux.HandleFunc("/apple-touch-icon.png", serveAsset("apple-touch-icon.png"))
	mux.HandleFunc("/og.png", serveAsset("og.png"))
	mux.HandleFunc("/og.svg", serveAsset("og.svg"))

	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	fmt.Printf("notebook listening on http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, withRecovery(withCORS(mux))))
}

func printBanner() {
	fmt.Println(`
  ┌─────────────────────┐
  │  n o t e b o o k    │
  │  ─────────────────  │
  │  ruled lines · ink  │
  └─────────────────────┘
`)
}

func staticRoot() string {
	candidates := []string{"static", "../static", "go-backend/../static"}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	return "static"
}

func serveStatic(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticRoot(), name)
		if _, err := os.Stat(path); err != nil {
			handlers.Serve404(w, r)
			return
		}
		http.ServeFile(w, r, path)
	}
}

func serveAsset(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := filepath.Join(staticRoot(), name)
		if _, err := os.Stat(path); err != nil {
			handlers.Serve404(w, r)
			return
		}
		http.ServeFile(w, r, path)
	}
}

func serveFile(w http.ResponseWriter, r *http.Request) {
	rel := strings.TrimPrefix(r.URL.Path, "/static/")
	if rel == "" || strings.Contains(rel, "..") {
		handlers.Serve404(w, r)
		return
	}
	path := filepath.Join(staticRoot(), rel)
	if _, err := os.Stat(path); err != nil {
		handlers.Serve404(w, r)
		return
	}
	http.ServeFile(w, r, path)
}

func serveHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		handlers.Serve404(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join(staticRoot(), "index.html"))
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// withRecovery catches panics and serves a paper 500 page.
func withRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				// API paths still get JSON; everything else gets paper
				if strings.HasPrefix(r.URL.Path, "/api/") {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte(`{"error":"something spilled on the ink"}`))
					return
				}
				handlers.Serve500(w, r)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
