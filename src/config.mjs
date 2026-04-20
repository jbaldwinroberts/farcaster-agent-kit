import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function defaultConfigDir() {
  return process.env.FAK_CONFIG_DIR || join(homedir(), ".farcaster-agent-kit");
}

export function getConfigDir() {
  return defaultConfigDir();
}

export function getConfigPath() {
  return join(getConfigDir(), "config.json");
}

export function loadConfig() {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function saveConfig(config) {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error("Not set up yet. Run: farcaster-agent-kit setup");
    process.exit(1);
  }
  return config;
}
