package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"notebook/content"
	"notebook/sidecar"
)

type createReq struct {
	Title   string          `json:"title"`
	Content json.RawMessage `json:"content"`
}

// CreatePage handles POST /api/pages
func CreatePage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req createReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "the ink smeared — could not read what you wrote")
		return
	}
	var nodes []content.Node
	if err := json.Unmarshal(req.Content, &nodes); err != nil {
		writeErr(w, http.StatusBadRequest, "the ink smeared — content is not a valid page")
		return
	}
	if err := content.Validate(nodes); err != nil {
		writeErr(w, http.StatusBadRequest, "something spilled on the ink: "+err.Error())
		return
	}
	out, err := sidecar.CreatePage(req.Title, req.Content)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "something spilled on the ink")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{
		"slug": out.Slug,
		"url":  "/p/" + out.Slug,
	})
}

// GetPage handles GET /api/pages/:slug
func GetPage(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	slug = strings.Trim(slug, "/")
	if slug == "" {
		ListPages(w, r)
		return
	}
	p, err := sidecar.GetPage(slug)
	if err != nil {
		if err.Error() == "not found" {
			writeErr(w, http.StatusNotFound, "this page seems to have been torn out")
			return
		}
		writeErr(w, http.StatusInternalServerError, "something spilled on the ink")
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// UpdatePage handles PATCH /api/pages/:slug
func UpdatePage(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	slug = strings.Trim(slug, "/")
	if slug == "" {
		writeErr(w, http.StatusBadRequest, "which page?")
		return
	}
	var req createReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "the ink smeared — could not read what you wrote")
		return
	}
	var nodes []content.Node
	if err := json.Unmarshal(req.Content, &nodes); err != nil {
		writeErr(w, http.StatusBadRequest, "the ink smeared — content is not a valid page")
		return
	}
	if err := content.Validate(nodes); err != nil {
		writeErr(w, http.StatusBadRequest, "something spilled on the ink: "+err.Error())
		return
	}
	if err := sidecar.UpdatePage(slug, req.Title, req.Content); err != nil {
		writeErr(w, http.StatusInternalServerError, "something spilled on the ink")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"slug": slug, "url": "/p/" + slug})
}

// ListPages handles GET /api/pages
func ListPages(w http.ResponseWriter, r *http.Request) {
	pages, err := sidecar.ListPages()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "something spilled on the ink")
		return
	}
	writeJSON(w, http.StatusOK, pages)
}

// ServeReader serves the reader HTML shell; the client fetches content via API.
func ServeReader(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimPrefix(r.URL.Path, "/p/")
	slug = strings.Trim(slug, "/")
	if slug == "" {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Prefetch for meta tags — missing page gets a real paper 404
	p, err := sidecar.GetPage(slug)
	if err != nil {
		if err.Error() == "not found" {
			Serve404(w, r)
			return
		}
		Serve500(w, r)
		return
	}

	title := "notebook"
	desc := "A page from notebook."
	img := "/og.png"
	published := ""
	if p != nil {
		var nodes []content.Node
		_ = json.Unmarshal(p.Content, &nodes)
		plain := content.PlainText(nodes)
		if p.Title != "" {
			title = p.Title + " — notebook"
		} else if plain != "" {
			title = content.Truncate(plain, 60) + " — notebook"
		}
		if plain != "" {
			desc = content.Truncate(plain, 160)
		}
		if u := content.FirstImageURL(nodes); u != "" {
			img = u
		}
		published = p.CreatedAt
	}

	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	pageURL := scheme + "://" + r.Host + "/p/" + slug

	m := Meta{
		Title:       title,
		Description: desc,
		Image:       img,
		URL:         pageURL,
		Type:        "article",
		Published:   published,
	}
	html := `<!DOCTYPE html>
<html lang="en">
<head>
` + RenderHead(m) + `
</head>
<body>
  <div id="root" class="desk">
    <article id="page" class="paper ink-fade" data-slug="` + escape(slug) + `"></article>
    <footer class="page-footer" id="footer"></footer>
  </div>
  <script src="/static/render.js"></script>
  <script>
    (async function () {
      const slug = document.getElementById('page').dataset.slug;
      try {
        const res = await fetch('/api/pages/' + slug);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          document.getElementById('page').innerHTML = '<p class="empty">' + (err.error || 'this page seems to have been torn out') + '</p>';
          return;
        }
        const data = await res.json();
        const nodes = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        window.renderNodes(document.getElementById('page'), nodes || []);
        const when = data.createdAt ? relativeDate(data.createdAt) : '';
        document.getElementById('footer').textContent = when ? 'page written on ' + when : '';
        // Auto-title if missing
        if (!data.title) {
          const plain = document.getElementById('page').textContent.trim();
          if (plain) document.title = plain.slice(0, 60) + (plain.length > 60 ? '…' : '') + ' — notebook';
        }
      } catch (e) {
        document.getElementById('page').innerHTML = '<p class="empty">something spilled on the ink</p>';
      }
    })();
    function relativeDate(iso) {
      const d = new Date(iso);
      const now = new Date();
      const diff = (now - d) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
      if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
      if (diff < 604800) return Math.floor(diff / 86400) + ' days ago';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
  </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

// RelativeDate is exported for tests / other handlers.
func RelativeDate(iso string) string {
	d, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	diff := time.Since(d).Seconds()
	switch {
	case diff < 60:
		return "just now"
	case diff < 3600:
		return formatN(int(diff/60), "minute")
	case diff < 86400:
		return formatN(int(diff/3600), "hour")
	case diff < 604800:
		return formatN(int(diff/86400), "day")
	default:
		return d.Format("January 2, 2006")
	}
}

func formatN(n int, unit string) string {
	if n == 1 {
		return "1 " + unit + " ago"
	}
	return fmt.Sprintf("%d %ss ago", n, unit)
}
