# farcaster-agent-kit

Multi-platform social toolkit for AI agents. Post to **Farcaster**, **X (Twitter)**, and **Bluesky** from one CLI. Zero framework dependency.

For Farcaster: direct hub protocol, no Neynar, no API keys. For X: OAuth 1.0a user context. For Bluesky: AT Protocol with app passwords.

## Quick Start

```bash
# Install
npm install -g farcaster-agent-kit

# Set up Farcaster (needs Optimism wallet with ~$0.15 OP ETH)
farcaster-agent-kit setup --private-key=0x...

# Optionally add X credentials
farcaster-agent-kit add-x \
  --api-key=... --api-key-secret=... \
  --access-token=... --access-token-secret=...

# Optionally add Bluesky credentials
farcaster-agent-kit add-bluesky \
  --handle=you.bsky.social --app-password=xxxx-xxxx-xxxx-xxxx

# Post to Farcaster (default)
farcaster-agent-kit post "gm farcaster"

# Post to all configured platforms
farcaster-agent-kit post "gm everywhere" --platforms=all

# Post to specific platforms
farcaster-agent-kit post "crypto take" --platforms=farcaster,x

# Farcaster-only features
farcaster-agent-kit post "hello" --channel=selfhosted
farcaster-agent-kit post "live widget" --embed=https://frames.atlas-agent.xyz
farcaster-agent-kit follow 99
farcaster-agent-kit profile set bio "AI agent running 24/7"
farcaster-agent-kit read mentions --json
```

## Setup

You need an Optimism wallet with a small amount of ETH (~$0.01) for the on-chain registration. The setup command:

1. Registers a new FID (Farcaster ID) on Optimism via the IdGateway contract
2. Generates an Ed25519 signer keypair
3. Registers the signer on-chain via the KeyGateway contract
4. Saves everything to `~/.farcaster-agent-kit/config.json`

If the wallet already has an FID, setup skips registration and just creates a new signer.

```bash
farcaster-agent-kit setup --private-key=0xYOUR_OPTIMISM_PRIVATE_KEY
```

## Commands

### post

```bash
farcaster-agent-kit post "your cast text"
farcaster-agent-kit post "channel post" --channel=base
farcaster-agent-kit post "reply text" --parent-fid=123 --parent-hash=0x...
farcaster-agent-kit post "home lab vitals" --embed=https://frames.atlas-agent.xyz
farcaster-agent-kit post "two links" --embed=https://a.example --embed=https://b.example
```

Max 320 characters. Channels are Farcaster communities — post to relevant ones for visibility.

`--embed=URL` attaches an explicit Farcaster embed (max 2 per cast). Farcaster clients render OG / Frame metadata for the URL. X and Bluesky ignore the flag — those clients auto-unfurl URLs that appear in the cast text.

### follow

```bash
farcaster-agent-kit follow <fid>
```

### profile

```bash
# View your profile
farcaster-agent-kit profile get

# View someone else's
farcaster-agent-kit profile get 99

# Set fields
farcaster-agent-kit profile set display "Atlas"
farcaster-agent-kit profile set bio "AI agent running 24/7"
farcaster-agent-kit profile set pfp "https://ipfs.io/ipfs/..."
farcaster-agent-kit profile set url "https://example.com"
```

### read

```bash
farcaster-agent-kit read mentions    # who mentioned you
farcaster-agent-kit read replies     # replies to your casts
farcaster-agent-kit read followers   # who follows you
farcaster-agent-kit read all         # everything
farcaster-agent-kit read all --json  # structured output for agents
```

## Use as a Library

```javascript
import { post, follow, readAll, setProfile } from "farcaster-agent-kit";

// Post to a channel
await post("gm from my agent", { channel: "base" });

// Post with an embed (Farcaster Frame / OG card)
await post("home lab vitals", { embeds: ["https://frames.atlas-agent.xyz"] });

// Read mentions
const { mentions, replies, followers } = await readAll();

// Follow someone
await follow(99);

// Update profile
await setProfile("bio", "AI agent running 24/7");
```

## Configuration

Config is stored at `~/.farcaster-agent-kit/config.json` (created by `setup`). Contains:

- `fid` — your Farcaster ID
- `custodyAddress` — the Optimism wallet that owns the FID
- `signerPrivateKey` — Ed25519 key for signing messages
- `signerPublicKey` — corresponding public key
- `hub` — Farcaster hub URL (default: crackle.farcaster.xyz)

The config file is created with `0600` permissions (owner-only read/write).

## How It Works

Farcaster is a decentralised social protocol. Data lives on hubs (peer-to-peer servers), not a central API. This toolkit talks directly to a hub's HTTP API — no middleman, no API keys, no rate limit fees.

- **Posting** uses `@farcaster/hub-nodejs` to create signed messages and submits them via the hub's HTTP endpoint
- **Reading** uses the hub's REST API (`/v1/castsByMention`, `/v1/castsByParent`, etc.)
- **Registration** interacts with Farcaster's Optimism contracts (IdGateway, KeyGateway) via `viem`

## Requirements

- Node.js 20+
- An Optimism wallet with ~$0.01 ETH (for initial setup only)

## License

MIT
