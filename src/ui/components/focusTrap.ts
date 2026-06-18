// focusTrap.ts — Trap Tab/Shift+Tab inside a container, restore focus on release.
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const focusables = (): HTMLElement[] => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => !n.hidden);

  const initial = focusables()[0];
  initial?.focus();

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Tab") return;
    const list = focusables();
    if (list.length === 0) return;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", onKey);
  return () => {
    container.removeEventListener("keydown", onKey);
    previous?.focus?.();
  };
}
