// library.ts — IndexedDB library view: search + open/resume/rename/delete/export-MD.
import { el, on, delegate } from "../components/dom.ts";
import { effect } from "../../core/signal.ts";
import { library, librarySearch } from "../../core/store.ts";
import { searchLocal } from "../../services/storage/library.ts";
import { t } from "../../i18n/index.ts";
import {
  deleteFromLibrary,
  openFromLibrary,
  refreshLibrary,
  renameInLibrary,
  resumeFromLibrary,
  startOver,
} from "../../actions.ts";
import { exportMarkdownFile } from "../../services/export/markdown.ts";

export function renderLibraryView(): HTMLElement {
  void refreshLibrary();
  const section = el("section", { class: "library-screen fade-in" });

  // Header
  const head = el("div", { class: "library-header" });
  head.appendChild(
    el("div", {}, [
      el("h2", { class: "library-title" }, [t("library.title")]),
      el("p", { class: "library-sub muted" }, [t("library.sub")]),
    ]),
  );
  const newBtn = el("button", { class: "btn btn-primary btn-sm", type: "button" }, [t("library.newDocument")]);
  on(newBtn, "click", () => startOver());
  head.appendChild(newBtn);
  section.appendChild(head);

  // Search
  const search = el("input", {
    type: "search",
    class: "form-input library-search",
    placeholder: t("library.search"),
    "aria-label": t("library.search"),
  }) as HTMLInputElement;
  search.value = librarySearch();
  search.addEventListener("input", () => librarySearch.set(search.value));
  section.appendChild(search);

  // List (subscribed)
  const list = el("div", { class: "library-list" });
  section.appendChild(list);

  // Delegated row actions
  delegate(list, "click", "[data-action]", (e, target) => {
    const id = target.closest<HTMLElement>("[data-id]")?.getAttribute("data-id");
    if (!id) return;
    const action = target.getAttribute("data-action");
    const item = library().find((d) => d.id === id);
    if (!item) return;
    e.preventDefault();
    switch (action) {
      case "open":
        void openFromLibrary(id);
        break;
      case "resume":
        void resumeFromLibrary(id);
        break;
      case "rename": {
        const next = prompt(t("library.renamePrompt"), item.title);
        if (next && next.trim() && next.trim() !== item.title) void renameInLibrary(id, next.trim());
        break;
      }
      case "delete":
        if (confirm(t("library.deleteConfirm"))) void deleteFromLibrary(id);
        break;
      case "exportMd":
        exportMarkdownFile(item.title, item.document);
        break;
    }
  });

  effect(() => {
    const items = searchLocal(library(), librarySearch());
    list.innerHTML = "";
    if (items.length === 0) {
      list.appendChild(
        el("div", { class: "library-empty muted" }, [
          library().length === 0 ? t("library.empty") : t("library.noResults"),
        ]),
      );
      return;
    }
    for (const item of items) list.appendChild(renderRow(item.id, item.docType, item.title, item.savedAt));
  });

  return section;
}

function renderRow(id: string, type: string, title: string, savedAt: string): HTMLElement {
  const row = el("article", { class: "library-row", "data-id": id });
  const info = el("div", { class: "library-row-info" }, [
    el("span", { class: "library-badge" }, [type]),
    el("div", { class: "library-row-text" }, [
      el("div", { class: "library-row-title" }, [title]),
      el("div", { class: "library-row-meta" }, [t("library.savedAt", { date: new Date(savedAt).toLocaleString() })]),
    ]),
  ]);
  const actions = el("div", { class: "library-row-actions" }, [
    button("open", t("library.open"), "btn-primary"),
    button("resume", t("library.resume"), "btn-secondary"),
    button("rename", t("library.rename"), "btn-ghost"),
    button("exportMd", t("library.exportMd"), "btn-ghost"),
    button("delete", t("library.delete"), "btn-ghost btn-danger"),
  ]);
  row.append(info, actions);
  return row;
}

function button(action: string, label: string, cls: string): HTMLElement {
  return el("button", { type: "button", class: `btn btn-sm ${cls}`, "data-action": action }, [label]);
}
