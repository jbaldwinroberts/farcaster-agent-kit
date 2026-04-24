import { makeCastAdd, FarcasterNetwork } from "@farcaster/hub-nodejs";
import { fromHex } from "viem";
import { createSigner, encodeAndSubmit, getHub } from "../hub.mjs";

export const name = "farcaster";

export function isConfigured(config) {
  return !!(config?.fid && config?.signerPrivateKey);
}

export async function post(config, text, { channel, parentFid, parentHash } = {}) {
  const hub = getHub(config);
  const signer = createSigner(config.signerPrivateKey);

  const castBody = {
    text,
    embeds: [],
    embedsDeprecated: [],
    mentions: [],
    mentionsPositions: [],
  };

  if (channel) {
    castBody.parentUrl = `https://warpcast.com/~/channel/${channel}`;
  }

  if (parentFid && parentHash) {
    castBody.parentCastId = {
      fid: parentFid,
      hash: fromHex(parentHash, "bytes"),
    };
  }

  const result = await makeCastAdd(
    castBody,
    { fid: config.fid, network: FarcasterNetwork.MAINNET },
    signer,
  );

  return encodeAndSubmit(hub, result);
}
