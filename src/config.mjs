import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".farcaster-agent-kit");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function getConfigDir() {
  return CONFIG_DIR;
}

export function getConfigPath() {
  return CONFIG_PATH;
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function requireConfig() {
  const config = loadConfig();
  if (!config) {
    console.error("Not set up yet. Run: farcaster-agent-kit setup");
    process.exit(1);
  }
  return config;
}
