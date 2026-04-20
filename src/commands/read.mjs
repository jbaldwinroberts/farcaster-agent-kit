import { requireConfig } from "../config.mjs";
import { getHub, hubGet, farcasterTimestampToISO, getUserDisplayName } from "../hub.mjs";

export async function readMentions({ limit = 25 } = {}) {
  const config = requireConfig();
  const hub = getHub(config);

  const data = await hubGet(hub, `/v1/castsByMention?fid=${config.fid}&pageSize=${limit}&reverse=true`);
  if (!data || !data.messages) return [];

  const mentions = [];
  for (const msg of data.messages) {
    const cast = msg.data?.castAddBody;
    if (!cast) continue;

    mentions.push({
      type: "mention",
      hash: msg.hash,
      from: await getUserDisplayName(hub, msg.data.fid),
      fromFid: msg.data.fid,
      text: cast.text,
      timestamp: farcasterTimestampToISO(msg.data.timestamp),
    });
  }

  return mentions;
}

export async function readReplies({ limit = 10 } = {}) {
  const config = requireConfig();
  const hub = getHub(config);

  // Get own recent casts
  const myCasts = await hubGet(hub, `/v1/castsByFid?fid=${config.fid}&pageSize=${limit}&reverse=true`);
  if (!myCasts || !myCasts.messages) return [];

  const replies = [];
  for (const myCast of myCasts.messages) {
    const myHash = myCast.hash;
    const myText = myCast.data?.castAddBody?.text || "";

    const replyData = await hubGet(hub, `/v1/castsByParent?fid=${config.fid}&hash=${myHash}&pageSize=${limit}&reverse=true`);
    if (!replyData || !replyData.messages) continue;

    for (const msg of replyData.messages) {
      if (msg.data.fid === config.fid) continue; // skip own replies
      const cast = msg.data?.castAddBody;
      if (!cast) continue;

      replies.push({
        type: "reply",
        hash: msg.hash,
        from: await getUserDisplayName(hub, msg.data.fid),
        fromFid: msg.data.fid,
        text: cast.text,
        inReplyTo: myText.substring(0, 80),
        inReplyToHash: myHash,
        timestamp: farcasterTimestampToISO(msg.data.timestamp),
      });
    }
  }

  return replies;
}

export async function readFollowers({ limit = 25 } = {}) {
  const config = requireConfig();
  const hub = getHub(config);

  const data = await hubGet(hub, `/v1/linksByTargetFid?target_fid=${config.fid}&link_type=follow&pageSize=${limit}&reverse=true`);
  if (!data || !data.messages) return [];

  const followers = [];
  for (const msg of data.messages) {
    const fid = msg.data?.fid;
    if (!fid) continue;
    followers.push({
      fid,
      name: await getUserDisplayName(hub, fid),
    });
  }

  return followers;
}

export async function readAll({ limit = 25 } = {}) {
  const [mentions, replies, followers] = await Promise.all([
    readMentions({ limit }),
    readReplies({ limit }),
    readFollowers({ limit }),
  ]);
  return { mentions, replies, followers };
}
