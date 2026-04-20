import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { farcasterTimestampToISO, getHub, getUserDisplayName, hubGet } from "./hub.mjs";

describe("hub", () => {
  describe("getHub", () => {
    it("returns default hub when no config hub", () => {
      assert.equal(getHub({}), "https://crackle.farcaster.xyz:3381");
      assert.equal(getHub(null), "https://crackle.farcaster.xyz:3381");
    });

    it("returns config hub when provided", () => {
      assert.equal(getHub({ hub: "https://custom.hub:3381" }), "https://custom.hub:3381");
    });
  });

  describe("farcasterTimestampToISO", () => {
    it("converts farcaster epoch timestamp to ISO string", () => {
      // Farcaster epoch is Jan 1 2021 00:00:00 UTC (1609459200)
      // Timestamp 0 = Jan 1 2021
      const result = farcasterTimestampToISO(0);
      assert.equal(result, "2021-01-01T00:00:00.000Z");
    });

    it("converts a known timestamp", () => {
      // 86400 seconds = 1 day after farcaster epoch = Jan 2 2021
      const result = farcasterTimestampToISO(86400);
      assert.equal(result, "2021-01-02T00:00:00.000Z");
    });
  });

  describe("hubGet", () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns parsed JSON on success", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({ messages: [{ data: "test" }] }),
      }));

      const result = await hubGet("https://hub.test", "/v1/test");
      assert.deepEqual(result, { messages: [{ data: "test" }] });
      assert.equal(globalThis.fetch.mock.calls.length, 1);
      assert.equal(globalThis.fetch.mock.calls[0].arguments[0], "https://hub.test/v1/test");
    });

    it("returns null on failure", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        status: 404,
      }));

      const result = await hubGet("https://hub.test", "/v1/missing");
      assert.equal(result, null);
    });
  });

  describe("getUserDisplayName", () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("returns display name when available", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          messages: [
            { data: { userDataBody: { type: "USER_DATA_TYPE_DISPLAY", value: "Atlas" } } },
            { data: { userDataBody: { type: "USER_DATA_TYPE_USERNAME", value: "atlas-agent" } } },
          ],
        }),
      }));

      const name = await getUserDisplayName("https://hub.test", 3318514);
      assert.equal(name, "Atlas");
    });

    it("falls back to username when no display name", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          messages: [
            { data: { userDataBody: { type: "USER_DATA_TYPE_USERNAME", value: "atlas-agent" } } },
          ],
        }),
      }));

      const name = await getUserDisplayName("https://hub.test", 3318514);
      assert.equal(name, "atlas-agent");
    });

    it("falls back to fid:N when no user data", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({ messages: [] }),
      }));

      const name = await getUserDisplayName("https://hub.test", 12345);
      assert.equal(name, "fid:12345");
    });

    it("falls back to fid:N when hub returns null", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
      }));

      const name = await getUserDisplayName("https://hub.test", 99);
      assert.equal(name, "fid:99");
    });
  });
});
