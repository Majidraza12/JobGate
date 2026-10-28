// Contact (email or repo URL) comes from the environment so it isn't hardcoded.
const contact = process.env.JOBGATE_CONTACT;
export const USER_AGENT = `JobGate/0.1 (student project${contact ? `; ${contact}` : ""})`;

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

// GET a JSON document with an honest User-Agent, a timeout, and exponential
// backoff on transient failures. Non-retryable statuses fail immediately.
export async function fetchJson(url: string, { attempts = 3, timeoutMs = 60_000 } = {}): Promise<unknown> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await res.json();
      lastError = new Error(`GET ${url} returned ${res.status}`);
      if (!RETRYABLE.has(res.status)) break;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
