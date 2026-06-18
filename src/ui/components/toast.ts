// toast.ts — Live-region toast stack subscribed to the event bus.
import { bus } from "../../core/eventBus.ts";
import { el, on } from "./dom.ts";

const ICON = { success: "✓", error: "✕", info: "ℹ" } as const;

export function mountToastStack(root: HTMLElement): void {
  const stack = el("div", { class: "toast-stack", id: "toast-stack", "aria-live": "polite", "aria-atomic": "false" });
  root.appendChild(stack);

  bus.on("toast", ({ kind, message }) => {
    const toast = el("div", { class: `toast toast--${kind}`, role: "status" }, [
      el("span", { class: "toast-icon", "aria-hidden": "true" }, [ICON[kind]]),
      el("span", { class: "toast-message" }, [message]),
      el("button", { class: "toast-close", "aria-label": "Dismiss", type: "button" }, ["✕"]),
    ]);
    stack.appendChild(toast);

    const remove = (): void => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      setTimeout(() => toast.remove(), 250);
    };
    const off = on(toast.querySelector(".toast-close")!, "click", remove);
    const timer = setTimeout(() => {
      off();
      remove();
    }, 5000);
    toast.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("toast-close")) {
        clearTimeout(timer);
        off();
      }
    });
  });
}
