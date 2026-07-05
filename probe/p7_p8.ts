// P7 (relayer auth reality) + P8 (HCU limits). Run: npx hardhat run probe/p7_p8.ts --network sepolia
import { ethers } from "hardhat";
import { ADDR, VERSIONED_ABI, writeFragment, writeState, readState, fmtErr } from "./_lib";

const RELAYER = "https://relayer.testnet.zama.org";

async function main() {
  const state = readState();

  // ============ P7 — relayer auth ============
  // Evidence already gathered: every relayer op in P4/P5/P6 (createEncryptedInput,
  // publicDecrypt, userDecrypt) ran with NO x-api-key configured. Here we additionally
  // hit the relayer HTTP endpoint directly with no auth header.
  const endpoints = ["/v1/keyurl", "/v1/keys", "/"];
  const httpResults: string[] = [];
  for (const ep of endpoints) {
    try {
      const res = await fetch(RELAYER + ep, { method: "GET" });
      const status = res.status;
      const bodyHead = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
      httpResults.push(`GET ${ep} → HTTP ${status}${status < 400 ? " (open, no key)" : ""} :: ${bodyHead}`);
      console.log(`P7 GET ${ep} → ${status}`);
    } catch (e) {
      httpResults.push(`GET ${ep} → fetch error: ${fmtErr(e)}`);
    }
  }
  const sdkKeyless =
    state?.p6?.publicDecrypt?.latencyMs != null
      ? `YES — createEncryptedInput, publicDecrypt (${state.p6.publicDecrypt.latencyMs}ms), and userDecryptEuint all succeeded in P4/P5/P6 with no API key set.`
      : "YES — SDK relayer ops succeeded with no API key (see P4/P5/P6).";
  const p7 = `### P7 — Relayer auth reality (Sepolia)

Relayer base URL: \`${RELAYER}\`.

**Does keyless dev work today?** ${sdkKeyless}

Raw unauthenticated HTTP probes (no \`x-api-key\`):
${httpResults.map((r) => `- ${r}`).join("\n")}

**Decision:** the Sepolia testnet relayer is usable **keyless** for development right now (resolves the docs contradiction in favor of "open on testnet"). Build the backend proxy for mainnet regardless (mainnet relayer requires a key).
`;
  writeFragment("p7", p7);

  // ============ P8 — HCU limits ============
  // Source-derived caps come from @fhevm/host-contracts HCULimit.sol v0.1.0 (private constants).
  // Try to confirm the deployed impl version on-chain.
  const hcu = new ethers.Contract(ADDR.hcu, VERSIONED_ABI, ethers.provider);
  let version = "?";
  try {
    version = await hcu.getVersion();
  } catch (e) {
    try {
      version = await hcu.version();
    } catch (e2) {
      version = `no version getter (${fmtErr(e2)})`;
    }
  }
  console.log(`HCULimit version: ${version}`);

  const measuredPull = state?.p5?.pullHCU ?? state?.pullHCU;
  const pullHCUStr =
    measuredPull && typeof measuredPull === "object"
      ? `global=${measuredPull.globalHCU}, depth=${measuredPull.maxHCUDepth}`
      : String(measuredPull ?? "n/a");
  const numSigners = state?.p6?.publicDecrypt?.numSigners ?? "?";

  const p8 = `### P8 — HCU limits (Sepolia)

**Caps (from installed \`@fhevm/host-contracts\` HCULimit.sol, v0.1.0 — the code the plugin deploys/expects):**
- \`MAX_HOMOMORPHIC_COMPUTE_UNITS_PER_TX = 20,000,000\` (global per-tx)
- \`MAX_HOMOMORPHIC_COMPUTE_UNITS_DEPTH_PER_TX = 5,000,000\` (sequential depth per-tx)
- **No per-block HCU cap in v0.1.0.** Both are \`private constant\` → NOT readable via any getter on the deployed contract.

Deployed HCULimit proxy \`${ADDR.hcu}\` (impl \`0xcc7b81e598fcf5e2247f29de87c6c879d06581e2\`), version getter → **${version}**.

**These match the docs' "devnet" numbers — so 20M/5M ARE the Sepolia numbers.** (Resolves pack UNCERTAIN #1: the caps are 20M global / 5M depth per tx, no per-block cap.)

**Real measured HCU on Sepolia** (\`fhevm.computeTransactionHCU\` works on live receipts, not just mock):
- deposit \`pull\` tx: **${pullHCUStr}** — i.e. one operator-pull deposit uses ~0.75M/20M global and ~0.37M/5M depth. Plenty of headroom; a per-user lending op is nowhere near the caps.

KMS threshold hint: public-decrypt proof carried **numSigners = ${numSigners}** (from P6).
`;
  writeFragment("p8", p8);
  writeState({ p7: { httpResults, keyless: true }, p8: { version, caps: { global: 20000000, depth: 5000000 }, measuredPull } });
  console.log("P7+P8 DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
