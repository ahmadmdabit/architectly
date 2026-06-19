// interview.ts — Interview view with wide-screen 2-column layout.
import { el, on, delegate } from "../components/dom.ts";
import { t } from "../../i18n/index.ts";
import { answers, assumptionReview, currentQuestion, history, historyCursor, isBusy, busyLabel, showStepDots, docType as docTypeSig } from "../../core/store.ts";
import { effect } from "../../core/signal.ts";
import { progressPercent, stepNumber, totalEstimate } from "../../core/selectors.ts";
import { renderProgress } from "../components/progress.ts";
import { answerCurrent, goNext, goPrevious, jumpToAnswered, skipCurrent } from "../../services/interview/controller.ts";
import { generateDocument } from "../../actions.ts";
import type { Question } from "../../types.ts";

export function renderInterviewView(): HTMLElement {
  const wrap = el("section", { class: "interview fade-in" });
  effect(() => {
    wrap.innerHTML = "";
    const q = currentQuestion();
    if (!q) {
      wrap.appendChild(renderComplete());
      return;
    }
    wrap.appendChild(renderActive(q));
  });
  return wrap;
}

function renderActive(q: Question): HTMLElement {
  const grid = el("div", { class: "interview-grid" });

  // --- Left rail (wide screens) ---
  const rail = el("aside", { class: "interview-rail" });
  rail.appendChild(renderProgress(stepNumber(), totalEstimate(), progressPercent(), showStepDots()));
  rail.appendChild(renderRailHistory());
  grid.appendChild(rail);

  // --- Right: current question card ---
  const card = el("article", { class: "card question-card active-question", id: "question-card" });
  const meta = el("div", { class: "question-meta" });
  meta.appendChild(
    el("span", { class: "question-number" }, [
      el("span", { class: "question-number-badge" }, [String(Math.min(stepNumber(), totalEstimate()))]),
      ` ${t("interview.stepOf", { step: Math.min(stepNumber(), totalEstimate()), total: totalEstimate() })}`,
    ]),
  );
  meta.appendChild(el("span", { class: "badge" }, [q.category || "Core"]));
  if (q.priority === "high") meta.appendChild(el("span", { class: "badge badge-accent" }, [t("interview.highPriority")]));
  card.appendChild(meta);

  card.appendChild(el("h2", { class: "question-text" }, [q.text]));
  if (q.helper) card.appendChild(el("p", { class: "question-description" }, [q.helper]));

  const input = renderInputFor(q);
  card.appendChild(input);

  if (q.suggestedValue && !assumptionReview.peek()) {
    card.appendChild(
      el("div", { class: "ai-suggestion" }, [
        el("span", { class: "tag tag-assumed" }, [t("interview.aiSuggested")]),
        el("span", { class: "ai-suggestion-text" }, [q.suggestedValue]),
      ]),
    );
  }
  if (assumptionReview.peek()) {
    const review = el("div", { class: "ai-suggestion assumption-review" }, [
      el("span", { class: "tag tag-assumed" }, [t("interview.aiAssumed")]),
      el("div", { class: "ai-suggestion-text" }, [q.suggestedValue ?? ""]),
      el("div", { class: "assumption-review-hint muted small" }, [t("interview.reviewAssumptionHint")]),
    ]);
    card.appendChild(review);
  }

  const errorEl = el("div", { class: "form-error", id: `error-${q.id}` }, [el("span", {}, ["⚠"]), ` ${t("interview.requiredField")}`]);
  card.appendChild(errorEl);

  card.appendChild(renderButtons(q, input, card, errorEl));
  grid.appendChild(card);

  // History accordion below (mobile + desktop)
  const aside = el("details", { class: "history-panel", open: "" });
  aside.appendChild(el("summary", {}, [t("interview.answeredSoFar", { count: history().length })]));
  aside.appendChild(renderHistoryList(false));
  grid.appendChild(aside);

  return grid;
}

function renderRailHistory(): HTMLElement {
  const list = el("ol", { class: "rail-history" });
  for (const [i, h] of history().entries()) {
    const isActive = historyCursor() === i;
    const li = el("li", { class: `rail-history-item${isActive ? " active" : ""}`, "data-id": h.id, role: "button", tabindex: "0" });
    li.appendChild(el("span", { class: "q-num" }, [`${i + 1}.`]));
    li.appendChild(el("span", { class: "rail-q" }, [h.text]));
    if (h.assumed) li.appendChild(el("span", { class: "tag tag-assumed" }, [t("interview.aiAssumed")]));
    if (h.skipped) li.appendChild(el("span", { class: "tag tag-skipped" }, [t("interview.skipped")]));
    list.appendChild(li);
  }
  delegate(list, "click", ".rail-history-item", (_vnt, target) => {
    const id = target.getAttribute("data-id");
    if (id) void jumpToAnswered(id);
  });
  delegate(list, "keydown", ".rail-history-item", (e, target) => {
    const k = (e as KeyboardEvent).key;
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      const id = target.getAttribute("data-id");
      if (id) void jumpToAnswered(id);
    }
  });
  return list;
}

