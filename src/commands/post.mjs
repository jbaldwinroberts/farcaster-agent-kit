import { makeCastAdd, FarcasterNetwork } from "@farcaster/hub-nodejs";
import { fromHex } from "viem";
import { requireConfig } from "../config.mjs";
import { createSigner, encodeAndSubmit, getHub } from "../hub.mjs";

export async function post(text, { channel, parentFid, parentHash } = {}) {
  const config = requireConfig();
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
