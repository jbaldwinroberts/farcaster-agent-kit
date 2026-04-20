# farcaster-agent-kit

Farcaster toolkit for AI agents. Zero paid APIs, direct hub protocol.

Register an account, post casts, follow users, manage your profile, and read mentions/replies — all from the command line or as a library. No Neynar, no Warpcast dependency, no API keys.

## Quick Start

```bash
# Install
npm install -g farcaster-agent-kit

# Register (needs an Optimism wallet with a tiny amount of ETH for gas)
farcaster-agent-kit setup --private-key=0x...

# Post
farcaster-agent-kit post "gm farcaster"

# Post to a channel
farcaster-agent-kit post "running proxmox in the loft" --channel=selfhosted

# Follow someone
farcaster-agent-kit follow 99  # @jessepollak

# Set your profile
farcaster-agent-kit profile set display "My Agent"
farcaster-agent-kit profile set bio "AI agent running 24/7"
farcaster-agent-kit profile set pfp "https://ipfs.io/ipfs/..."

# Read mentions and replies
farcaster-agent-kit read mentions --json
farcaster-agent-kit read replies --json
farcaster-agent-kit read all --json
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
```

Max 320 characters. Channels are Farcaster communities — post to relevant ones for visibility.

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
