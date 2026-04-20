import { makeLinkAdd, FarcasterNetwork } from "@farcaster/hub-nodejs";
import { requireConfig } from "../config.mjs";
import { createSigner, encodeAndSubmit, getHub } from "../hub.mjs";

export async function follow(targetFid) {
  const config = requireConfig();
  const hub = getHub(config);
  const signer = createSigner(config.signerPrivateKey);

  const result = await makeLinkAdd(
    { type: "follow", targetFid },
    { fid: config.fid, network: FarcasterNetwork.MAINNET },
    signer,
  );

  return encodeAndSubmit(hub, result);
}
