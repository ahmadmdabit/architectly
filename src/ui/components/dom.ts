// dom.ts — Tiny safe DOM helpers used by every view.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<Record<string, string | number | boolean | null | undefined>> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) node.append(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function htmlFragment(html: string): DocumentFragment {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content;
}

export function on<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  event: K | string,
  handler: (e: Event) => void,
): () => void {
  target.addEventListener(event, handler);
  return () => target.removeEventListener(event, handler);
}

export function delegate(root: HTMLElement, event: string, selector: string, handler: (e: Event, el: HTMLElement) => void): () => void {
  const wrapped = (e: Event): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const match = target.closest(selector) as HTMLElement | null;
    if (match && root.contains(match)) handler(e, match);
  };
  root.addEventListener(event, wrapped);
  return () => root.removeEventListener(event, wrapped);
}
