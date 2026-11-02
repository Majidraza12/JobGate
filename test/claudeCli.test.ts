// The claude -p adapter, against a fake CLI runner. No process is started.
import { describe, expect, it } from "vitest";
import { claudeCliClient, cliArgs, CLI_MODELS, flattenTurns, parseCliOutput, type CliRunner } from "../pipeline/extract/claudeCli";
import { extractOne } from "../pipeline/extract/extract";

const success = (result: string, extra: object = {}) =>
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result,
    stop_reason: "end_turn",
    usage: { input_tokens: 600, cache_read_input_tokens: 100, cache_creation_input_tokens: 0, output_tokens: 55 },
    total_cost_usd: 0.0009,
    ...extra,
  });

describe("cliArgs", () => {
  it("replaces the system prompt and turns off tools, settings, MCP, commands, and sessions", () => {
    const a = cliArgs(CLI_MODELS.haiku, "SYS");
    expect(a[0]).toBe("-p");
    expect(a[a.indexOf("--model") + 1]).toBe("claude-haiku-4-5-20251001");
    expect(a[a.indexOf("--system-prompt") + 1]).toBe("SYS");
    expect(a[a.indexOf("--tools") + 1]).toBe("");
    expect(a[a.indexOf("--setting-sources") + 1]).toBe("");
    expect(a).toContain("--strict-mcp-config");
    expect(a).toContain("--disable-slash-commands");
    expect(a).toContain("--no-session-persistence");
    expect(a[a.indexOf("--output-format") + 1]).toBe("json");
  });
});

describe("flattenTurns", () => {
  it("passes a single user turn through unchanged", () => {
    expect(flattenTurns([{ role: "user", content: "JD here" }])).toBe("JD here");
  });

  it("replays earlier turns as labeled text before the last message", () => {
    const s = flattenTurns([
      { role: "user", content: "JD" },
      { role: "assistant", content: "{bad json" },
      { role: "user", content: "Fix these errors" },
    ]);
    expect(s).toBe("<user_turn>\nJD\n</user_turn>\n\n<assistant_turn>\n{bad json\n</assistant_turn>\n\nFix these errors");
  });
});

describe("parseCliOutput", () => {
  it("reads the result text, stop reason, and tokens (cache reads count as input)", () => {
    expect(parseCliOutput(success('{"a":1}'))).toEqual({ text: '{"a":1}', stopReason: "end_turn", inputTokens: 700, outputTokens: 55 });
  });

  it("throws on CLI errors and on non-JSON output", () => {
    expect(() => parseCliOutput(JSON.stringify({ subtype: "error_during_execution", is_error: true, result: "usage limit" }))).toThrow(/usage limit/);
    expect(() => parseCliOutput("Error: not logged in")).toThrow(/not JSON/);
  });
});

describe("claudeCliClient", () => {
  it("is marked subscription, so extraction records $0 even with tokens", async () => {
    const calls: { args: string[]; stdin: string }[] = [];
    const run: CliRunner = async (args, stdin) => {
      calls.push({ args, stdin });
      return success("not json at all");
    };
    const llm = claudeCliClient(CLI_MODELS.sonnet, run);
    expect(llm.subscription).toBe(true);
    const r = await extractOne(llm, "Some JD text.");
    // Two calls: the first answer fails JSON parsing, the retry replays it.
    expect(calls).toHaveLength(2);
    expect(calls[1]!.stdin).toContain("<assistant_turn>\nnot json at all\n</assistant_turn>");
    expect(r.status).toBe("schema_invalid");
    expect(r.inputTokens).toBe(1400);
    expect(r.costUsd).toBe(0);
  });

  it("turns a runner failure into llm_failed", async () => {
    const llm = claudeCliClient(CLI_MODELS.haiku, async () => {
      throw new Error("claude CLI timed out after 180000ms");
    });
    const r = await extractOne(llm, "Some JD text.");
    expect(r.status).toBe("llm_failed");
    expect(r.error).toMatch(/timed out/);
  });
});
