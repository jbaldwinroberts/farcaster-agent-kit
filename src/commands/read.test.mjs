import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let tempDir;
let originalFetch;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "fak-test-"));
  process.env.FAK_CONFIG_DIR = tempDir;
  writeFileSync(
    join(tempDir, "config.json"),
    JSON.stringify({ fid: 100, hub: "https://hub.test:3381" }),
    { mode: 0o600 }
  );
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.FAK_CONFIG_DIR;
  globalThis.fetch = originalFetch;
});

describe("read commands", () => {
  it("readMentions returns parsed mentions", async () => {
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes("castsByMention")) {
        return {
          ok: true,
          json: async () => ({
            messages: [
              {
                hash: "0xabc123",
                data: {
                  fid: 200,
                  timestamp: 86400,
                  castAddBody: { text: "hey @atlas check this out" },
                },
              },
            ],
          }),
        };
      }
      // getUserDisplayName call
      return {
        ok: true,
        json: async () => ({
          messages: [{ data: { userDataBody: { type: "USER_DATA_TYPE_DISPLAY", value: "Alice" } } }],
        }),
      };
    });

    const { readMentions } = await import(`./read.mjs?t=${Date.now()}`);
    const mentions = await readMentions({ limit: 10 });

    assert.equal(mentions.length, 1);
    assert.equal(mentions[0].type, "mention");
    assert.equal(mentions[0].from, "Alice");
    assert.equal(mentions[0].fromFid, 200);
    assert.equal(mentions[0].text, "hey @atlas check this out");
    assert.equal(mentions[0].hash, "0xabc123");
  });

  it("readMentions returns empty array when no mentions", async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({ messages: [] }),
    }));

    const { readMentions } = await import(`./read.mjs?t=${Date.now()}`);
    const mentions = await readMentions();
    assert.deepEqual(mentions, []);
  });

  it("readFollowers returns follower list", async () => {
    globalThis.fetch = mock.fn(async (url) => {
      if (url.includes("linksByTargetFid")) {
        return {
          ok: true,
          json: async () => ({
            messages: [
              { data: { fid: 300 } },
              { data: { fid: 400 } },
            ],
          }),
        };
      }
      // getUserDisplayName
      const fid = url.includes("fid=300") ? "Bob" : "Carol";
      return {
        ok: true,
        json: async () => ({
          messages: [{ data: { userDataBody: { type: "USER_DATA_TYPE_DISPLAY", value: fid } } }],
        }),
      };
    });

    const { readFollowers } = await import(`./read.mjs?t=${Date.now()}`);
    const followers = await readFollowers({ limit: 10 });

    assert.equal(followers.length, 2);
    assert.equal(followers[0].fid, 300);
    assert.equal(followers[1].fid, 400);
  });

  it("readAll returns combined results", async () => {
    globalThis.fetch = mock.fn(async (url) => {
      return { ok: true, json: async () => ({ messages: [] }) };
    });

    const { readAll } = await import(`./read.mjs?t=${Date.now()}`);
    const result = await readAll();

    assert.ok("mentions" in result);
    assert.ok("replies" in result);
    assert.ok("followers" in result);
    assert.deepEqual(result.mentions, []);
    assert.deepEqual(result.replies, []);
    assert.deepEqual(result.followers, []);
  });
});
