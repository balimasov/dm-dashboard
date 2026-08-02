/**
 * A `fetch` wrapper for calling an unreliable upstream API (the OpenAI call
 * in `/api/assistant/suggest`) — retries a transient failure (a thrown
 * network/timeout error, or a 429/5xx response) with a short backoff, and
 * aborts a single attempt that hangs past `timeoutMs` rather than letting it
 * run indefinitely. A 4xx response (bad request, bad API key, not found) is
 * returned immediately on the first attempt: retrying it can't change the
 * outcome, so doing so would only add latency to an error the caller needs
 * to see right away.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  { maxRetries = 2, timeoutMs = 45_000, retryDelaysMs = [500, 1500] }: { maxRetries?: number; timeoutMs?: number; retryDelaysMs?: number[] } = {}
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const lastAttempt = attempt === maxRetries;
    try {
      const res = await fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const retriable = res.status === 429 || res.status >= 500;
      if (res.ok || !retriable || lastAttempt) return res;
    } catch (err) {
      if (lastAttempt) throw err;
    }
    const delay = retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)];
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
