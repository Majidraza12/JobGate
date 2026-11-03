// LlmClient that runs extraction through the Claude Code CLI (`claude -p`) on
// Majid's own subscription instead of the paid API (decision 2026-11-02).
// One CLI process per call: the system prompt replaces Claude Code's own, all
// tools, settings files, MCP servers, and slash commands are off, and nothing
// is saved as a session. ANTHROPIC_API_KEY is removed from the child's
// environment so a run can never fall back to billing the API.

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { PRODUCTION_MODEL, type LlmClient, type LlmResponse, type Turn } from "./llm";

// Models Majid compares in the eval. Full ids, so stored rows say exactly
// which model produced them.
export const CLI_MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: PRODUCTION_MODEL,
} as const;
export type CliModelName = keyof typeof CLI_MODELS;

export const CLI_TIMEOUT_MS = 180_000;

// Runs the CLI with the given args and stdin; resolves with stdout. Injected
// so tests never start a real process.
export type CliRunner = (args: string[], stdin: string) => Promise<string>;

export function cliArgs(model: string, system: string): string[] {
  return [
    "-p",
    "--model", model,
    "--system-prompt", system,
    "--tools", "",
    "--setting-sources", "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-session-persistence",
    "--output-format", "json",
  ];
}

// The CLI takes one prompt, not a message list. The only multi-turn case is
// extractOne's single retry (user, assistant, user), so earlier turns are
// replayed as labeled text ahead of the last user message.
export function flattenTurns(turns: Turn[]): string {
  if (turns.length === 1) return turns[0]!.content;
  const earlier = turns.slice(0, -1).map((t) => `<${t.role}_turn>\n${t.content}\n</${t.role}_turn>`);
  return [...earlier, turns.at(-1)!.content].join("\n\n");
}

interface CliResult {
  is_error?: boolean;
  subtype?: string;
  result?: string;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

export function parseCliOutput(stdout: string): LlmResponse {
  let r: CliResult;
  try {
    r = JSON.parse(stdout);
  } catch {
    throw new Error(`claude CLI output is not JSON: ${stdout.slice(0, 200)}`);
  }
  if (r.is_error || r.subtype !== "success" || typeof r.result !== "string") {
    throw new Error(`claude CLI error (${r.subtype ?? "unknown"}): ${String(r.result ?? "").slice(0, 300)}`);
  }
  const u = r.usage ?? {};
  return {
    text: r.result,
    stopReason: r.stop_reason ?? null,
    inputTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens ?? 0,
  };
}

export const spawnClaude: CliRunner = (args, stdin) =>
  new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    // Run outside the repo so no CLAUDE.md or project settings are picked up.
    const child = spawn("claude", args, { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "pipe"], shell: false });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`claude CLI timed out after ${CLI_TIMEOUT_MS}ms`));
    }, CLI_TIMEOUT_MS);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // With --output-format json, errors still print a JSON result; prefer it.
      if (out.trim()) resolve(out);
      else reject(new Error(`claude CLI exited ${code}: ${err.slice(0, 300)}`));
    });
    child.stdin.end(stdin);
  });

export function claudeCliClient(model: string, run: CliRunner = spawnClaude): LlmClient {
  return {
    model,
    subscription: true,
    async complete(system, turns) {
      return parseCliOutput(await run(cliArgs(model, system), flattenTurns(turns)));
    },
  };
}
