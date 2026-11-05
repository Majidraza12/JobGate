// A tiny in-memory cache for data that is the same for every signed-in user
// (open listings and their requirements). Kept in the server process, so it
// survives between requests on a warm server. Stores the promise, so requests
// that arrive while a load is running share it instead of starting their own.
// A failed load is dropped, so the next request tries again.
type Entry = { at: number; value: Promise<unknown> };
const store = new Map<string, Entry>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>, now: () => number = Date.now): Promise<T> {
  const hit = store.get(key);
  if (hit && now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: now(), value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

export function clearMemo() {
  store.clear();
}
