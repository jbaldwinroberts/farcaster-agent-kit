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
      key: bytesToHex(signerPublicKey),
      deadline,
    },
  });

  // Step 5: ABI-encode the metadata
  const { encodeAbiParameters, parseAbiParameters } = await import("viem");
  const metadata = encodeAbiParameters(
    parseAbiParameters("uint256 requestFid, address requestSigner, bytes signature, uint256 deadline"),
    [fid, account.address, signature, deadline],
  );

  // Step 6: Register signer on-chain
  console.error("Registering signer on Optimism...");
  const addHash = await walletClient.writeContract({
    address: KEY_GATEWAY,
    abi: KEY_GATEWAY_ABI,
    functionName: "add",
    args: [1, bytesToHex(signerPublicKey), 1, metadata],
  });

  console.error(`Transaction: ${addHash}`);
  console.error("Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: addHash });
  console.error("Signer registered.");

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
