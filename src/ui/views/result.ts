// result.ts — The final document viewer with section-level AI refinement.
import { effect } from "../../core/signal.ts";
import {
  documentText,
  documentMeta,
  editingHeading,
  history,
  docType as docTypeSig,
  isBusy,
  busyLabel,
  refineDraft,
} from "../../core/store.ts";
import { t } from "../../i18n/index.ts";
import {
  exportDocx,
  exportPdf,
  exportHtml,
  exportMd,
  printDoc,
  applyRefinement,
  beginRefine,
  cancelRefine,
  commitInlineEdit,
  copyDoc,
  endInlineEdit,
  saveCurrentToLibrary,
  startOver,
} from "../../actions.ts";
import { renderModal } from "../components/modal.ts";
import { el, on, delegate } from "../components/dom.ts";
import type { DocMeta } from "../../types.ts";
import { htmlToMarkdown } from "@/services/markdown/roundtrip.ts";
import { extractHeadings, extractSection } from "@/services/markdown/sections.ts";
import { renderMarkdown } from "@/services/markdown/render.ts";

export function renderResultView(): HTMLElement {
  const section = el("section", { class: "result fade-in" });
  effect(() => {
    section.innerHTML = "";
    renderDocument(section);
  });
  return section;
}

function renderDocument(container: HTMLElement): void {
  const meta = documentMeta();

  const actions = el("div", { class: "result-actions" });
  actions.appendChild(
    el("div", { class: "result-actions-bar" }, [
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "copy" }, [t("result.copy")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "print" }, [t("result.print")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "export-md" }, [t("result.downloadMd")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "export-html" }, [t("result.downloadHtml")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "export-pdf" }, [t("result.downloadPdf")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "export-docx" }, [t("result.downloadDocx")]),
    ]),
  );
  actions.querySelector(".result-actions-bar")!.appendChild(
    el("button", { class: "btn btn-secondary btn-sm", type: "button", "data-action": "save" }, [t("result.save")]),
  );
  actions.querySelector(".result-actions-bar")!.appendChild(
    el("button", { class: "btn btn-secondary btn-sm", type: "button", "data-action": "new" }, [t("result.newDocument")]),
  );
  delegate(actions, "click", "[data-action]", (_vnt, target) => {
    const a = target.getAttribute("data-action");
    if (a === "copy") void copyDoc();
    else if (a === "print") void printDoc();
    else if (a === "export-md") void exportMd();
    else if (a === "export-html") void exportHtml();
    else if (a === "export-pdf") void exportPdf();
    else if (a === "export-docx") void exportDocx();
    else if (a === "save") void saveCurrentToLibrary();
    else if (a === "new") startOver();
  });
  container.appendChild(actions);

  const headers = el("div", { class: "document-header" });
  headers.appendChild(
    el("span", { class: "document-type-badge" }, [
      docTypeSig() === "BRD" ? `🏢 ${t("result.docTypeBrd")}` : `📱 ${t("result.docTypePrd")}`,
    ]),
  );
  headers.appendChild(renderEditableTitle(meta?.summary.title ?? "Untitled Project"));
  headers.appendChild(renderEditableMeta(meta));
  container.appendChild(headers);

  const body = el("div", { class: "document-body", id: "doc-body" });
  const headings = extractHeadings(documentText());
  const sections = documentText().split(/(?=^## )/m).slice(1);
  if (headings.length === 0) {
    body.appendChild(el("p", { class: "muted" }, ["No structured content yet."]));
  } else {
    for (let i = 0; i < headings.length; i++) {
      const content = sections[i] ?? "";
      body.appendChild(renderSection(headings[i]!, content));
    }
  }
  container.appendChild(body);

  const footer = el("div", { class: "result-footer" });
  footer.appendChild(
    el("div", { class: "result-actions-bar", style: "justify-content: center;" }, [
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "new" }, [t("result.newDocument")]),
      el("button", { class: "btn btn-ghost btn-sm", type: "button", "data-action": "save" }, [t("result.save")]),
    ]),
  );
  container.appendChild(footer);
}

function renderEditableTitle(initial: string): HTMLElement {
  const h1 = el("h1", { class: "document-title inline-editable" });
  const render = (): void => {
    h1.innerHTML = "";
    const span = el("span", { class: "inline-edit-value" }, [documentMeta.peek()?.summary.title ?? initial]);
    h1.appendChild(span);
    const btn = el("button", { class: "btn btn-link inline-edit-trigger", type: "button", "aria-label": t("result.edit") }, ["✎"]);
    h1.appendChild(btn);
    on(btn, "click", () => startInlineEdit(h1, span, (newVal) => {
      const m = documentMeta.peek();
      if (m) {
        documentMeta.set({ ...m, summary: { ...m.summary, title: newVal } });
        const text = documentText.peek();
        const firstLine = text.split("\n")[0] ?? "";
        if (firstLine.startsWith("# ")) {
          documentText.set(`# ${newVal}\n${text.slice(firstLine.length + 1)}`);
        }
      }
    }));
  };
  render();
  return h1;
}

function renderEditableMeta(meta: DocMeta | null): HTMLElement {
  const p = el("p", { class: "document-meta inline-editable" });
  const span = el("span", { class: "inline-edit-value" }, [
    meta ? t("result.metaGenerated", { date: new Date(meta.generatedAt).toLocaleString(), count: history().length }) : "",
  ]);
  p.appendChild(span);
  return p;
}

