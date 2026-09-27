/**
 * Signed in sessions live in local storage, which is an external store as far as React is
 * concerned. Exposing it through useSyncExternalStore keeps the server render and the first
 * client render consistent instead of writing state from an effect.
 */
export class SessionStore<T> {
  private readonly listeners = new Set<() => void>();
  private cache: { raw: string | null; value: T | null } = { raw: null, value: null };

  constructor(private readonly storageKey: string) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Memoised so repeated renders see a stable reference, as the hook requires. */
  getSnapshot = (): T | null => {
    const raw = window.localStorage.getItem(this.storageKey);
    if (raw !== this.cache.raw) {
      this.cache = { raw, value: raw === null ? null : (JSON.parse(raw) as T) };
    }
    return this.cache.value;
  };

  getServerSnapshot = (): T | null => null;

  write(value: T | null): void {
    if (value === null) {
      window.localStorage.removeItem(this.storageKey);
    } else {
      window.localStorage.setItem(this.storageKey, JSON.stringify(value));
    }
    this.listeners.forEach((listener) => listener());
  }
}
