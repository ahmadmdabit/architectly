// generating.ts — Live streaming preview + 4-step animation chrome + cancel.
import { el, on } from "../components/dom.ts";
import { effect } from "../../core/signal.ts";
import { busyLabel, docType as docTypeSig, streamBuffer } from "../../core/store.ts";
import { t } from "../../i18n/index.ts";
import { renderMarkdown } from "../../services/markdown/render.ts";
import { cancelGeneration } from "../../actions.ts";

const STEP_DELAYS = [0, 1500, 3000, 4500];
const STEP_IDS = ["organize", "structure", "write", "finalize"] as const;

export function renderGeneratingView(): HTMLElement {
  const section = el("section", { class: "generating-screen fade-in" });

  const anim = el("div", { class: "generating-animation" }, [
    el("div", { class: "generating-spinner" }),
    el("div", { class: "generating-icon" }, ["🤖"]),
  ]);
  section.appendChild(anim);

  const title = el("h2", { class: "generating-title" }, [t("generating.title")]);
  section.appendChild(title);
  effect(() => {
    title.textContent = busyLabel() || t("generating.title");
  });

  section.appendChild(el("p", { class: "generating-subtitle" }, [t("generating.sub", { docType: docTypeSig() ?? "" })]));

  // 4-step progress chrome
  const progress = el("div", { class: "generating-progress" });
  for (const id of STEP_IDS) {
    progress.appendChild(
      el("div", { class: "generating-step", id: `gen-step-${id}` }, [
        el("span", { class: "generating-step-icon" }, ["•"]),
        el("span", { class: "generating-step-label" }, [t(`generating.steps.${id}`)]),
      ]),
    );
  }
  section.appendChild(progress);

  // Animate the steps
  const timers: number[] = [];
  STEP_IDS.forEach((id, i) => {
    timers.push(
      window.setTimeout(() => document.getElementById(`gen-step-${id}`)?.classList.add("active"), STEP_DELAYS[i]),
      window.setTimeout(() => document.getElementById(`gen-step-${id}`)?.classList.add("completed"), (STEP_DELAYS[i] ?? 0) + 2000),
    );
  });

  // Streaming preview
  const preview = el("div", { class: "generating-preview", "aria-live": "polite", "aria-busy": "true" });
  const previewTitle = el("div", { class: "generating-preview-title" }, [t("generating.streamingLabel")]);
  const previewBody = el("div", { class: "generating-preview-body" });
  preview.append(previewTitle, previewBody);
  section.appendChild(preview);
  // Throttle preview repaint to one frame to avoid O(n^2) markdown re-renders.
  let rafPending = false;
  effect(() => {
    streamBuffer(); // subscribe
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(() => {
      rafPending = false;
      previewBody.innerHTML = renderMarkdown(streamBuffer.peek());
      previewBody.scrollTop = previewBody.scrollHeight;
    });
  });

  // Cancel
  const cancel = el("button", { class: "btn btn-ghost", type: "button" }, [t("generating.cancel")]);
  on(cancel, "click", () => cancelGeneration());
  section.appendChild(cancel);

  // Cleanup timers on unmount: caller replaces innerHTML, but ensure GC
  section.addEventListener("__cleanup", () => timers.forEach((t) => clearTimeout(t)));
  return section;
}
