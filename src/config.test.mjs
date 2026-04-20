import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Override config paths for testing
let tempDir;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "fak-test-"));
  process.env.FAK_CONFIG_DIR = tempDir;
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.FAK_CONFIG_DIR;
});

// Dynamic import to pick up env var
async function loadModule() {
  // Bust the module cache by using a query param
  const mod = await import(`./config.mjs?t=${Date.now()}-${Math.random()}`);
  return mod;
}

describe("config", () => {
  it("loadConfig returns null when no config exists", async () => {
    const { loadConfig } = await loadModule();
    assert.equal(loadConfig(), null);
  });

  it("saveConfig creates config dir and file", async () => {
    const { saveConfig, loadConfig } = await loadModule();
    const config = { fid: 12345, hub: "https://example.com" };
    saveConfig(config);

    const loaded = loadConfig();
    assert.deepEqual(loaded, config);
  });

  it("saveConfig sets restrictive file permissions", async () => {
    const { saveConfig, getConfigPath } = await loadModule();
    saveConfig({ fid: 1 });

    const stats = statSync(getConfigPath());
    const mode = (stats.mode & 0o777).toString(8);
    assert.equal(mode, "600");
  });

  it("requireConfig exits when no config exists", async () => {
    const { requireConfig } = await loadModule();
    const originalExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; throw new Error("exit"); };

    try {
      requireConfig();
    } catch (e) {
      assert.equal(e.message, "exit");
    }

    assert.equal(exitCode, 1);
    process.exit = originalExit;
  });

  it("requireConfig returns config when it exists", async () => {
    const { saveConfig, requireConfig } = await loadModule();
    const config = { fid: 99, hub: "https://hub.example.com" };
    saveConfig(config);

    const loaded = requireConfig();
    assert.deepEqual(loaded, config);
  });
});
