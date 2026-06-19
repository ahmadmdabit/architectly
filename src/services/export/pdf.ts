// export/pdf.ts — PDF via browser print-to-PDF for reliable Unicode (Arabic, Turkish, CJK) support.
// jsPDF's built-in Helvetica is WinAnsi-only and produces garbled output for non-Latin text.
// The pragmatic fix is to render a styled HTML document in a popup window and trigger print.
import { buildStandaloneHtml } from "./html.ts";
import { dirOf, currentLocale } from "../../i18n/index.ts";

export async function exportPdfFile(title: string, docType: string, doc: string): Promise<void> {
  const lang = currentLocale();
  const html = buildStandaloneHtml(title, docType, doc, new Date().toLocaleString(), dirOf(lang), lang);
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Popup blocked — please allow popups to export PDF, or use Print (Ctrl+P) instead.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = `${title} — ${docType}`;
  const trigger = (): void => {
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); } catch { /* closed */ }
    }, 300);
  };
  if (printWindow.document.readyState === "complete") trigger();
  else printWindow.addEventListener("load", trigger, { once: true });
}