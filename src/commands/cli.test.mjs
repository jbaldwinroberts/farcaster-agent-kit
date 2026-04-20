import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "child_process";
import { join } from "path";

const CLI = join(import.meta.dirname, "../../bin/cli.mjs");

function run(...args) {
  try {
    return {
      stdout: execFileSync("node", [CLI, ...args], { encoding: "utf8", timeout: 5000 }),
      exitCode: 0,
    };
  } catch (err) {
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || "",
      exitCode: err.status,
    };
  }
}

describe("CLI", () => {
  it("shows help with no arguments", () => {
    const result = run();
    assert.ok(result.stdout.includes("farcaster-agent-kit"));
    assert.ok(result.stdout.includes("Commands:"));
    assert.equal(result.exitCode, 0);
  });

  it("shows help with --help flag", () => {
    const result = run("--help");
    assert.ok(result.stdout.includes("Commands:"));
    assert.equal(result.exitCode, 0);
  });

  it("shows help with help command", () => {
    const result = run("help");
    assert.ok(result.stdout.includes("Commands:"));
    assert.equal(result.exitCode, 0);
  });

  it("exits with error for unknown command", () => {
    const result = run("notacommand");
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.includes("Unknown command"));
  });

  it("post without text shows usage error", () => {
    const result = run("post");
    assert.equal(result.exitCode, 1);
  });

  it("follow without fid shows usage error", () => {
    const result = run("follow");
    assert.equal(result.exitCode, 1);
  });

  it("setup without private key shows error", () => {
    const result = run("setup");
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.includes("private-key") || result.stderr.includes("Private key"));
  });
});
