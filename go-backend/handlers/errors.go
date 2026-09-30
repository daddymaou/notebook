package handlers

import (
	"net/http"
)

// paperErrorPage renders a full notebook-styled error page.
func paperErrorPage(w http.ResponseWriter, code int, title, line1, line2 string) {
	m := Meta{
		Title:       title + " — notebook",
		Description: line1,
		Type:        "website",
		Image:       "/og.png",
	}
	html := `<!DOCTYPE html>
<html lang="en">
<head>
` + RenderHead(m) + `
</head>
<body>
  <div class="desk">
    <div class="home-header">
      <h1><a href="/" style="color:inherit;text-decoration:none;">notebook</a></h1>
      <a class="about-link" href="/new">write</a>
    </div>
    <article class="paper ink-fade">
      <h3>` + escape(title) + `</h3>
      <p>` + escape(line1) + `</p>`

	if line2 != "" {
		html += `
      <p class="empty">` + escape(line2) + `</p>`
	}

	html += `
      <p style="margin-top:32px;"><a href="/">← back to the cover</a></p>
    </article>
  </div>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(code)
	w.Write([]byte(html))
}

// Serve404 — page torn out.
func Serve404(w http.ResponseWriter, r *http.Request) {
	paperErrorPage(w, http.StatusNotFound,
		"torn out",
		"this page seems to have been torn out.",
		"maybe it was never written. or someone took it.",
	)
}

// Serve500 — ink spilled.
func Serve500(w http.ResponseWriter, r *http.Request) {
	paperErrorPage(w, http.StatusInternalServerError,
		"ink spilled",
		"something spilled on the ink.",
		"try again in a moment — the page needs to dry.",
	)
}

// Serve405 — wrong method, still notebook voice.
func Serve405(w http.ResponseWriter, r *http.Request) {
	paperErrorPage(w, http.StatusMethodNotAllowed,
		"wrong fold",
		"that isn't how this page opens.",
		"",
	)
}
