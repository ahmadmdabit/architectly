// signal.ts — Fine-grained reactivity primitives (SolidJS-style, no Proxy).
// ~80 LOC. Used by the store and every view that needs to react to state.

type Subscriber = () => void;
let currentSubscriber: Subscriber | null = null;
let batchDepth = 0;
const pending = new Set<Subscriber>();

/** Run multiple updates and flush subscribers exactly once at the end. */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}

function flush(): void {
  const subs = [...pending];
  pending.clear();
  for (const s of subs) s();
}

export interface Signal<T> {
  (): T;
  set: (next: T | ((prev: T) => T)) => void;
  peek: () => T;
}

/** Default equality: identity for primitives; shallow for arrays. */
function defaultEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  return false;
}

/** Reactive value. Reading inside an effect/computed subscribes; writing notifies subscribers. */
export function signal<T>(initial: T, isEqual: (a: T, b: T) => boolean = defaultEqual): Signal<T> {
  let value = initial;
  const subscribers = new Set<Subscriber>();

  const read = (() => {
    if (currentSubscriber) subscribers.add(currentSubscriber);
    return value;
  }) as Signal<T>;

  read.set = (next) => {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next;
    if (isEqual(value, resolved)) return;
    value = resolved;
    if (batchDepth > 0) {
      for (const s of subscribers) pending.add(s);
    } else {
      for (const s of [...subscribers]) s();
    }
  };

  read.peek = () => value;
  return read;
}

/** Run fn outside any active tracking context. Reads do NOT subscribe the enclosing effect. */
export function untrack<T>(fn: () => T): T {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try { return fn(); } finally { currentSubscriber = prev; }
}

/** Run fn; re-run whenever any signal it reads changes. Returns a disposer. */
export function effect(fn: () => void): () => void {
  let disposed = false;
  const run: Subscriber = () => {
    if (disposed) return;
    const prev = currentSubscriber;
    currentSubscriber = run;
    try {
      fn();
    } finally {
      currentSubscriber = prev;
    }
  };
  run();
  return () => {
    disposed = true;
  };
}

/** Derived read-only signal. Recomputes lazily when its dependencies change. */
export function computed<T>(fn: () => T, isEqual: (a: T, b: T) => boolean = Object.is): Signal<T> {
  const inner = signal<T>(undefined as unknown as T, isEqual);
  effect(() => inner.set(fn()));
  const read = (() => inner()) as Signal<T>;
  read.set = () => {
    throw new Error("computed signals are read-only");
  };
  read.peek = inner.peek;
  return read;
}
