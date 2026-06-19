// devNotice.ts — Development notice banner.
import { clear, el } from "./dom.ts";
import { t } from "../../i18n/index.ts";
import { effect } from "../../core/signal.ts";
import { locale as localeSig } from "../../core/store.ts";

export function renderDevNotice(): HTMLElement {
    const notice = el("div", { class: "dev-notice", role: "status" });

    const render = () => {
        clear(notice);
        const text = t("app.devNotice");
        const url = "https://github.com/ahmadmdabit/architectly/issues";

        notice.appendChild(document.createTextNode(text));
        const link = el("a", {
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "dev-notice-link"
        }, [url]);
        notice.appendChild(link);
    };

    effect(() => {
        localeSig();
        render();
    });

    return notice;
}