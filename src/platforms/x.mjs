import OAuth from "oauth-1.0a";
import crypto from "crypto";

export const name = "x";

export function isConfigured(config) {
  const x = config?.x;
  return !!(x?.apiKey && x?.apiKeySecret && x?.accessToken && x?.accessTokenSecret);
}

export async function post(config, text, _opts = {}) {
  const { apiKey, apiKeySecret, accessToken, accessTokenSecret } = config.x;

  const oauth = OAuth({
    consumer: { key: apiKey, secret: apiKeySecret },
    signature_method: "HMAC-SHA1",
    hash_function(base, key) {
      return crypto.createHmac("sha1", key).update(base).digest("base64");
    },
  });

  const url = "https://api.x.com/2/tweets";
  const token = { key: accessToken, secret: accessTokenSecret };
  const auth = oauth.authorize({ url, method: "POST" }, token);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": oauth.toHeader(auth).Authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${body.substring(0, 300)}`);
  }
  return JSON.parse(body);
}
