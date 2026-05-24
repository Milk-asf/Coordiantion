"use client"

import DOMPurify from "dompurify"

const ALLOWED_TAGS = [
  "p", "br", "b", "i", "u", "s", "em", "strong",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "a", "span", "div",
  "blockquote", "code", "pre",
]

const ALLOWED_ATTR = ["href", "target", "rel", "class", "style"]

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ""
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  })
}

export function sanitizePlainText(dirty: string): string {
  if (!dirty) return ""
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
