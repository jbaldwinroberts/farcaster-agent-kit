import { makeUserDataAdd, FarcasterNetwork, UserDataType } from "@farcaster/hub-nodejs";
import { requireConfig } from "../config.mjs";
import { createSigner, encodeAndSubmit, getHub, hubGet } from "../hub.mjs";

const TYPE_MAP = {
  pfp: UserDataType.PFP,
  display: UserDataType.DISPLAY,
  bio: UserDataType.BIO,
  url: UserDataType.URL,
  username: UserDataType.USERNAME,
};

export async function setProfile(field, value) {
  if (!TYPE_MAP[field]) {
    throw new Error(`Unknown field: ${field}. Use: ${Object.keys(TYPE_MAP).join(", ")}`);
  }

  const config = requireConfig();
  const hub = getHub(config);
  const signer = createSigner(config.signerPrivateKey);

  const result = await makeUserDataAdd(
    { type: TYPE_MAP[field], value },
    { fid: config.fid, network: FarcasterNetwork.MAINNET },
    signer,
  );

  return encodeAndSubmit(hub, result);
}

export async function getProfile(fid) {
  const config = requireConfig();
  const hub = getHub(config);
  const targetFid = fid || config.fid;

  const data = await hubGet(hub, `/v1/userDataByFid?fid=${targetFid}`);
  if (!data || !data.messages) return {};

  const profile = {};
  const typeNames = {
    USER_DATA_TYPE_PFP: "pfp",
    USER_DATA_TYPE_DISPLAY: "display",
    USER_DATA_TYPE_BIO: "bio",
    USER_DATA_TYPE_URL: "url",
    USER_DATA_TYPE_USERNAME: "username",
  };

  for (const msg of data.messages) {
    const body = msg.data?.userDataBody;
    if (!body) continue;
    const name = typeNames[body.type] || body.type;
    profile[name] = body.value;
  }

  return profile;
}
