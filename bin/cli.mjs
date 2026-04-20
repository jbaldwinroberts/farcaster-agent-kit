#!/usr/bin/env node

import { setup } from "../src/commands/setup.mjs";
import { post } from "../src/commands/post.mjs";
import { follow } from "../src/commands/follow.mjs";
import { setProfile, getProfile } from "../src/commands/profile.mjs";
import { readMentions, readReplies, readFollowers, readAll } from "../src/commands/read.mjs";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(flag) {
  const arg = args.find((a) => a.startsWith(`--${flag}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

function getPositional(index) {
  // Skip flags, return the nth non-flag argument after the command
  const positionals = args.slice(1).filter((a) => !a.startsWith("--"));
  return positionals[index] || null;
}

const USAGE = `farcaster-agent-kit — Farcaster toolkit for AI agents

Commands:
  setup                        Register FID and create signer on Optimism
  post <text>                  Post a cast
  follow <fid>                 Follow a user
  profile get [fid]            View profile
  profile set <field> <value>  Set profile field (display, bio, pfp, url)
  read [mentions|replies|followers|all]  Read social activity

Options:
  --private-key=0x...    Optimism wallet private key (setup only)
  --channel=name         Post to a channel
  --parent-fid=N         Reply to a cast (with --parent-hash)
  --parent-hash=0x...    Reply to a cast (with --parent-fid)
  --hub=url              Custom hub URL (default: crackle.farcaster.xyz)
  --json                 Output as JSON
  --limit=N              Max results for read commands (default: 25)

Examples:
  farcaster-agent-kit setup --private-key=0x...
  farcaster-agent-kit post "gm farcaster" --channel=base
  farcaster-agent-kit follow 99
  farcaster-agent-kit profile set bio "AI agent running 24/7"
  farcaster-agent-kit read mentions --json
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
          console.error("Usage: farcaster-agent-kit post <text>");
          process.exit(1);
        }
        const channel = getFlag("channel");
        const parentFid = getFlag("parent-fid") ? parseInt(getFlag("parent-fid")) : null;
        const parentHash = getFlag("parent-hash");
        const result = await post(text, { channel, parentFid, parentHash });
        console.log(json ? JSON.stringify(result) : `Posted (${result.hash?.substring(0, 16)}...)`);
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
    if (json) {
      console.error(JSON.stringify({ error: err.message }));
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
