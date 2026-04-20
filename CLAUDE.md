# farcaster-agent-kit

## What This Is

CLI and library for interacting with Farcaster via direct hub protocol. No paid APIs, no Neynar, no Warpcast dependency. Built for AI agents but works for anyone.

Born from building Atlas (a 24/7 Claude Code agent) — the tools were extracted from a working production setup.

## Architecture

```
bin/cli.mjs          — CLI entry point, argument parsing, subcommand routing
src/config.mjs       — Config management (~/.farcaster-agent-kit/config.json)
src/hub.mjs          — Hub HTTP API client, message signing, submission
src/commands/
  setup.mjs          — FID registration + Ed25519 signer (Optimism contracts)
  post.mjs           — Cast to feed, channels, or as replies
  follow.mjs         — Follow users by FID
  profile.mjs        — Get/set display name, bio, pfp, url
  read.mjs           — Read mentions, replies, followers
src/index.mjs        — Library exports
```

## Key Design Decisions

- **Plain ESM JavaScript** — no TypeScript, no build step. `npx` just works.
- **Direct hub protocol** — talks to Farcaster hubs via HTTP REST API, not through any intermediary service.
- **Zero config after setup** — one `setup` command handles FID registration and signer creation. Everything after that reads from `~/.farcaster-agent-kit/config.json`.
- **CLI and library** — same code works as `farcaster-agent-kit post "gm"` or `import { post } from "farcaster-agent-kit"`.
- **No framework dependency** — doesn't depend on Eliza, LangChain, or any agent framework.

## Development

```bash
npm install
node bin/cli.mjs help
node bin/cli.mjs read all --json  # needs config set up first
```

## Testing

The `setup` command involves real on-chain transactions on Optimism. Test with a fresh wallet that has a tiny amount of OP ETH.

The read/write commands can be tested against any existing FID by manually creating `~/.farcaster-agent-kit/config.json`:
```json
{
  "fid": 3318514,
  "signerPrivateKey": "0x...",
  "hub": "https://crackle.farcaster.xyz:3381"
}
```

## Conventions

- All commands output JSON when `--json` flag is passed
- Errors go to stderr, data to stdout
- Config file is `0600` permissions (owner-only)
- Hub URL defaults to `crackle.farcaster.xyz:3381` (free, public, no auth)
- Farcaster timestamps use epoch Jan 1 2021, not Unix epoch

## Known Gaps / TODOs

- [ ] Setup command is untested end-to-end (FID registration + signer on Optimism)
- [ ] No `unfollow` command
- [ ] No `delete` cast command
- [ ] No pagination support for read commands
- [ ] No channel discovery/listing
- [ ] No reaction (like/recast) support
- [ ] No username search (only FID-based lookups)
- [ ] No automated tests
- [ ] Not yet published to npm
