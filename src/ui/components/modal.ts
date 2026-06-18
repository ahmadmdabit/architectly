// modal.ts — Render a modal dialog with focus trap and Esc-to-close.
import { trapFocus } from "./focusTrap.ts";
import { clear, el, on } from "./dom.ts";

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  footer: HTMLElement;
  onClose: () => void;
  ariaLabel?: string;
}

export function renderModal(root: HTMLElement, opts: ModalOptions): () => void {
  clear(root);
  const backdrop = el("div", { class: "modal-backdrop", "aria-hidden": "true" });
  const dialog = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title" });
  const head = el("header", { class: "modal-head" }, [
    el("h3", { id: "modal-title" }, [opts.title]),
    el("button", { class: "btn btn-ghost btn-sm", type: "button", "aria-label": "Close" }, ["✕"]),
  ]);
  const body = el("div", { class: "modal-body" }, [opts.body]);
  const foot = el("footer", { class: "modal-foot" }, [opts.footer]);
  dialog.append(head, body, foot);
  root.append(backdrop, dialog);

  const releaseTrap = trapFocus(dialog);

  const close = (): void => {
    releaseTrap();
    offBackdrop();
    offClose();
    offEsc();
    clear(root);
    opts.onClose();
  };

  const offBackdrop = on(backdrop, "click", close);
  const offClose = on(head.querySelector("button")!, "click", close);
  const offEsc = on(document, "keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape") close();
  });

  return close;
}