function startInlineEdit(host: HTMLElement, span: HTMLElement, onCommit: (v: string) => void): void {
  const original = span.textContent ?? "";
  host.classList.add("editing");
  const input = el("input", { type: "text", class: "form-input inline-edit-input", value: original }) as HTMLInputElement;
  const ok = el("button", { class: "btn btn-primary btn-sm", type: "button" }, ["✓"]);
  const cancel = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("result.refineModal.cancel")]);
  span.replaceWith(input);
  const btnHolder = host.querySelector(".inline-edit-trigger");
  btnHolder?.replaceWith(ok, cancel);
  input.focus();
  input.select();
  const finish = (commit: boolean): void => {
    const newSpan = el("span", { class: "inline-edit-value" }, [commit && input.value.trim() ? input.value.trim() : original]);
    input.replaceWith(newSpan);
    const newBtn = el("button", { class: "btn btn-link inline-edit-trigger", type: "button", "aria-label": t("result.edit") }, ["✎"]);
    ok.replaceWith(newBtn);
    cancel.remove();
    host.classList.remove("editing");
    on(newBtn, "click", () => startInlineEdit(host, newSpan, onCommit));
    if (commit && input.value.trim() && input.value.trim() !== original) onCommit(input.value.trim());
  };
  on(ok, "click", () => finish(true));
  on(cancel, "click", () => finish(false));
  on(input, "keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    if (k === "Enter") { e.preventDefault(); finish(true); }
    else if (k === "Escape") { e.preventDefault(); finish(false); }
  });
}

function renderSection(heading: string, content: string): HTMLElement {
  const section = el("section", { class: "doc-section", id: heading.replace(/\s+/g, "-").toLowerCase() });

  const head = el("div", { class: "doc-section-head" });
  head.appendChild(el("h2", {}, [heading]));

  const isEditing = editingHeading() === heading;
  if (isEditing) {
    const done = el("button", { class: "btn btn-link", type: "button" }, [t("result.doneEdit")]);
    on(done, "click", () => {
      const body = section.querySelector<HTMLElement>(".doc-section-body");
      if (body) {
        const md = htmlToMarkdown(body);
        const reconstructed = `## ${heading}\n\n${md.trim()}\n`;
        commitInlineEdit(heading, reconstructed);
      } else {
        endInlineEdit();
      }
    });
    head.appendChild(done);
    const cancel = el("button", { class: "btn btn-link", type: "button" }, [t("result.refineModal.cancel")]);
    on(cancel, "click", () => endInlineEdit());
    head.appendChild(cancel);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") { endInlineEdit(); document.removeEventListener("keydown", onKey); }
    };
    document.addEventListener("keydown", onKey);
  } else {
    const editBtn = el("button", { class: "btn btn-link", type: "button" }, [t("result.edit")]);
    on(editBtn, "click", () => editingHeading.set(heading));
    head.appendChild(editBtn);

    const refineBtn = el("button", { class: "btn btn-link", type: "button" }, [t("result.refine")]);
    on(refineBtn, "click", () => {
      const el = section.querySelector<HTMLElement>(".doc-section-body");
      if (el) mountRefineModal(section, heading, htmlToMarkdown(el));
    });
    head.appendChild(refineBtn);
  }
  section.appendChild(head);

  const body = el("div", { class: "doc-section-body", contenteditable: isEditing ? "plaintext-only" : undefined });
  if (isEditing) {
    body.textContent = content.replace(/^## .+\n\n/, "");
  } else {
    body.innerHTML = renderMarkdown(content);
  }
  section.appendChild(body);
  return section;
}

function mountRefineModal(root: HTMLElement, heading: string, originalContent: string): void {
  const promptLabel = el("label", { for: "refine-prompt" }, [t("result.refineModal.promptLabel")]);
  const textarea = el("textarea", {
    id: "refine-prompt",
    class: "form-textarea",
    rows: "3",
    placeholder: t("result.refineModal.promptPlaceholder"),
  }) as HTMLTextAreaElement;

  beginRefine(heading);
  const body = el("div", { class: "refine-modal-body" });
  body.appendChild(promptLabel);
  textarea.addEventListener("input", () => refineDraft.set(textarea.value));
  body.appendChild(textarea);

  // Read-only preview of the current section content (no manual save).
  const preview = el("details", { class: "history-panel" });
  preview.appendChild(el("summary", {}, [t("result.refineModal.currentSection")]));
  const sectionTa = el("textarea", {
    class: "form-textarea raw-section",
    rows: "10",
    readonly: "",
    "aria-readonly": "true",
  }) as HTMLTextAreaElement;
  sectionTa.value = extractSection(documentText(), heading) || originalContent;
  preview.appendChild(sectionTa);
  body.appendChild(preview);

  const footer = el("div", { class: "modal-foot-inner" });
  const cancel = el("button", { class: "btn btn-ghost", type: "button" }, [t("result.refineModal.cancel")]);
  on(cancel, "click", () => cancelRefine());
  const apply = el("button", { class: "btn btn-primary", type: "button" }, [
    isBusy() ? busyLabel() || t("result.refineModal.applying") : t("result.refineModal.apply"),
  ]);
  if (isBusy()) apply.setAttribute("disabled", "");
  on(apply, "click", () => void applyRefinement());
  footer.append(cancel, apply);

  renderModal(root, {
    title: t("result.refineModal.title", { heading }),
    body,
    footer,
    onClose: () => cancelRefine(),
    closeOnBackdrop: false,
  });
}