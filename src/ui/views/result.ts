// result.ts — Generated document view: per-section refine + inline contenteditable edit.
import { el, on } from "../components/dom.ts";
import { effect } from "../../core/signal.ts";
import {
  busyLabel,
  docType as docTypeSig,
  documentMeta,
  documentText,
  editingHeading,
  history,
  isBusy,
  refineDraft,
  refineTarget,
  showRaw,
} from "../../core/store.ts";
import { renderMarkdown } from "../../services/markdown/render.ts";
import { extractHeadings, extractSection, splitByHeadings } from "../../services/markdown/sections.ts";
import { htmlToMarkdown } from "../../services/markdown/roundtrip.ts";
import { t } from "../../i18n/index.ts";
import {
  applyManualEdit,
  applyRefinement,
  beginRefine,
  cancelRefine,
  commitInlineEdit,
  copyDoc,
  endInlineEdit,
  exportDocx,
  exportHtml,
  exportMd,
  exportPdf,
  printDoc,
  saveCurrentToLibrary,
  startOver,
} from "../../actions.ts";
import { renderModal } from "../components/modal.ts";

export function renderResultView(): HTMLElement {
  const section = el("section", { class: "result-screen fade-in" });

  // Top action bar
  section.appendChild(renderActionBar());

  // Document container (subscribed)
  const container = el("div", { class: "document-container" });
  section.appendChild(container);
  effect(() => renderDocument(container));

  // Footer
  const footer = el("div", { class: "result-footer" });
  const back = el("button", { class: "btn btn-ghost", type: "button" }, [t("result.back")]);
  on(back, "click", () => startOver());
  footer.appendChild(back);
  section.appendChild(footer);

  // Refine modal (mounted into shared modal root)
  effect(() => {
    const target = refineTarget();
    const root = document.getElementById("modal-root");
    if (!root) return;
    if (!target) {
      root.innerHTML = "";
      return;
    }
    mountRefineModal(root, target.heading, target.originalContent);
  });

  // Keyboard: Cmd/Ctrl+P prints
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      printDoc();
    }
  };
  document.addEventListener("keydown", onKey);
  section.addEventListener("__cleanup", () => document.removeEventListener("keydown", onKey));

  return section;
}

function renderActionBar(): HTMLElement {
  const bar = el("div", { class: "result-actions" });
  effect(() => {
    bar.innerHTML = "";
    bar.appendChild(el("span", { class: "result-actions-title" }, [`📄 ${t("result.your", { docType: docTypeSig() ?? "" })}`]));
    bar.appendChild(el("div", { class: "result-actions-divider" }));

    const toggle = btn("btn-secondary btn-sm", showRaw() ? `👁 ${t("result.toggleRendered")}` : `</> ${t("result.toggleRaw")}`, () => showRaw.set(!showRaw.peek()));
    bar.appendChild(toggle);

    bar.append(
      btn("btn-secondary btn-sm", `📋 ${t("result.copy")}`, () => void copyDoc()),
      btn("btn-secondary btn-sm", `⬇ ${t("result.downloadMd")}`, () => void exportMd()),
      btn("btn-secondary btn-sm", `🌐 ${t("result.downloadHtml")}`, () => void exportHtml()),
      btn("btn-secondary btn-sm", `📄 ${t("result.downloadPdf")}`, () => void exportPdf()),
      btn("btn-secondary btn-sm", `📝 ${t("result.downloadDocx")}`, () => void exportDocx()),
      btn("btn-secondary btn-sm", `🖨 ${t("result.print")}`, () => printDoc()),
      btn("btn-success btn-sm", `★ ${t("result.save")}`, () => void saveCurrentToLibrary()),
      btn("btn-primary btn-sm", `+ ${t("result.new")}`, () => startOver()),
    );
  });
  return bar;
}

function btn(cls: string, label: string, click: () => void): HTMLElement {
  const b = el("button", { class: `btn ${cls}`, type: "button" }, [label]);
  on(b, "click", click);
  return b;
}

