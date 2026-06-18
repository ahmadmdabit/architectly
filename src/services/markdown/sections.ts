// sections.ts — Operate on H2-delimited sections inside a Markdown document.
export interface MdBlock {
  type: "h1" | "section" | "prelude";
  heading?: string;
  text?: string;
  content: string;
}

const H1 = /^#\s+/;
const H2 = /^##\s+/;

export function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/^##\s*/, "").replace(/^\d+\.\s*/, "").trim();
}

export function extractHeadings(md: string): string[] {
  return md
    .split("\n")
    .filter((l) => H2.test(l))
    .map((l) => l.replace(H2, "").trim());
}

export function splitByHeadings(md: string): MdBlock[] {
  const lines = md.split("\n");
  const blocks: Array<{ type: "h1" | "section" | "prelude"; heading?: string; text?: string; content: string[] }> = [];
  let current: { type: "prelude" | "section"; heading?: string; content: string[] } = { type: "prelude", content: [] };
  let h1: string | null = null;

  for (const line of lines) {
    if (H1.test(line) && !h1) {
      h1 = line.replace(H1, "").trim();
      if (current.content.length > 0) {
        blocks.push(current);
        current = { type: "prelude", content: [] };
      }
      continue;
    }
    if (H2.test(line)) {
      if (current.content.length > 0 || current.type !== "prelude") blocks.push(current);
      current = { type: "section", heading: line.replace(H2, "").trim(), content: [] };
      continue;
    }
    current.content.push(line);
  }
  if (current.content.length > 0 || current.type !== "prelude") blocks.push(current);
  if (h1) blocks.unshift({ type: "h1", text: h1, content: [] });

  return blocks.map((b) => ({
    type: b.type,
    heading: b.heading,
    text: b.text,
    content: b.content.join("\n").trim(),
  }));
}

export function extractSection(md: string, heading: string): string {
  const lines = md.split("\n");
  const target = normalizeHeading(heading);
  const startIdx = lines.findIndex((l) => H2.test(l) && normalizeHeading(l) === target);
  if (startIdx === -1) return "";
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (H2.test(lines[i] ?? "")) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

export function replaceSection(md: string, heading: string, replacement: string): string {
  const lines = md.split("\n");
  const target = normalizeHeading(heading);
  const startIdx = lines.findIndex((l) => H2.test(l) && normalizeHeading(l) === target);
  if (startIdx === -1) return md + "\n\n" + replacement;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (H2.test(lines[i] ?? "")) {
      endIdx = i;
      break;
    }
  }
  return [...lines.slice(0, startIdx), ...replacement.split("\n"), ...lines.slice(endIdx)].join("\n");
}
