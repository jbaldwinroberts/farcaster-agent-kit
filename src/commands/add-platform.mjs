import { loadConfig, saveConfig } from "../config.mjs";

export function addX({ apiKey, apiKeySecret, accessToken, accessTokenSecret }) {
  if (!apiKey || !apiKeySecret || !accessToken || !accessTokenSecret) {
    throw new Error("X requires: --api-key, --api-key-secret, --access-token, --access-token-secret");
  }
  const config = loadConfig() || {};
  config.x = { apiKey, apiKeySecret, accessToken, accessTokenSecret };
  saveConfig(config);
  return { platform: "x", ok: true };
}

export function addBluesky({ handle, appPassword }) {
  if (!handle || !appPassword) {
    throw new Error("Bluesky requires: --handle, --app-password");
  }
  const config = loadConfig() || {};
  config.bluesky = { handle, appPassword };
  saveConfig(config);
  return { platform: "bluesky", ok: true };
}
