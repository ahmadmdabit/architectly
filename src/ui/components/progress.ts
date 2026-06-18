// progress.ts — Linear progress bar + optional step dots.
import { el } from "./dom.ts";
import { t } from "../../i18n/index.ts";

export function renderProgress(step: number, total: number, percent: number, showDots: boolean): HTMLElement {
  const wrap = el("div", { class: "progress-container", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(percent) });
  const header = el("div", { class: "progress-header" }, [
    el("span", { class: "progress-label" }, [t("interview.questionOf", { step: Math.min(step, total), total })]),
    el("span", { class: "progress-percent" }, [`${percent}%`]),
  ]);
  const track = el("div", { class: "progress-track" }, [
    (() => {
      const fill = el("div", { class: "progress-fill" });
      fill.style.setProperty("--progress-width", `${percent}%`);
      return fill;
    })(),
  ]);
  wrap.append(header, track);

  if (showDots && total <= 20) {
    const dots = el("div", { class: "progress-steps" });
    for (let i = 0; i < total; i++) {
      dots.appendChild(
        el("div", {
          class: `progress-step-dot ${i < step - 1 ? "completed" : ""} ${i === step - 1 ? "active" : ""}`.trim(),
        }),
      );
    }
    wrap.appendChild(dots);
  }
  return wrap;
}
