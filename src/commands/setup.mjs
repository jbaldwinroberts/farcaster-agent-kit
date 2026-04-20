import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { bytesToHex } from "viem";
import { saveConfig, loadConfig, getConfigPath } from "../config.mjs";
import {
  ID_GATEWAY_ADDRESS,
  ID_REGISTRY_ADDRESS,
  KEY_GATEWAY_ADDRESS,
  SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS,
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_TYPES,
  idGatewayABI,
  keyGatewayABI,
  signedKeyRequestValidatorABI,
  idRegistryABI,
} from "@farcaster/core";

// Enable sync operations for ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

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
    address: ID_REGISTRY_ADDRESS,
    abi: idRegistryABI,
    functionName: "idOf",
    args: [account.address],
  });

  if (fid === 0n) {
    // Step 2: Register FID (requires storage fee)
    const price = await publicClient.readContract({
      address: ID_GATEWAY_ADDRESS,
      abi: idGatewayABI,
      functionName: "price",
    });
    console.error(`Registering FID on Optimism (fee: ${Number(price) / 1e18} ETH)...`);
    const hash = await walletClient.writeContract({
      address: ID_GATEWAY_ADDRESS,
      abi: idGatewayABI,
      functionName: "register",
      args: [recoveryAddr],
      value: price,
    });

    console.error(`Transaction: ${hash}`);
    console.error("Waiting for confirmation...");
    await publicClient.waitForTransactionReceipt({ hash });

    fid = await publicClient.readContract({
      address: ID_GATEWAY_ADDRESS,
      abi: idRegistryABI,
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
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

  const signature = await walletClient.signTypedData({
    ...SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_TYPES,
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: fid,
      key: signerPublicKeyHex,
      deadline,
    },
  });

  // Step 5: Encode metadata via the on-chain validator (guarantees correct format)
  const metadata = await publicClient.readContract({
    address: SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS,
    abi: signedKeyRequestValidatorABI,
    functionName: "encodeMetadata",
    args: [{ requestFid: fid, requestSigner: account.address, signature, deadline }],
  });

  // Step 6: Register signer on-chain via KeyGateway
  console.error("Registering signer on Optimism...");
  const addHash = await walletClient.writeContract({
    address: KEY_GATEWAY_ADDRESS,
    abi: keyGatewayABI,
    functionName: "add",
    args: [1, signerPublicKeyHex, 1, metadata],
  });

  console.error(`Transaction: ${addHash}`);
  console.error("Waiting for confirmation...");
  await publicClient.waitForTransactionReceipt({ hash: addHash });
  console.error("Signer registered on-chain.");
  console.error("\nNote: it may take 1-2 minutes for hubs to sync your new signer.");
  console.error("If posting fails with 'invalid signer', wait and retry.");

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