function renderHistoryList(_doesOpen: boolean): HTMLElement {
  const ol = el("ol", { class: "history-list" });
  for (const [i, h] of history().entries()) {
    const li = el("li", {});
    const q = el("div", { class: "history-q" }, [
      el("span", { class: "q-num" }, [`${i + 1}.`]),
      el("span", {}, [h.text]),
    ]);
    if (h.assumed) q.appendChild(el("span", { class: "tag tag-assumed", title: t("interview.aiAssumed") }, [t("interview.aiAssumed")]));
    if (h.skipped) q.appendChild(el("span", { class: "tag tag-skipped", title: t("interview.skipped") }, [t("interview.skipped")]));
    li.appendChild(q);
    li.appendChild(el("div", { class: `history-a ${h.skipped ? "muted" : ""}` }, [Array.isArray(h.answer) ? h.answer.join("\n· ") : h.answer]));
    ol.appendChild(li);
  }
  return ol;
}

function renderInputFor(q: Question): HTMLElement {
  switch (q.type) {
    case "long": {
      const ta = el("textarea", {
        id: "answerInput",
        class: "form-textarea",
        rows: "5",
        placeholder: q.placeholder ?? "Type your answer…",
      }) as HTMLTextAreaElement;
      ta.value = q.suggestedValue ?? "";
      autoresize(ta);
      ta.addEventListener("input", () => autoresize(ta));
      return ta;
    }
    case "text": {
      const input = el("input", {
        id: "answerInput",
        class: "form-input",
        type: "text",
        placeholder: q.placeholder ?? "Short answer",
      }) as HTMLInputElement;
      input.value = q.suggestedValue ?? "";
      return input;
    }
    case "choice": {
      const group = el("div", { class: "choice-options", id: "answerInput" });
      for (const opt of q.options ?? []) {
        const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
        const label = el("label", { class: "choice-option" });
        const radio = el("input", { type: "radio", name: q.id, value: o.value }) as HTMLInputElement;
        if (answers()[q.id] === o.value) radio.checked = true;
        const content = el("div", { class: "choice-option-content" });
        if ("icon" in o && o.icon) content.appendChild(el("div", { class: "choice-option-icon" }, [o.icon]));
        content.appendChild(el("div", { class: "choice-option-label" }, [o.label]));
        if ("desc" in o && o.desc) content.appendChild(el("div", { class: "choice-option-desc" }, [o.desc]));
        const check = el("div", { class: "choice-option-check" }, ["✓"]);
        label.append(radio, content, check);
        group.appendChild(label);
      }
      return group;
    }
    case "multi-text": {
      const container = el("div", { class: "multi-text-container", id: "answerInput" });
      const existing = answers()[q.id];
      const list = Array.isArray(existing) ? existing : existing ? [String(existing)] : [""];
      for (const v of list) container.appendChild(multiRow(v, q.placeholder ?? "", list.length === 1));
      const addBtn = el("button", { type: "button", class: "multi-text-add", id: "add-multi" }, [t("interview.addAnother")]);
      container.appendChild(addBtn);
      on(addBtn, "click", () => {
        const row = multiRow("", q.placeholder ?? "", false);
        container.insertBefore(row, addBtn);
        updateRemoveBtns(container);
        row.querySelector("input")?.focus();
      });
      delegate(container, "click", ".multi-text-remove", (_vnt, target) => {
        target.closest(".multi-text-row")?.remove();
        updateRemoveBtns(container);
      });
      delegate(container, "keydown", ".multi-text-row input", (e, target) => {
        if ((e as KeyboardEvent).key !== "Enter") return;
        e.preventDefault();
        const rows = [...container.querySelectorAll<HTMLInputElement>(".multi-text-row input")];
        const idx = rows.indexOf(target as HTMLInputElement);
        if (idx === rows.length - 1) {
          addBtn.click();
        } else {
          rows[idx + 1]?.focus();
        }
      });
      return container;
    }
  }
}

function multiRow(value: string, placeholder: string, soloHidden: boolean): HTMLElement {
  const row = el("div", { class: "multi-text-row" });
  const input = el("input", { type: "text", class: "form-input", value, placeholder }) as HTMLInputElement;
  const remove = el("button", { type: "button", class: "multi-text-remove", "aria-label": "Remove" }, ["✕"]);
  if (soloHidden) remove.style.display = "none";
  row.append(input, remove);
  return row;
}

function updateRemoveBtns(container: HTMLElement): void {
  const rows = [...container.querySelectorAll<HTMLElement>(".multi-text-row")];
  for (const r of rows) {
    const btn = r.querySelector<HTMLElement>(".multi-text-remove");
    if (btn) btn.style.display = rows.length > 1 ? "" : "none";
  }
}

