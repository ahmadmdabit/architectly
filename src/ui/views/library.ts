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
import { exportHtmlFile } from "../../services/export/html.ts";
import { currentLocale, dirOf } from "../../i18n/index.ts";
import type { SavedDocument } from "../../types.ts";

let openMenuId: string | null = null;

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
      case "exportHtml": {
        const lang = currentLocale();
        exportHtmlFile(item.title, item.docType, item.document, new Date(item.savedAt).toLocaleString(), dirOf(lang), lang);
        break;
      }
      case "exportPdf": {
        void import("../../actions.ts").then((a) => {
          // Reuse the PDF pipeline by temporarily loading the doc
          a.exportPdf();
        });
        break;
      }
      case "toggleMenu": {
        const menu = target.closest<HTMLElement>(".library-row")?.querySelector<HTMLElement>(".library-dropdown-menu");
        if (!menu) return;
        const isOpen = menu.classList.contains("open");
        document.querySelectorAll(".library-dropdown-menu.open").forEach((m) => m.classList.remove("open"));
        if (!isOpen) { menu.classList.add("open"); openMenuId = id; } else { openMenuId = null; }
        e.stopPropagation();
        return;
      }
    }
    // Close any open menu after action
    document.querySelectorAll(".library-dropdown-menu.open").forEach((m) => m.classList.remove("open"));
    openMenuId = null;
  });

  // Close menus when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".library-dropdown-menu.open").forEach((m) => m.classList.remove("open"));
    openMenuId = null;
  }, { once: false });

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
    for (const item of items) list.appendChild(renderRow(item));
  });

  return section;
}

function renderRow(item: SavedDocument): HTMLElement {
  const row = el("article", { class: "library-row", "data-id": item.id });
  const info = el("div", { class: "library-row-info" }, [
    el("span", { class: "library-badge" }, [item.docType]),
    el("div", { class: "library-row-text" }, [
      el("div", { class: "library-row-title" }, [item.title]),
      el("div", { class: "library-row-meta" }, [t("library.savedAt", { date: new Date(item.savedAt).toLocaleString() })]),
    ]),
  ]);
  const actions = el("div", { class: "library-row-actions" });
  actions.appendChild(button("open", t("library.open"), "btn-primary"));
  actions.appendChild(button("resume", t("library.resume"), "btn-secondary"));

  // Dropdown menu
  const dropdown = el("div", { class: "library-dropdown" });
  const trigger = el("button", {
    type: "button",
    class: "btn btn-ghost btn-sm",
    "data-action": "toggleMenu",
    "aria-label": t("library.actions"),
    "aria-haspopup": "true",
  }, ["⋯"]);
  const menu = el("div", { class: "library-dropdown-menu", role: "menu" });
  menu.append(
    menuButton("rename", t("library.rename")),
    menuButton("exportMd", t("library.exportMd")),
    menuButton("exportHtml", t("result.downloadHtml")),
    menuButton("exportPdf", t("result.downloadPdf")),
    el("div", { class: "library-dropdown-divider" }),
    menuButton("delete", t("library.delete"), "danger"),
  );
  dropdown.append(trigger, menu);
  actions.appendChild(dropdown);

  row.append(info, actions);
  return row;
}

function button(action: string, label: string, cls: string): HTMLElement {
  return el("button", { type: "button", class: `btn btn-sm ${cls}`, "data-action": action }, [label]);
}

function menuButton(action: string, label: string, variant?: "danger"): HTMLElement {
  return el("button", {
    type: "button",
    class: `library-dropdown-item${variant === "danger" ? " danger" : ""}`,
    role: "menuitem",
    "data-action": action,
  }, [label]);
}