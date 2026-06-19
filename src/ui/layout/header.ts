// header.ts — Sticky glass header: brand + nav (lang + library + start-over).
import logoUrl from "/assets/images/logo.svg";
import { clear, el, on } from "../components/dom.ts";
import { effect } from "../../core/signal.ts";
import { step, history as historySig, documentText as documentTextSig } from "../../core/store.ts";
import { t } from "../../i18n/index.ts";
import { locale as localeSig } from "../../core/store.ts";
import { renderLangSwitch } from "./langSwitch.ts";
import { navigate } from "../../router/pathRouter.ts";
import { startOver } from "../../actions.ts";

function applyHeaderScroll(): void {
  const header = document.getElementById("app-header");
  if (header) header.classList.toggle("scrolled", window.scrollY > 10);
}

export function renderHeader(): HTMLElement {
  const header = el("header", { class: "app-header", id: "app-header" });
  const inner = el("div", { class: "container header-inner" });
  header.appendChild(inner);

  const renderInner = (): void => {
    clear(inner);
    // Brand
    const brand = el("a", { class: "brand", href: "#", "aria-label": "Architectly home" }, [
      el("span", { class: "brand-mark", "aria-hidden": "true" }, [(() => {
        const img = el("img", { src: `${logoUrl}${(process.env.NODE_ENV === "production" ? `?v=${import.meta.env.VITE_ASSET_HASH}` : ``)}`, alt: "" });
        return img;
      })()]),
      el("span", { class: "brand-name" }, [t("app.name")]),
      el("span", { class: "brand-tag" }, [t("app.tag")]),
    ]);
    on(brand, "click", (e) => {
      e.preventDefault();
      // Mirror Start Over confirmation: any in-flight work (interview answers OR generated document) requires confirmation.
      const hasWork = historySig.peek().length > 0 || documentTextSig.peek().length > 0;
      if (step.peek() !== "welcome" && hasWork) {
        if (!confirm(t("errors.confirmStartOver"))) return;
      }
      startOver();
    });
    inner.appendChild(brand);

    // Nav
    const nav = el("nav", { class: "header-nav" });
    nav.appendChild(renderLangSwitch());

    const contactLink = el("a", {
      class: "btn btn-ghost btn-sm",
      href: "https://ahmadmdabit.github.io/contact",
      target: "_blank",
      rel: "noopener noreferrer",
    }, [t("nav.contact")]);
    nav.appendChild(contactLink);
    
    const libBtn = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("nav.library")]);
    on(libBtn, "click", () => navigate("library"));
    nav.appendChild(libBtn);

    if (step.peek() !== "welcome") {
      const so = el("button", { class: "btn btn-ghost btn-sm", type: "button" }, [t("nav.startOver")]);
      on(so, "click", () => {
        if (historySig.peek().length > 0 && !confirm(t("errors.confirmNewDoc"))) return;
        startOver();
      });
      nav.appendChild(so);
    }
    inner.appendChild(nav);
  };

  effect(() => {
    // Re-render on step or locale change
    step();
    localeSig();
    renderInner();
  });

  window.addEventListener("scroll", applyHeaderScroll, { passive: true });
  return header;
}
