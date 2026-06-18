// export/markdown.ts
import { safeFilename, triggerDownload } from "./filename.ts";

export function exportMarkdownFile(title: string, doc: string): void {
  triggerDownload(safeFilename(title, "md"), doc, "text/markdown;charset=utf-8");
}
