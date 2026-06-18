// export/pdf.ts — Real PDF via jspdf. Lazy-loaded chunk.
import { splitByHeadings } from "../markdown/sections.ts";
import { safeFilename, triggerDownload } from "./filename.ts";

export async function exportPdfFile(title: string, docType: string, doc: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureRoom = (lineHeight: number): void => {
    if (y + lineHeight > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeLines = (lines: string[], size: number, weight: "normal" | "bold", color: [number, number, number]): void => {
    pdf.setFont("helvetica", weight);
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    const lh = size * 1.4;
    for (const ln of lines) {
      const wrapped = pdf.splitTextToSize(ln, contentW) as string[];
      for (const w of wrapped) {
        ensureRoom(lh);
        pdf.text(w, margin, y);
        y += lh;
      }
    }
  };

  // Header
  writeLines([`${title}`], 22, "bold", [18, 18, 18]);
  writeLines([docType], 11, "normal", [120, 120, 120]);
  y += 8;

  // Body
  const blocks = splitByHeadings(doc);
  for (const b of blocks) {
    if (b.type === "h1" && b.text) {
      y += 6;
      writeLines([b.text], 18, "bold", [18, 18, 18]);
      pdf.setDrawColor(29, 185, 84);
      pdf.setLineWidth(1.2);
      pdf.line(margin, y - 4, margin + contentW, y - 4);
      y += 8;
      continue;
    }
    if (b.type === "section" && b.heading) {
      y += 10;
      writeLines([b.heading], 14, "bold", [10, 10, 10]);
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y - 4, margin + contentW, y - 4);
      y += 6;
    }
    // Render the section body as paragraphs / list items
    const lines = b.content.split("\n");
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) {
        y += 4;
        continue;
      }
      if (/^[-*]\s+/.test(l)) {
        writeLines([`• ${l.replace(/^[-*]\s+/, "")}`], 11, "normal", [40, 40, 40]);
      } else if (/^\d+\.\s+/.test(l)) {
        writeLines([l], 11, "normal", [40, 40, 40]);
      } else if (/^#{3,6}\s+/.test(l)) {
        writeLines([l.replace(/^#{3,6}\s+/, "")], 12, "bold", [25, 25, 25]);
      } else if (l.startsWith("> ")) {
        writeLines([l.slice(2)], 11, "normal", [80, 80, 80]);
      } else if (/^\|.*\|$/.test(l)) {
        // Crude table row rendering: strip pipes
        writeLines([l.replace(/\|/g, "  ")], 10, "normal", [40, 40, 40]);
      } else {
        writeLines([l.replace(/[*_`]/g, "")], 11, "normal", [40, 40, 40]);
      }
    }
  }

  const blob = pdf.output("blob");
  triggerDownload(safeFilename(title, "pdf"), blob, "application/pdf");
}
