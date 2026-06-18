// filename.ts — Unicode-safe slug + filesystem-safe filename composition.

// Characters never allowed in filenames on Windows/macOS/Linux.
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001F]/g;

export function safeFilename(rawTitle: string, ext: string): string {
  const base = (rawTitle || "document")
    .normalize("NFC")
    .replace(FORBIDDEN, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  const safe = base || "document";
  const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${safe}${cleanExt}`;
}

export function triggerDownload(filename: string, content: BlobPart, mime: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
