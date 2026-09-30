package handlers

import (
	"html"
	"strings"
)

// Meta holds values used to fill Open Graph / Twitter tags.
type Meta struct {
	Title       string
	Description string
	Image       string
	URL         string
	Type        string // website | article
	Published   string // ISO8601 for articles
}

func escape(s string) string {
	return html.EscapeString(s)
}

// RenderHead returns a complete <head> fragment for a page.
func RenderHead(m Meta) string {
	if m.Type == "" {
		m.Type = "website"
	}
	if m.Image == "" {
		m.Image = "/og.png"
	}
	var b strings.Builder
	b.WriteString(`<meta charset="utf-8">`)
	b.WriteString(`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`)
	b.WriteString(`<meta name="theme-color" content="#fdfbf5">`)
	b.WriteString(`<link rel="icon" type="image/svg+xml" href="/favicon.svg">`)
	b.WriteString(`<link rel="icon" type="image/x-icon" href="/favicon.ico">`)
	b.WriteString(`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`)
	b.WriteString(`<link rel="preconnect" href="https://fonts.googleapis.com">`)
	b.WriteString(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`)
	b.WriteString(`<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet">`)
	b.WriteString(`<link rel="stylesheet" href="/static/style.css">`)

	b.WriteString(`<title>` + escape(m.Title) + `</title>`)
	b.WriteString(`<meta name="description" content="` + escape(m.Description) + `">`)

	b.WriteString(`<meta property="og:type" content="` + escape(m.Type) + `">`)
	b.WriteString(`<meta property="og:title" content="` + escape(m.Title) + `">`)
	b.WriteString(`<meta property="og:description" content="` + escape(m.Description) + `">`)
	b.WriteString(`<meta property="og:image" content="` + escape(m.Image) + `">`)
	if m.URL != "" {
		b.WriteString(`<meta property="og:url" content="` + escape(m.URL) + `">`)
	}
	if m.Published != "" {
		b.WriteString(`<meta property="article:published_time" content="` + escape(m.Published) + `">`)
	}

	b.WriteString(`<meta name="twitter:card" content="summary_large_image">`)
	b.WriteString(`<meta name="twitter:title" content="` + escape(m.Title) + `">`)
	b.WriteString(`<meta name="twitter:description" content="` + escape(m.Description) + `">`)
	b.WriteString(`<meta name="twitter:image" content="` + escape(m.Image) + `">`)
	return b.String()
}
