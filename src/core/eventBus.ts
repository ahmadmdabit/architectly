// eventBus.ts — Tiny typed pub/sub for cross-cutting concerns (toasts, route changes, aborts).

type Listener<T> = (payload: T) => void;

export class Bus<EventMap extends Record<string, unknown>> {
  private map = new Map<keyof EventMap, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    const set = this.map.get(event)!;
    set.add(fn as Listener<unknown>);
    return () => set.delete(fn as Listener<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of [...set]) (fn as Listener<EventMap[K]>)(payload);
  }
}

export type AppEvents = {
  toast: { kind: "info" | "success" | "error"; message: string };
  routeChange: { from: string; to: string };
  abortInflight: void;
} & Record<string, unknown>;

export const bus = new Bus<AppEvents>();
