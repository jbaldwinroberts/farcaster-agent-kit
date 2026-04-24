// Bluesky via AT Protocol. Free API, app password auth.

export const name = "bluesky";

export function isConfigured(config) {
  const bs = config?.bluesky;
  return !!(bs?.handle && bs?.appPassword);
}

async function createSession(handle, appPassword) {
  const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!res.ok) {
    throw new Error(`Bluesky auth ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function post(config, text, _opts = {}) {
  const { handle, appPassword } = config.bluesky;
  const session = await createSession(handle, appPassword);

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };

  const res = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Bluesky ${res.status}: ${body.substring(0, 300)}`);
  }
  return JSON.parse(body);
}
