// welcome.ts
import { el, on } from "../components/dom.ts";
import { t } from "../../i18n/index.ts";
import { library, locale as localeSig } from "../../core/store.ts";
import { startInterview, loadSample } from "../../services/interview/controller.ts";
import { SAMPLES } from "../../services/samples.ts";
import { navigate } from "../../router/pathRouter.ts";
import { openFromLibrary, refreshLibrary } from "../../actions.ts";

export function renderWelcomeView(): HTMLElement {
  // Lazy refresh library on mount
  void refreshLibrary();

  const section = el("section", { class: "welcome fade-in", id: "welcome" });
  const grid = el("div", { class: "welcome-grid" });

  // --- Copy column ---
  const copy = el("div", { class: "welcome-copy" });
  copy.appendChild(el("span", { class: "eyebrow" }, [t("welcome.eyebrow")]));

  const titleEl = el("h1", { class: "welcome-title" });
  const titleHtml = t("welcome.title", { grad: `__GRAD__` }).replace(
    "__GRAD__",
    `<span class="grad">${escapeHtml(t("welcome.gradWord"))}</span>`,
  );
  titleEl.innerHTML = titleHtml;
  copy.appendChild(titleEl);
  copy.appendChild(el("p", { class: "welcome-sub" }, [t("welcome.sub")]));

  const features = el("div", { class: "welcome-features" });
  features.append(
    feature("🎯", t("welcome.features.guidedTitle"), t("welcome.features.guidedDesc")),
    feature("🤖", t("welcome.features.aiTitle"), t("welcome.features.aiDesc")),
    feature("✏️", t("welcome.features.editTitle"), t("welcome.features.editDesc")),
  );
  copy.appendChild(features);

  // Resume card (most recent doc)
  const recent = library().slice(0, 1)[0];
  if (recent) {
    const resume = el("div", { class: "resume-card" });
    const info = el("div", { class: "resume-info" }, [
      el("span", { class: "resume-badge" }, [recent.docType]),
      el("div", {}, [
        el("div", { class: "resume-title" }, [recent.title]),
        el("div", { class: "resume-meta" }, [t("library.savedAt", { date: new Date(recent.savedAt).toLocaleString() })]),
      ]),
    ]);
    const open = el("button", { class: "btn btn-primary btn-sm", type: "button" }, [t("welcome.openLast")]);
    on(open, "click", () => void openFromLibrary(recent.id));
    const lib = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("welcome.openLibrary")]);
    on(lib, "click", () => navigate("library"));
    resume.append(info, open, lib);
    copy.appendChild(resume);
  }

  copy.appendChild(el("div", { class: "welcome-cta" }, [el("span", { class: "welcome-meta" }, [t("welcome.meta")])]));

  // --- Picker column ---
  const picker = el("div", { class: "welcome-picker" });
  picker.appendChild(el("h3", { class: "picker-title" }, [t("welcome.pickerTitle")]));
  picker.appendChild(el("p", { class: "picker-sub" }, [t("welcome.pickerSub")]));

  const pgrid = el("div", { class: "picker-grid" });
  pgrid.append(
    pickerCard("📱", t("welcome.prdLabel"), t("welcome.prdName"), t("welcome.prdDesc"), t("welcome.startPRD"), () => {
      startInterview("PRD");
      navigate("interview");
    }),
    pickerCard("🏢", t("welcome.brdLabel"), t("welcome.brdName"), t("welcome.brdDesc"), t("welcome.startBRD"), () => {
      startInterview("BRD");
      navigate("interview");
    }),
  );
  picker.appendChild(pgrid);

  const sample = el("div", { class: "picker-sample" });
  sample.appendChild(el("span", { class: "muted small" }, [t("welcome.exploring")]));
  const tryPrd = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("welcome.tryPRD")]);
  on(tryPrd, "click", () => {
    loadSample("PRD", SAMPLES.PRD);
    navigate("interview");
  });
  const tryBrd = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("welcome.tryBRD")]);
  on(tryBrd, "click", () => {
    loadSample("BRD", SAMPLES.BRD);
    navigate("interview");
  });
  sample.append(tryPrd, tryBrd);
  picker.appendChild(sample);

  // touch the localeSig to ensure the wrapper re-renders on language change
  void localeSig;

  grid.append(copy, picker);
  section.appendChild(grid);
  return section;
}

function feature(icon: string, title: string, desc: string): HTMLElement {
  return el("div", { class: "welcome-feature" }, [
    el("div", { class: "welcome-feature-icon" }, [icon]),
    el("div", { class: "welcome-feature-title" }, [title]),
    el("div", { class: "welcome-feature-desc" }, [desc]),
  ]);
}

function pickerCard(icon: string, label: string, name: string, desc: string, cta: string, action: () => void): HTMLElement {
  const card = el("button", { class: "picker-card", type: "button", "aria-label": name }, [
    el("div", { class: "picker-icon" }, [icon]),
    el("div", { class: "picker-label" }, [label]),
    el("div", { class: "picker-name" }, [name]),
    el("div", { class: "picker-desc" }, [desc]),
    el("span", { class: "picker-cta" }, [cta]),
  ]);
  on(card, "click", action);
  return card;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
