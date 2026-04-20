import { NobleEd25519Signer, Message } from "@farcaster/hub-nodejs";
import { fromHex } from "viem";

const DEFAULT_HUB = "https://crackle.farcaster.xyz:3381";

// Farcaster epoch: Jan 1 2021 00:00:00 UTC
const FARCASTER_EPOCH = 1609459200;

export function getHub(config) {
  return config?.hub || DEFAULT_HUB;
}

export function createSigner(signerPrivateKey) {
  return new NobleEd25519Signer(fromHex(signerPrivateKey, "bytes"));
}

export async function submitMessage(hub, messageBytes) {
  const response = await fetch(`${hub}/v1/submitMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: messageBytes,
  });

  const text = await response.text();
  if (response.status !== 200) {
    throw new Error(`Hub returned ${response.status}: ${text.substring(0, 300)}`);
  }

  return JSON.parse(text);
}

export async function encodeAndSubmit(hub, messageResult) {
  if (messageResult.isErr()) {
    throw new Error(`Failed to create message: ${messageResult.error}`);
  }
  const bytes = Message.encode(messageResult._unsafeUnwrap()).finish();
  return submitMessage(hub, bytes);
}

export async function hubGet(hub, path) {
  const resp = await fetch(`${hub}${path}`);
  if (!resp.ok) return null;
  return resp.json();
}

export function farcasterTimestampToISO(ts) {
  return new Date((ts + FARCASTER_EPOCH) * 1000).toISOString();
}

export async function getUserDisplayName(hub, fid) {
  const data = await hubGet(hub, `/v1/userDataByFid?fid=${fid}`);
  if (!data || !data.messages) return `fid:${fid}`;

  let display = null;
  let username = null;
  for (const msg of data.messages) {
    const body = msg.data?.userDataBody;
    if (!body) continue;
    if (body.type === "USER_DATA_TYPE_DISPLAY") display = body.value;
    if (body.type === "USER_DATA_TYPE_USERNAME") username = body.value;
  }
  return display || username || `fid:${fid}`;
}
