import * as farcaster from "./farcaster.mjs";
import * as x from "./x.mjs";
import * as bluesky from "./bluesky.mjs";

export const platforms = { farcaster, x, bluesky };

export function resolvePlatforms(arg, config) {
  if (!arg || arg === "farcaster") return ["farcaster"];
  if (arg === "all") {
    return Object.keys(platforms).filter((p) => platforms[p].isConfigured(config));
  }
  return arg.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function postToAll(config, text, opts, platformList) {
  const results = {};
  await Promise.all(
    platformList.map(async (p) => {
      const platform = platforms[p];
      if (!platform) {
        results[p] = { error: `unknown platform: ${p}` };
        return;
      }
      if (!platform.isConfigured(config)) {
        results[p] = { error: `${p} not configured` };
        return;
      }
      try {
        results[p] = { success: true, result: await platform.post(config, text, opts) };
      } catch (err) {
        results[p] = { error: err.message };
      }
    }),
  );
  return results;
}
