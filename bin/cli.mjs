#!/usr/bin/env node

import { readFileSync } from "fs";
import { join } from "path";
import { setup } from "../src/commands/setup.mjs";
import { post } from "../src/commands/post.mjs";
import { follow } from "../src/commands/follow.mjs";
import { setProfile, getProfile } from "../src/commands/profile.mjs";
import { readMentions, readReplies, readFollowers, readAll } from "../src/commands/read.mjs";
import { addX, addBluesky } from "../src/commands/add-platform.mjs";

const args = process.argv.slice(2);
const command = args[0];

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8"));

function getFlag(flag) {
  const arg = args.find((a) => a.startsWith(`--${flag}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

function getPositional(index) {
  // Skip flags, return the nth non-flag argument after the command
  const positionals = args.slice(1).filter((a) => !a.startsWith("--"));
  return positionals[index] || null;
}

const USAGE = `farcaster-agent-kit — Multi-platform social toolkit for AI agents

Commands:
  setup                        Register Farcaster FID and create signer on Optimism
  add-x                        Add X (Twitter) credentials to config
  add-bluesky                  Add Bluesky credentials to config
  post <text>                  Post to one or more platforms (default: farcaster)
  follow <fid>                 Follow a Farcaster user
  profile get [fid]            View Farcaster profile
  profile set <field> <value>  Set Farcaster profile field (display, bio, pfp, url)
  read [mentions|replies|followers|all]  Read Farcaster social activity

Options:
  --private-key=0x...         Optimism wallet private key (setup only)
  --platforms=x,bluesky       Comma-separated platforms or 'all' (post only)
  --channel=name              Farcaster channel
  --parent-fid=N              Farcaster reply target FID (with --parent-hash)
  --parent-hash=0x...         Farcaster reply target hash (with --parent-fid)
  --hub=url                   Custom Farcaster hub (default: crackle.farcaster.xyz)
  --api-key=...               X: Consumer API Key
  --api-key-secret=...        X: Consumer API Secret
  --access-token=...          X: OAuth1 Access Token
  --access-token-secret=...   X: OAuth1 Access Token Secret
  --handle=...                Bluesky: handle (e.g. atlas.bsky.social)
  --app-password=...          Bluesky: app password
  --json                      Output as JSON
  --limit=N                   Max results for read commands (default: 25)

Examples:
  farcaster-agent-kit setup --private-key=0x...
  farcaster-agent-kit add-x --api-key=... --api-key-secret=... --access-token=... --access-token-secret=...
  farcaster-agent-kit add-bluesky --handle=atlas.bsky.social --app-password=xxxx-xxxx-xxxx-xxxx
  farcaster-agent-kit post "gm"
  farcaster-agent-kit post "gm" --platforms=all
  farcaster-agent-kit post "gm farcaster" --channel=base --platforms=farcaster
`;

async function main() {
  const json = args.includes("--json");

  try {
    switch (command) {
      case "setup": {
        const privateKey = getFlag("private-key");
        const hub = getFlag("hub");
        const result = await setup(privateKey, { hub });
        if (result.alreadySetUp) {
          console.log(json ? JSON.stringify(result) : `Already set up (FID ${result.fid}). Config: ${result.configPath}`);
        } else {
          console.log(json ? JSON.stringify(result) : `Registered FID ${result.fid}. Config saved to ${result.configPath}`);
        }
        break;
      }

      case "post": {
        const text = getPositional(0);
        if (!text) {
          console.error("Usage: farcaster-agent-kit post <text> [--platforms=...]");
          process.exit(1);
        }
        const channel = getFlag("channel");
        const parentFid = getFlag("parent-fid") ? parseInt(getFlag("parent-fid")) : null;
        const parentHash = getFlag("parent-hash");
        const platforms = getFlag("platforms");
        const results = await post(text, { channel, parentFid, parentHash, platforms });
        if (json) {
          console.log(JSON.stringify(results));
        } else {
          for (const [p, r] of Object.entries(results)) {
            if (r.error) console.log(`${p}: ERROR — ${r.error}`);
            else console.log(`${p}: posted`);
          }
        }
        // Non-zero exit if any platform failed
        if (Object.values(results).some((r) => r.error)) process.exit(2);
        break;
      }

      case "add-x": {
        const result = addX({
          apiKey: getFlag("api-key"),
          apiKeySecret: getFlag("api-key-secret"),
          accessToken: getFlag("access-token"),
          accessTokenSecret: getFlag("access-token-secret"),
        });
        console.log(json ? JSON.stringify(result) : "X credentials saved");
        break;
      }

      case "add-bluesky": {
        const result = addBluesky({
          handle: getFlag("handle"),
          appPassword: getFlag("app-password"),
        });
        console.log(json ? JSON.stringify(result) : "Bluesky credentials saved");
        break;
      }

      case "follow": {
        const fid = parseInt(getPositional(0));
        if (!fid || isNaN(fid)) {
          console.error("Usage: farcaster-agent-kit follow <fid>");
          process.exit(1);
        }
        await follow(fid);
        console.log(json ? JSON.stringify({ followed: fid }) : `Followed FID ${fid}`);
        break;
      }

      case "profile": {
        const subcommand = getPositional(0);
        if (subcommand === "set") {
          const field = getPositional(1);
          const value = getPositional(2);
          if (!field || !value) {
            console.error("Usage: farcaster-agent-kit profile set <field> <value>");
            process.exit(1);
          }
          await setProfile(field, value);
          console.log(json ? JSON.stringify({ field, value }) : `Set ${field}: ${value}`);
        } else if (subcommand === "get" || !subcommand) {
          const fid = getPositional(1) ? parseInt(getPositional(1)) : null;
          const profile = await getProfile(fid);
          console.log(json ? JSON.stringify(profile) : Object.entries(profile).map(([k, v]) => `${k}: ${v}`).join("\n"));
        } else {
          console.error("Usage: farcaster-agent-kit profile [get|set]");
          process.exit(1);
        }
        break;
      }

      case "read": {
        const what = getPositional(0) || "all";
        const limit = getFlag("limit") ? parseInt(getFlag("limit")) : 25;
        let result;
        switch (what) {
          case "mentions": result = await readMentions({ limit }); break;
          case "replies": result = await readReplies({ limit }); break;
          case "followers": result = await readFollowers({ limit }); break;
          case "all": result = await readAll({ limit }); break;
          default:
            console.error("Usage: farcaster-agent-kit read [mentions|replies|followers|all]");
            process.exit(1);
        }
        console.log(JSON.stringify(result, null, json ? 2 : undefined));
        break;
      }

      case "version":
      case "--version":
      case "-v":
        console.log(pkg.version);
        break;

      case "help":
      case "--help":
      case "-h":
      case undefined:
        console.log(USAGE);
        break;

      default:
        console.error(`Unknown command: ${command}\n`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (err) {
    const message = err.message || String(err);

    // Friendly messages for common errors
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      const msg = "Could not connect to the Farcaster hub. Check your internet connection or try a different hub with --hub=<url>";
      console.error(json ? JSON.stringify({ error: msg }) : `Error: ${msg}`);
    } else if (message.includes("Not set up yet") || message.includes("No config")) {
      console.error(json ? JSON.stringify({ error: "Not set up yet. Run: farcaster-agent-kit setup" }) : "Error: Not set up yet. Run: farcaster-agent-kit setup");
    } else {
      console.error(json ? JSON.stringify({ error: message }) : `Error: ${message}`);
    }
    process.exit(1);
  }
}

main();
