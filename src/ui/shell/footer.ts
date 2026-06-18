// footer.ts
import { clear, el } from "../components/dom.ts";
import { effect } from "../../core/signal.ts";
import { locale as localeSig } from "../../core/store.ts";
import { t } from "../../i18n/index.ts";

export function renderFooter(): HTMLElement {
  const footer = el("footer", { class: "app-footer" });
  const inner = el("div", { class: "container footer-inner" });
  footer.appendChild(inner);
  effect(() => {
    localeSig();
    clear(inner);
    inner.appendChild(el("span", { class: "footer-meta" }, [t("app.footer")]));
  });
  return footer;
}
