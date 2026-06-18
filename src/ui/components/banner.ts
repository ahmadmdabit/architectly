// banner.ts — Top-of-content error banner subscribed to the `error` signal.
import { error } from "../../core/store.ts";
import { effect } from "../../core/signal.ts";
import { clear, el, on } from "./dom.ts";

export function mountBanner(container: HTMLElement): void {
  effect(() => {
    const msg = error();
    clear(container);
    if (!msg) return;
    const banner = el("div", { class: "banner banner--error", role: "alert" }, [
      `⚠️ ${msg} `,
      el("button", { class: "banner-close", type: "button", "aria-label": "Dismiss" }, ["✕"]),
    ]);
    on(banner.querySelector("button")!, "click", () => error.set(null));
    container.appendChild(banner);
  });
}
