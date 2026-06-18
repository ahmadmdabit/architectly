// pathRouter.ts — History API router with GH Pages 404 shim restoration.
import { effect } from "../core/signal.ts";
import { step } from "../core/store.ts";
import { bus } from "../core/eventBus.ts";
import type { Step } from "../types.ts";

// `import.meta.env.BASE_URL` is injected by Vite (e.g. "/architectly/" in prod, "/" in dev).
const BASE: string = ((): string => {
  const base = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL || "/";
  return base.endsWith("/") ? base : base + "/";
})();

const ROUTES: Record<Step, string> = {
  welcome: "",
  interview: "interview",
  generating: "generating",
  result: "result",
  library: "library",
};

const PATH_TO_STEP: Record<string, Step> = {
  "": "welcome",
  interview: "interview",
  generating: "generating",
  result: "result",
  library: "library",
};

function currentPathStep(): Step {
  const raw = window.location.pathname.slice(BASE.length).replace(/\/$/, "");
  return PATH_TO_STEP[raw] ?? "welcome";
}

function urlFor(s: Step): string {
  return BASE + ROUTES[s];
}

/** Restore a deep-link path that the 404 shim stashed in sessionStorage. */
function restoreShimRedirect(): void {
  try {
    const stashed = sessionStorage.getItem("arch:redirect");
    if (!stashed) return;
    sessionStorage.removeItem("arch:redirect");
    const target = BASE.replace(/\/$/, "") + stashed;
    if (target !== window.location.pathname) {
      window.history.replaceState(null, "", target);
    }
  } catch {
    /* ignore */
  }
}

let lastUrl = "";

export function initRouter(): void {
  restoreShimRedirect();
  // Initial sync: URL → store
  const initial = currentPathStep();
  if (step.peek() !== initial) step.set(initial);
  lastUrl = window.location.pathname;

  // Browser back/forward → store
  window.addEventListener("popstate", () => {
    const s = currentPathStep();
    const from = step.peek();
    if (from !== s) {
      bus.emit("abortInflight", undefined);
      step.set(s);
      bus.emit("routeChange", { from, to: s });
    }
  });

  // Store → URL
  effect(() => {
    const s = step();
    const target = urlFor(s);
    if (target !== window.location.pathname) {
      window.history.pushState(null, "", target);
      bus.emit("routeChange", { from: lastUrl, to: target });
      lastUrl = target;
    }
  });
}

/** Programmatic navigation (used by buttons / actions). */
export function navigate(to: Step): void {
  if (step.peek() !== to) {
    bus.emit("abortInflight", undefined);
    step.set(to);
  }
}
