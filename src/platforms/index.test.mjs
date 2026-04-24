import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePlatforms, platforms } from "./index.mjs";

describe("platforms", () => {
  it("all three registered", () => {
    assert.ok(platforms.farcaster);
    assert.ok(platforms.x);
    assert.ok(platforms.bluesky);
  });

  it("resolvePlatforms default to farcaster", () => {
    assert.deepEqual(resolvePlatforms(undefined, {}), ["farcaster"]);
    assert.deepEqual(resolvePlatforms(null, {}), ["farcaster"]);
    assert.deepEqual(resolvePlatforms("farcaster", {}), ["farcaster"]);
  });

  it("resolvePlatforms parses comma list", () => {
    assert.deepEqual(resolvePlatforms("x,bluesky", {}), ["x", "bluesky"]);
    assert.deepEqual(resolvePlatforms("farcaster, x", {}), ["farcaster", "x"]);
  });

  it("resolvePlatforms 'all' filters to configured", () => {
    const config = {
      fid: 123,
      signerPrivateKey: "0xabc",
      x: { apiKey: "a", apiKeySecret: "b", accessToken: "c", accessTokenSecret: "d" },
    };
    const result = resolvePlatforms("all", config);
    assert.ok(result.includes("farcaster"));
    assert.ok(result.includes("x"));
    assert.ok(!result.includes("bluesky"));
  });

  it("isConfigured checks required fields", () => {
    assert.equal(platforms.farcaster.isConfigured({}), false);
    assert.equal(platforms.farcaster.isConfigured({ fid: 1, signerPrivateKey: "k" }), true);

    assert.equal(platforms.x.isConfigured({}), false);
    assert.equal(platforms.x.isConfigured({ x: { apiKey: "a", apiKeySecret: "b", accessToken: "c", accessTokenSecret: "d" } }), true);

    assert.equal(platforms.bluesky.isConfigured({}), false);
    assert.equal(platforms.bluesky.isConfigured({ bluesky: { handle: "x", appPassword: "y" } }), true);
  });
});
