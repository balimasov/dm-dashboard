const listeners = new Set<() => void>();
let pendingCount = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

/** For `GlobalLoadingIndicator`'s `useSyncExternalStore` — not meant to be called directly elsewhere. */
export function subscribeToPendingRequests(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingRequestsSnapshot(): boolean {
  return pendingCount > 0;
}

/**
 * Every request this app makes to its own `/api/*` routes goes through this
 * instead of a bare `fetch`, so the global loading indicator can track it —
 * an explicit opt-in call site by call site, rather than patching the
 * browser's global `window.fetch`.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  pendingCount++;
  notify();
  try {
    return await fetch(input, init);
  } finally {
    pendingCount--;
    notify();
  }
}

export async function parseJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error || fallbackMessage);
  }
  return data as T;
}
