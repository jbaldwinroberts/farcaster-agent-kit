import { requireConfig } from "../config.mjs";
import { resolvePlatforms, postToAll } from "../platforms/index.mjs";

export async function post(text, { channel, parentFid, parentHash, platforms } = {}) {
  const config = requireConfig();
  const platformList = resolvePlatforms(platforms, config);
  return postToAll(config, text, { channel, parentFid, parentHash }, platformList);
}
