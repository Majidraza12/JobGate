// Fetches one listing's job description politely: robots.txt is checked for
// every host we touch (API hosts and redirect targets included), requests to
// one host are spaced out, and transient failures are retried with backoff.
// Never throws; every outcome maps to a jd_fetch_status.

import robotsParser from "robots-parser";
import { USER_AGENT } from "../http";
import { planFetch, type JdTarget, type Plan } from "./plans";
import { cleanText, MIN_JD_CHARS, sha256 } from "./text";

export type JdFetchStatus = "ok" | "robots_disallowed" | "blocked" | "not_found" | "unsupported" | "empty" | "error";

export interface JdFetchResult {
  kind: string;
  status: JdFetchStatus;
  text?: string;
  hash?: string;
  error?: string;
}

export interface FetcherOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  minDelayMs?: number; // between requests to the same host
  maxCrawlDelayMs?: number; // cap on a robots.txt Crawl-delay
  attempts?: number;
  timeoutMs?: number;
}

const ROBOTS_TOKEN = "JobGate";
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const MAX_REDIRECTS = 5;

type Robots = { allowed(url: string): boolean; crawlDelayMs: number };
const ALLOW_ALL: Robots = { allowed: () => true, crawlDelayMs: 0 };
const DISALLOW_ALL: Robots = { allowed: () => false, crawlDelayMs: 0 };

class Failure extends Error {
  constructor(readonly status: JdFetchStatus, message: string) {
    super(message);
  }
}

export class JdFetcher {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly minDelayMs: number;
  private readonly maxCrawlDelayMs: number;
  private readonly attempts: number;
  private readonly timeoutMs: number;
  private readonly robots = new Map<string, Promise<Robots>>();
  // Tail of each host's request chain, so requests to one host run one at a
  // time with a gap, while different hosts proceed in parallel.
  private readonly hostQueue = new Map<string, Promise<void>>();
  // Responses of shared plans (an Ashby board covers every job on it), fetched
  // once per run.
  private readonly bodies = new Map<string, Promise<{ body: unknown; finalUrl: string }>>();

  constructor(o: FetcherOptions = {}) {
    this.fetchImpl = o.fetchImpl ?? fetch;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.minDelayMs = o.minDelayMs ?? 1000;
    this.maxCrawlDelayMs = o.maxCrawlDelayMs ?? 10_000;
    this.attempts = o.attempts ?? 3;
    this.timeoutMs = o.timeoutMs ?? 30_000;
  }

  async fetch(target: JdTarget): Promise<JdFetchResult> {
    let plan: Plan;
    try {
      plan = planFetch(target);
    } catch (e) {
      return { kind: target.ats ?? "other", status: "unsupported", error: String(e) };
    }
    try {
      let memo = plan.shared ? this.bodies.get(plan.url) : undefined;
      if (!memo) {
        memo = this.download(plan);
        if (plan.shared) this.bodies.set(plan.url, memo);
      }
      const { body, finalUrl } = await memo;
      const extracted = plan.extract(body, finalUrl);
      if (extracted === null) return { kind: plan.kind, status: "not_found", error: "posting not in response" };
      const text = cleanText(extracted);
      if (text.length < MIN_JD_CHARS) return { kind: plan.kind, status: "empty", error: `${text.length} chars` };
      return { kind: plan.kind, status: "ok", text, hash: sha256(text) };
    } catch (e) {
      if (e instanceof Failure) return { kind: plan.kind, status: e.status, error: e.message };
      return { kind: plan.kind, status: "error", error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async download(plan: Plan): Promise<{ body: unknown; finalUrl: string }> {
    let url = plan.url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const robots = await this.robotsFor(url);
      if (!robots.allowed(url)) throw new Failure("robots_disallowed", `robots.txt disallows ${url}`);
      const res = await this.request(url, plan.accept, robots.crawlDelayMs);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Failure("error", `${res.status} without Location`);
        url = new URL(loc, url).toString();
        continue;
      }
      if (res.status === 401 || res.status === 403) throw new Failure("blocked", `GET ${url} returned ${res.status}`);
      if (res.status === 404 || res.status === 410) throw new Failure("not_found", `GET ${url} returned ${res.status}`);
      if (!res.ok) throw new Failure("error", `GET ${url} returned ${res.status}`);
      if (plan.accept === "json") return { body: await res.json(), finalUrl: url };
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("html")) throw new Failure("unsupported", `content-type ${type || "missing"}`);
      return { body: await res.text(), finalUrl: url };
    }
    throw new Failure("error", `more than ${MAX_REDIRECTS} redirects`);
  }

  // One GET with retries on transient failures. Redirects are returned, not
  // followed, so the caller can check robots.txt for the next host.
  private async request(url: string, accept: "json" | "html", crawlDelayMs: number): Promise<Response> {
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: accept === "json" ? "application/json" : "text/html,application/xhtml+xml",
    };
    let last: unknown;
    for (let i = 0; i < this.attempts; i++) {
      if (i > 0) await this.sleep(1000 * 2 ** i);
      try {
        const res = await this.polite(url, crawlDelayMs, () =>
          this.fetchImpl(url, { headers, redirect: "manual", signal: AbortSignal.timeout(this.timeoutMs) }),
        );
        if (!RETRYABLE.has(res.status)) return res;
        last = new Failure("error", `GET ${url} returned ${res.status}`);
      } catch (e) {
        last = e;
      }
    }
    throw last;
  }

  private polite<T>(url: string, crawlDelayMs: number, run: () => Promise<T>): Promise<T> {
    const host = new URL(url).host;
    const gap = Math.max(this.minDelayMs, Math.min(crawlDelayMs, this.maxCrawlDelayMs));
    const prev = this.hostQueue.get(host);
    const result = (prev ? prev.then(() => this.sleep(gap)) : Promise.resolve()).then(run);
    this.hostQueue.set(
      host,
      result.then(
        () => undefined,
        () => undefined,
      ),
    );
    return result;
  }

  private robotsFor(url: string): Promise<Robots> {
    const origin = new URL(url).origin;
    let r = this.robots.get(origin);
    if (!r) {
      r = this.loadRobots(origin);
      this.robots.set(origin, r);
    }
    return r;
  }

  // RFC 9309: a 4xx robots.txt means no rules apply; a 5xx or an unreachable
  // server means assume everything is disallowed.
  private async loadRobots(origin: string): Promise<Robots> {
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const res = await this.polite(robotsUrl, 0, () =>
        this.fetchImpl(robotsUrl, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(this.timeoutMs),
        }),
      );
      if (res.status >= 400 && res.status < 500) return ALLOW_ALL;
      if (!res.ok) return DISALLOW_ALL;
      const parsed = robotsParser(robotsUrl, await res.text());
      return {
        allowed: (u) => parsed.isAllowed(u, ROBOTS_TOKEN) !== false,
        crawlDelayMs: (parsed.getCrawlDelay(ROBOTS_TOKEN) ?? 0) * 1000,
      };
    } catch {
      return DISALLOW_ALL;
    }
  }
}
