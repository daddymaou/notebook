package content

import (
	"encoding/json"
	"fmt"
	"strings"
)

// Node is a Telegraph-style content node: tag + attrs + children (strings or nested Nodes).
type Node struct {
	Tag      string                 `json:"tag,omitempty"`
	Attrs    map[string]interface{} `json:"attrs,omitempty"`
	Children []interface{}          `json:"children,omitempty"`
}

// Allowed tags only — everything else is rejected.
var allowedTags = map[string]bool{
	// Inline
	"u": true, "ins": true, "sub": true, "sup": true, "a": true,
	"strong": true, "em": true, "code": true, "mark": true,
	// Block
	"p": true, "h3": true, "h4": true, "blockquote": true, "aside": true,
	"figure": true, "figcaption": true, "cite": true, "hr": true, "pre": true,
	// Media
	"img": true, "video": true,
	// Struct
	"details": true, "summary": true,
}

// Validate walks the tree and rejects unknown tags.
func Validate(nodes []Node) error {
	for i, n := range nodes {
		if err := validateNode(&n); err != nil {
			return fmt.Errorf("node[%d]: %w", i, err)
		}
	}
	return nil
}

func validateNode(n *Node) error {
	if n.Tag == "" {
		return nil // plain text leaves are represented as string children, not empty-tag nodes
	}
	if !allowedTags[n.Tag] {
		return fmt.Errorf("unsupported tag: %s", n.Tag)
	}
	for _, child := range n.Children {
		switch c := child.(type) {
		case string:
			continue
		case map[string]interface{}:
			var nested Node
			b, _ := json.Marshal(c)
			if err := json.Unmarshal(b, &nested); err != nil {
				return err
			}
			if err := validateNode(&nested); err != nil {
				return err
			}
		case Node:
			if err := validateNode(&c); err != nil {
				return err
			}
		default:
			// ignore unknown child types
		}
	}
	return nil
}

// PlainText extracts readable text from the node tree (for meta descriptions / auto-title).
func PlainText(nodes []Node) string {
	var b strings.Builder
	for _, n := range nodes {
		plainNode(&n, &b)
	}
	return strings.TrimSpace(b.String())
}

func plainNode(n *Node, b *strings.Builder) {
	if n.Tag == "hr" {
		return
	}
	for _, child := range n.Children {
		switch c := child.(type) {
		case string:
			b.WriteString(c)
		case map[string]interface{}:
			var nested Node
			raw, _ := json.Marshal(c)
			_ = json.Unmarshal(raw, &nested)
			plainNode(&nested, b)
		case Node:
			plainNode(&c, b)
		}
	}
	if n.Tag == "p" || n.Tag == "h3" || n.Tag == "h4" || n.Tag == "blockquote" || n.Tag == "aside" {
		b.WriteString(" ")
	}
}

// FirstImageURL walks the tree and returns the first img src, or empty.
func FirstImageURL(nodes []Node) string {
	for _, n := range nodes {
		if url := firstImage(&n); url != "" {
			return url
		}
	}
	return ""
}

func firstImage(n *Node) string {
	if n.Tag == "img" && n.Attrs != nil {
		if src, ok := n.Attrs["src"].(string); ok && src != "" {
			return src
		}
	}
	for _, child := range n.Children {
		switch c := child.(type) {
		case map[string]interface{}:
			var nested Node
			raw, _ := json.Marshal(c)
			_ = json.Unmarshal(raw, &nested)
			if url := firstImage(&nested); url != "" {
				return url
			}
		case Node:
			if url := firstImage(&c); url != "" {
				return url
			}
		}
	}
	return ""
}

// Truncate returns at most max runes of s, adding ellipsis if needed.
func Truncate(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max-1]) + "…"
}
