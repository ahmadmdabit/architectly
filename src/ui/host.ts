// host.ts — Mounts the shell once; swaps the view region on step/locale change.
import { effect, untrack } from "../core/signal.ts";
import { step, locale as localeSig } from "../core/store.ts";
import { clear, el } from "./components/dom.ts";
import { mountToastStack } from "./components/toast.ts";
import { mountBanner } from "./components/banner.ts";
import { renderHeader } from "./shell/header.ts";
import { renderFooter } from "./shell/footer.ts";
import { renderWelcomeView } from "./views/welcome.ts";
import { renderInterviewView } from "./views/interview.ts";
import { renderGeneratingView } from "./views/generating.ts";
import { renderResultView } from "./views/result.ts";
import { renderLibraryView } from "./views/library.ts";

export function mountApp(root: HTMLElement): void {
  clear(root);
  root.appendChild(renderHeader());

  const main = el("main", { class: "container", id: "app-content" });
  const bannerHost = el("div", { class: "banner-host" });
  main.appendChild(bannerHost);

  const viewHost = el("div", { class: "view-host" });
  main.appendChild(viewHost);
  root.appendChild(main);

  root.appendChild(renderFooter());

  const modalRoot = el("div", { class: "modal-root", id: "modal-root" });
  root.appendChild(modalRoot);

  mountToastStack(root);
  mountBanner(bannerHost);

  // Swap view when step or locale changes
  effect(() => {
    const s = step();
    void localeSig();
    // Dispatch cleanup hook for the outgoing view
    untrack(() => {
      const old = viewHost.firstChild as HTMLElement | null;
      old?.dispatchEvent(new Event("__cleanup"));
      clear(viewHost);
      switch (s) {
        case "welcome": viewHost.appendChild(renderWelcomeView()); break;
        case "interview": viewHost.appendChild(renderInterviewView()); break;
        case "generating": viewHost.appendChild(renderGeneratingView()); break;
        case "result": viewHost.appendChild(renderResultView()); break;
        case "library": viewHost.appendChild(renderLibraryView()); break;
      }
      window.scrollTo({ top: 0 });
    });
  });
}
