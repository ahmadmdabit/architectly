// langSwitch.ts — Header language dropdown.
import { el, on } from "../components/dom.ts";
import { currentLocale, setLocale, SUPPORTED } from "../../i18n/index.ts";
import { locale as localeSig } from "../../core/store.ts";
import { t } from "../../i18n/index.ts";

const NAMES: Record<string, string> = { en: "English", tr: "Türkçe", ar: "العربية" };

export function renderLangSwitch(): HTMLElement {
  const wrap = el("div", { class: "lang-switch" });
  const label = t("app.lang");
  const select = el("select", { class: "lang-select", "aria-label": label, id: "lang-select" });
  for (const code of SUPPORTED) {
    const opt = el("option", { value: code }, [NAMES[code] ?? code]);
    if (code === currentLocale()) opt.setAttribute("selected", "");
    select.appendChild(opt);
  }
  on(select, "change", async () => {
    const code = (select as HTMLSelectElement).value as (typeof SUPPORTED)[number];
    await setLocale(code);
    localeSig.set(code);
  });
  wrap.appendChild(select);
  return wrap;
}
