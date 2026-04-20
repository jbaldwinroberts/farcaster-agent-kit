import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { bytesToHex, hexToBytes } from "viem";
import { saveConfig, loadConfig, getConfigPath } from "../config.mjs";

// Enable sync operations for ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const ID_GATEWAY = "0x00000000Fc25870C6eD6b6c7E41Fb078b7a38947";
const KEY_GATEWAY = "0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B";
const ID_REGISTRY = "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b";
const SIGNED_KEY_REQUEST_VALIDATOR = "0x00000000FC700472606ED4fA22623Acf62c60553";

const ID_GATEWAY_ABI = [
  parseAbiItem("function register(address recovery) payable returns (uint256)"),
];

const ID_REGISTRY_ABI = [
  parseAbiItem("function idOf(address owner) view returns (uint256)"),
];

const KEY_GATEWAY_ABI = [
  parseAbiItem("function add(uint32 keyType, bytes key, uint8 metadataType, bytes metadata) payable"),
];

const SIGNED_KEY_REQUEST_TYPE = {
  SignedKeyRequest: [
    { name: "requestFid", type: "uint256" },
    { name: "key", type: "bytes" },
    { name: "deadline", type: "uint256" },
  ],
};

export async function setup(privateKey, { hub, recovery } = {}) {
  const existing = loadConfig();
  if (existing) {
    return { alreadySetUp: true, fid: existing.fid, configPath: getConfigPath() };
  }

  if (!privateKey) {
    throw new Error(
      "Private key required. This is the Optimism wallet that will own your FID.\n" +
      "Usage: farcaster-agent-kit setup --private-key 0x..."
    );
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: optimism, transport: http() });
  const walletClient = createWalletClient({ account, chain: optimism, transport: http() });

  const recoveryAddr = recovery || account.address;
  hub = hub || "https://crackle.farcaster.xyz:3381";

  // Step 1: Check if this wallet already has an FID
  console.error("Checking for existing FID...");
  let fid = await publicClient.readContract({
    address: ID_REGISTRY,
    abi: ID_REGISTRY_ABI,
    functionName: "idOf",
    args: [account.address],
  });

  if (fid === 0n) {
    // Step 2: Register FID
    console.error("Registering FID on Optimism...");
    const hash = await walletClient.writeContract({
      address: ID_GATEWAY,
      abi: ID_GATEWAY_ABI,
      functionName: "register",
      args: [recoveryAddr],
    });

    console.error(`Transaction: ${hash}`);
    console.error("Waiting for confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Read the assigned FID
    fid = await publicClient.readContract({
      address: ID_REGISTRY,
      abi: ID_REGISTRY_ABI,
      functionName: "idOf",
      args: [account.address],
    });

    if (fid === 0n) {
      throw new Error("FID registration failed — no FID assigned after transaction");
    }
    console.error(`FID registered: ${fid}`);
  } else {
    console.error(`Wallet already has FID: ${fid}`);
  }

  // Step 3: Generate Ed25519 signer keypair
  console.error("Generating Ed25519 signer...");
  const signerPrivateKey = ed.utils.randomPrivateKey();
  const signerPublicKey = ed.getPublicKey(signerPrivateKey);
  const signerPublicKeyHex = bytesToHex(signerPublicKey);

  // Step 4: Sign the key request (EIP-712)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24h from now

  const signature = await walletClient.signTypedData({
    domain: {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: 10,
      verifyingContract: SIGNED_KEY_REQUEST_VALIDATOR,
    },
    types: SIGNED_KEY_REQUEST_TYPE,
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: fid,
      key: signerPublicKeyHex,
      deadline,
    },
  });

  // Step 5: Register signer via Warpcast bundler (handles on-chain tx + gas)
  console.error("Registering signer via Warpcast bundler...");
  const bundlerResp = await fetch("https://api.warpcast.com/v2/signed-key-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: signerPublicKeyHex,
      requestFid: Number(fid),
      signature,
      deadline: Number(deadline),
    }),
  });

  if (!bundlerResp.ok) {
    const err = await bundlerResp.text();
    throw new Error(`Warpcast bundler failed (${bundlerResp.status}): ${err.substring(0, 300)}`);
  }

  const bundlerResult = await bundlerResp.json();
  const token = bundlerResult.result?.signedKeyRequest?.token;

  if (!token) {
    throw new Error("Warpcast bundler returned no token: " + JSON.stringify(bundlerResult).substring(0, 300));
  }

  // Step 6: Poll until signer is registered on-chain
  console.error("Waiting for on-chain confirmation...");
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollResp = await fetch(`https://api.warpcast.com/v2/signed-key-request?token=${token}`);
    if (!pollResp.ok) continue;
    const pollResult = await pollResp.json();
    const state = pollResult.result?.signedKeyRequest?.state;
    if (state === "completed") {
      console.error("Signer registered.");
      break;
    }
    if (state === "pending") continue;
    // Unknown state — keep polling
  }

  // Step 7: Save config
  const config = {
    fid: Number(fid),
    custodyAddress: account.address,
    signerPrivateKey: bytesToHex(signerPrivateKey),
    signerPublicKey: bytesToHex(signerPublicKey),
    hub,
  };

  saveConfig(config);

  return {
    fid: Number(fid),
    address: account.address,
    configPath: getConfigPath(),
  };
}
