import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchWithRetry } from "./fetchWithRetry";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number): Response {
  return new Response(JSON.stringify({}), { status });
}

describe("fetchWithRetry", () => {
  test("returns immediately on a successful first attempt, no retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { retryDelaysMs: [1, 1] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries a 500, then succeeds on the second attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { retryDelaysMs: [1, 1] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("retries a 429 the same way as a 5xx", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(429)).mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { retryDelaysMs: [1, 1] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("gives up after maxRetries and returns the last failed response instead of throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { maxRetries: 2, retryDelaysMs: [1, 1] });

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("does not retry a 4xx — it returns on the very first attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { retryDelaysMs: [1, 1] });

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("retries a thrown network error, then succeeds", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("network down")).mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { retryDelaysMs: [1, 1] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("re-throws a network error once retries are exhausted", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://example.test", {}, { maxRetries: 1, retryDelaysMs: [1, 1] })).rejects.toThrow("network down");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("aborts a single attempt that hangs past timeoutMs, and retries it", async () => {
    const hangUntilAborted = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("The operation timed out.", "TimeoutError")));
      });
    // First attempt hangs and times out almost instantly; second attempt
    // resolves normally — proves a stuck attempt doesn't hang the whole call.
    const fetchMock = vi.fn().mockImplementationOnce(hangUntilAborted).mockImplementationOnce(async () => jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("https://example.test", {}, { timeoutMs: 10, retryDelaysMs: [1, 1] });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