function renderDocument(container: HTMLElement): void {
  container.innerHTML = "";
  const meta = documentMeta();
  const headers = el("div", { class: "document-header" });
  headers.appendChild(
    el("span", { class: "document-type-badge" }, [
      docTypeSig() === "BRD" ? `🏢 ${t("result.docTypeBrd")}` : `📱 ${t("result.docTypePrd")}`,
    ]),
  );
  headers.appendChild(el("h1", { class: "document-title" }, [meta?.summary.title ?? "Untitled Project"]));
  headers.appendChild(
    el("p", { class: "document-meta" }, [
      t("result.metaGenerated", {
        date: meta ? new Date(meta.generatedAt).toLocaleString() : "—",
        count: history().length,
      }),
    ]),
  );
  container.appendChild(headers);

  const body = el("div", { class: "document-body", id: "doc-body" });
  if (showRaw()) {
    body.appendChild(el("pre", { class: "raw" }, [documentText()]));
  } else {
    body.appendChild(renderSections());
  }
  container.appendChild(body);
}

function renderSections(): HTMLElement {
  const root = el("div", {});
  const headings = extractHeadings(documentText());
  const blocks = splitByHeadings(documentText());
  void headings;

  for (const b of blocks) {
    if (b.type === "h1" && b.text) {
      root.appendChild(el("h1", { class: "doc-h1", id: "doc-top" }, [b.text]));
      continue;
    }
    if (b.type === "section" && b.heading) {
      root.appendChild(renderSection(b.heading, b.content));
      continue;
    }
    if (b.type === "prelude" && b.content) {
      const div = el("div", { class: "doc-prelude" });
      div.innerHTML = renderMarkdown(b.content);
      root.appendChild(div);
    }
  }
  return root;
}

function renderSection(heading: string, content: string): HTMLElement {
  const section = el("section", { class: "doc-section", id: `sec-${slug(heading)}` });
  const head = el("header", { class: "doc-section-head" });
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
  } else {
    const editBtn = el("button", { class: "btn btn-link", type: "button" }, [t("result.edit")]);
    on(editBtn, "click", () => editingHeading.set(heading));
    head.appendChild(editBtn);

    const refineBtn = el("button", { class: "btn btn-link", type: "button" }, [t("result.refine")]);
    on(refineBtn, "click", () => beginRefine(heading));
    head.appendChild(refineBtn);
  }
  section.appendChild(head);

  const body = el("div", { class: "doc-section-body" });
  if (isEditing) {
    body.setAttribute("contenteditable", "true");
    body.setAttribute("spellcheck", "true");
    body.classList.add("editing");
  }
  body.innerHTML = renderMarkdown(content);
  section.appendChild(body);
  return section;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";
}

function mountRefineModal(root: HTMLElement, heading: string, originalContent: string): void {
  const body = el("div", {});
  body.appendChild(el("label", { class: "form-label", for: "refineInput" }, [t("result.refineModal.label")]));
  const textarea = el("textarea", {
    id: "refineInput",
    class: "form-textarea",
    rows: "3",
    placeholder: t("result.refineModal.placeholder"),
  }) as HTMLTextAreaElement;
  textarea.value = refineDraft();
  textarea.addEventListener("input", () => refineDraft.set(textarea.value));
  body.appendChild(textarea);

  const details = el("details", { class: "history-panel", open: "" });
  details.appendChild(el("summary", {}, [t("result.refineModal.currentSection")]));
  // Editable raw markdown of the section, for manual save
  const sectionTa = el("textarea", { class: "form-textarea raw-section", rows: "10" }) as HTMLTextAreaElement;
  sectionTa.value = extractSection(documentText(), heading) || originalContent;
  details.appendChild(sectionTa);
  body.appendChild(details);

  const footer = el("div", { class: "modal-foot-inner" });
  const cancel = el("button", { class: "btn btn-ghost", type: "button" }, [t("result.refineModal.cancel")]);
  on(cancel, "click", () => cancelRefine());
  const saveManual = el("button", { class: "btn btn-secondary", type: "button" }, [t("result.refineModal.saveManual")]);
  on(saveManual, "click", () => applyManualEdit(sectionTa.value));
  const apply = el("button", { class: "btn btn-primary", type: "button" }, [
    isBusy() ? busyLabel() || t("result.refineModal.applying") : t("result.refineModal.apply"),
  ]);
  if (isBusy()) apply.setAttribute("disabled", "");
  on(apply, "click", () => void applyRefinement());
  footer.append(cancel, saveManual, apply);

  renderModal(root, {
    title: t("result.refineModal.title", { heading }),
    body,
    footer,
    onClose: () => cancelRefine(),
  });
}
