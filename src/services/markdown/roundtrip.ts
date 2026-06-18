// roundtrip.ts — Convert a contenteditable DOM subtree back to Markdown.
// Strategy: walk the DOM and emit MD with full fidelity for the tags our renderer can produce
// (paragraphs, headings 1–6, em/strong, code, pre, ul/ol/li with nesting, blockquote, hr, br,
// a[href], img[src,alt], tables with header rows). Anything else is rendered as its textContent.

function isElement(n: Node): n is HTMLElement {
  return n.nodeType === Node.ELEMENT_NODE;
}

function inlineToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\u00a0/g, " ");
  if (!isElement(node)) return "";
  const tag = node.tagName.toLowerCase();
  const inner = inlineChildrenToMd(node);
  switch (tag) {
    case "br":
      return "  \n";
    case "strong":
    case "b":
      return inner.trim() ? `**${inner}**` : "";
    case "em":
    case "i":
      return inner.trim() ? `*${inner}*` : "";
    case "s":
    case "del":
      return inner.trim() ? `~~${inner}~~` : "";
    case "code":
      return `\`${inner}\``;
    case "a": {
      const href = (node as HTMLAnchorElement).getAttribute("href") ?? "";
      return href ? `[${inner}](${href})` : inner;
    }
    case "img": {
      const src = (node as HTMLImageElement).getAttribute("src") ?? "";
      const alt = (node as HTMLImageElement).getAttribute("alt") ?? "";
      return `![${alt}](${src})`;
    }
    default:
      return inner;
  }
}

function inlineChildrenToMd(parent: Node): string {
  let out = "";
  for (const n of [...parent.childNodes]) out += inlineToMd(n);
  return out;
}

function listToMd(node: HTMLElement, ordered: boolean, depth: number): string {
  const items = [...node.children].filter((c) => c.tagName.toLowerCase() === "li");
  return items
    .map((li, idx) => {
      const marker = ordered ? `${idx + 1}.` : "-";
      const indent = "  ".repeat(depth);
      // Separate inline content from nested lists
      const nestedListNodes: HTMLElement[] = [];
      const inlineNodes: Node[] = [];
      for (const child of [...li.childNodes]) {
        if (isElement(child) && (child.tagName === "UL" || child.tagName === "OL")) {
          nestedListNodes.push(child);
        } else {
          inlineNodes.push(child);
        }
      }
      const tmp = document.createElement("span");
      for (const n of inlineNodes) tmp.appendChild(n.cloneNode(true));
      const text = inlineChildrenToMd(tmp).trim();
      const nested = nestedListNodes
        .map((n) => listToMd(n, n.tagName === "OL", depth + 1))
        .join("");
      return `${indent}${marker} ${text}\n${nested}`;
    })
    .join("");
}

function tableToMd(table: HTMLTableElement): string {
  const rows = [...table.querySelectorAll("tr")];
  if (rows.length === 0) return "";
  const cellText = (c: Element): string => inlineChildrenToMd(c).trim().replace(/\|/g, "\\|") || " ";
  let out = "";
  rows.forEach((row, idx) => {
    const cells = [...row.querySelectorAll("th,td")].map(cellText);
    out += `| ${cells.join(" | ")} |\n`;
    if (idx === 0) out += `|${cells.map(() => "---").join("|")}|\n`;
  });
  return out + "\n";
}

function blockToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = (node.textContent ?? "").trim();
    return t ? `${t}\n\n` : "";
  }
  if (!isElement(node)) return "";
  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case "h1":
      return `# ${inlineChildrenToMd(node).trim()}\n\n`;
    case "h2":
      return `## ${inlineChildrenToMd(node).trim()}\n\n`;
    case "h3":
      return `### ${inlineChildrenToMd(node).trim()}\n\n`;
    case "h4":
      return `#### ${inlineChildrenToMd(node).trim()}\n\n`;
    case "h5":
      return `##### ${inlineChildrenToMd(node).trim()}\n\n`;
    case "h6":
      return `###### ${inlineChildrenToMd(node).trim()}\n\n`;
    case "p":
      return `${inlineChildrenToMd(node).trim()}\n\n`;
    case "hr":
      return `---\n\n`;
    case "blockquote": {
      const inner = blocksToMd(node).trim().split("\n").map((l) => `> ${l}`).join("\n");
      return `${inner}\n\n`;
    }
    case "pre": {
      const codeEl = node.querySelector("code");
      const code = codeEl ? codeEl.textContent ?? "" : node.textContent ?? "";
      const lang = codeEl?.getAttribute("data-lang") ?? "";
      return "```" + lang + "\n" + code.replace(/\n$/, "") + "\n```\n\n";
    }
    case "ul":
      return listToMd(node, false, 0) + "\n";
    case "ol":
      return listToMd(node, true, 0) + "\n";
    case "table":
      return tableToMd(node as HTMLTableElement);
    case "div":
    case "section":
    case "article":
      return blocksToMd(node);
    default:
      // Inline-level wrapper or unknown: treat as paragraph
      return `${inlineChildrenToMd(node).trim()}\n\n`;
  }
}

function blocksToMd(parent: Node): string {
  let out = "";
  for (const n of [...parent.childNodes]) out += blockToMd(n);
  return out;
}

/** Convert a rendered DOM subtree to Markdown. */
export function htmlToMarkdown(root: Element): string {
  return blocksToMd(root).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
