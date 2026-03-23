import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { fetchJSONWithRetry, clearFetchCache } from '@/data/retryFetch';

const originalFetch = globalThis.fetch;
const originalDateNow = Date.now;

type FetchStep = Response | Error;

function jsonResponse(body: unknown, status: number = 200, statusText: string = 'OK'): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

describe('fetchJSONWithRetry', () => {
  let steps: FetchStep[] = [];

  const fetchMock = mock(async () => {
    const next = steps.shift();
    if (!next) throw new Error('Missing mocked fetch step');
    if (next instanceof Error) throw next;
    return next;
  });

  beforeEach(() => {
    steps = [];
    fetchMock.mockClear();
    clearFetchCache();
    localStorage.clear();
    Date.now = originalDateNow;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Date.now = originalDateNow;
  });

  it('retries on 429 and eventually succeeds', async () => {
    steps = [
      jsonResponse({ message: 'rate limited' }, 429, 'Too Many Requests'),
      jsonResponse({ ok: true }),
    ];

    const result = await fetchJSONWithRetry<{ ok: boolean }>(
      'https://example.com/test',
      undefined,
      { label: 'Test API', maxRetries: 4, baseDelayMs: 0, maxDelayMs: 0 },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable 4xx responses', async () => {
    steps = [
      jsonResponse({ message: 'bad request' }, 400, 'Bad Request'),
      jsonResponse({ ok: true }),
    ];

    await expect(
      fetchJSONWithRetry('https://example.com/test', undefined, {
        label: 'Test API',
        maxRetries: 4,
        baseDelayMs: 0,
        maxDelayMs: 0,
      }),
    ).rejects.toThrow('Test API 400: Bad Request');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient network failures', async () => {
    steps = [
      new Error('Network down'),
      jsonResponse({ ok: true }),
    ];

    const result = await fetchJSONWithRetry<{ ok: boolean }>(
      'https://example.com/test',
      undefined,
      { label: 'Test API', maxRetries: 4, baseDelayMs: 0, maxDelayMs: 0 },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns cached response on second call to same URL', async () => {
    steps = [jsonResponse({ val: 1 })];

    const url = 'https://example.com/cache-hit';
    const opts = { cacheTtlMs: 60_000, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
    const first = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);

    // Second call should NOT trigger fetch
    const second = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);

    expect(first.val).toBe(1);
    expect(second.val).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache when cacheTtlMs is 0', async () => {
    steps = [jsonResponse({ val: 1 }), jsonResponse({ val: 2 })];

    const url = 'https://example.com/no-cache';
    const opts = { cacheTtlMs: 0, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
    const first = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);
    const second = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);

    expect(first.val).toBe(1);
    expect(second.val).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent requests to the same URL', async () => {
    steps = [jsonResponse({ val: 42 })];

    const url = 'https://example.com/dedup';
    const opts = { cacheTtlMs: 60_000, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
    const [a, b] = await Promise.all([
      fetchJSONWithRetry<{ val: number }>(url, undefined, opts),
      fetchJSONWithRetry<{ val: number }>(url, undefined, opts),
    ]);

    expect(a.val).toBe(42);
    expect(b.val).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache failed requests', async () => {
    steps = [
      jsonResponse({ err: true }, 400, 'Bad Request'),
      jsonResponse({ ok: true }),
    ];

    const url = 'https://example.com/no-cache-err';
    const opts = { cacheTtlMs: 60_000, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };

    await expect(fetchJSONWithRetry(url, undefined, opts)).rejects.toThrow();

    const result = await fetchJSONWithRetry<{ ok: boolean }>(url, undefined, opts);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearFetchCache invalidates cached responses', async () => {
    steps = [jsonResponse({ val: 1 }), jsonResponse({ val: 2 })];

    const url = 'https://example.com/clear-cache';
    const opts = { cacheTtlMs: 60_000, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
    await fetchJSONWithRetry(url, undefined, opts);

    clearFetchCache();

    const result = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);
    expect(result.val).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the in-memory cache when its tag is over an hour old', async () => {
    steps = [jsonResponse({ val: 1 }), jsonResponse({ val: 2 })];

    const nowMock = mock(() => 0);
    Date.now = nowMock as typeof Date.now;

    const url = 'https://example.com/stale-cache';
    const opts = { cacheTtlMs: 2 * 60 * 60 * 1000, maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 };
    const first = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);

    nowMock.mockImplementation(() => 60 * 60 * 1000 + 1);

    const second = await fetchJSONWithRetry<{ val: number }>(url, undefined, opts);
    expect(first.val).toBe(1);
    expect(second.val).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