function autoresize(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function flashError(card: HTMLElement, errEl: HTMLElement, input: HTMLElement): void {
  errEl.classList.add("visible");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
  if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
    input.classList.add("error");
    setTimeout(() => input.classList.remove("error"), 1200);
  }
  setTimeout(() => errEl.classList.remove("visible"), 2000);
}

function renderButtons(q: Question, input: HTMLElement, card: HTMLElement, errEl: HTMLElement): HTMLElement {
  const group = el("div", { class: "button-group" });
  const inCursorMode = historyCursor.peek() !== null;
  const atFirstAnswer = historyCursor.peek() === 0;
  const prev = el("button", {
    type: "button",
    class: "btn btn-ghost",
    disabled: isBusy() || (inCursorMode && atFirstAnswer) ? "" : null,
  }, [t("interview.previous")]);
  on(prev, "click", () => goPrevious());
  group.appendChild(prev);

  if (inCursorMode && historyCursor.peek() !== null) {
    const next = el("button", {
      type: "button",
      class: "btn btn-secondary",
      disabled: isBusy() ? "" : null,
    }, [t("interview.next")]);
    on(next, "click", () => void goNext());
    group.appendChild(el("div", { class: "button-group-right" }, [next]));
    return group;
  }

  const right = el("div", { class: "button-group-right" });
  const skip = el("button", { type: "button", class: "btn btn-secondary", disabled: isBusy() ? "" : null }, [
    isBusy() && busyLabel().includes("assum") ? t("interview.skipBusy") : t("interview.skip"),
  ]);
  on(skip, "click", () => void skipCurrent());
  right.appendChild(skip);

  const submit = el("button", { type: "button", class: "btn btn-primary btn-lg", disabled: isBusy() ? "" : null }, [
    isBusy() ? t("interview.preparing") : (assumptionReview.peek() ? t("interview.confirmAssumption") : t("interview.continue")),
  ]);
  on(submit, "click", () => {
    let value: string | string[] = readValue(q, input);
    // When reviewing an assumption with empty input, accept the suggested value.
    if (assumptionReview.peek() && typeof value === "string" && !value.trim() && q.suggestedValue) {
      value = q.suggestedValue;
    }
    if (!isValid(q, value)) {
      flashError(card, errEl, input);
      return;
    }
    void answerCurrent(value);
  });
  right.appendChild(submit);
  group.append(right);

  // Enter / Ctrl+Enter shortcut
  if (input.tagName === "TEXTAREA") {
    input.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" && (ke.ctrlKey || ke.metaKey || !ke.shiftKey)) {
        e.preventDefault();
        submit.click();
      }
    });
  } else if (input.tagName === "INPUT") {
    input.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        e.preventDefault();
        submit.click();
      }
    });
  }
  setTimeout(() => {
    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") (input as HTMLInputElement).focus();
  }, 40);

  return group;
}

function readValue(q: Question, input: HTMLElement): string | string[] {
  if (q.type === "multi-text") {
    return [...input.querySelectorAll<HTMLInputElement>(".multi-text-row input")].map((i) => i.value).filter((v) => v.trim());
  }
  if (q.type === "choice") {
    return (input.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value ?? "").trim();
  }
  return (input as HTMLInputElement | HTMLTextAreaElement).value.trim();
}

function isValid(q: Question, value: string | string[]): boolean {
  if (q.type === "multi-text") return Array.isArray(value) && value.length > 0;
  return typeof value === "string" && value.length > 0;
}

function renderComplete(): HTMLElement {
  const section = el("section", { class: "interview-complete fade-in" });
  const card = el("div", { class: "card center" });
  card.appendChild(el("div", { class: "success-icon", "aria-hidden": "true" }, ["✓"]));
  card.appendChild(el("h2", {}, [t("interview.complete")]));
  card.appendChild(el("p", { class: "muted" }, [t("interview.completeSub", { docType: docTypeSig() ?? "" })]));

  const details = el("details", { class: "history-panel", open: "" });
  details.appendChild(el("summary", {}, [t("interview.yourAnswers", { count: history().length })]));
  details.appendChild(renderHistoryList(true));
  card.appendChild(details);

  const buttons = el("div", { class: "button-group button-group--center" });
  const back = el("button", { class: "btn btn-secondary", type: "button", disabled: isBusy() ? "" : null }, [t("interview.previous")]);
  on(back, "click", () => goPrevious());
  const generate = el("button", { class: "btn btn-success btn-lg", type: "button", disabled: isBusy() ? "" : null }, [
    t("interview.generate", { docType: docTypeSig() ?? "" }),
  ]);
  on(generate, "click", () => void generateDocument());
  buttons.append(back, generate);
  card.appendChild(buttons);

  section.appendChild(card);
  return section;
}