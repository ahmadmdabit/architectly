// render.ts — Safe Markdown → HTML rendering via marked + hardened DOMPurify.
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ async: false, gfm: true, breaks: true });

const AllowedClasses = new Set([
  "table-wrap",
  "raw",
  "small",
  "muted",
  "doc-section",
  "doc-section-head",
  "doc-section-body",
  "doc-prelude",
  "doc-h1",
]);

// Once per module load: force safe link attributes.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("rel", "noopener noreferrer nofollow");
    node.setAttribute("target", "_blank");
  }
  if (node.hasAttribute("class")) {
    const filtered = (node.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((c) => AllowedClasses.has(c))
      .join(" ");
    if (filtered) node.setAttribute("class", filtered);
    else node.removeAttribute("class");
  }
});

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const raw = marked.parse(String(md)) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "p", "br", "hr",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "em", "b", "i", "u", "s", "sub", "sup",
      "code", "pre", "blockquote",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span",
    ],
    ALLOWED_ATTR: ["href", "title", "src", "alt", "class", "data-lang"],
    FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button", "object", "embed", "link", "meta"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "style"],
  });
}
