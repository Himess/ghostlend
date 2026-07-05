// Demo yield drip for the Market 2 vault: mints mock USDC straight into the vault so its share price rises
// (csteakcUSDC appreciates → real vault APY on the Vault/Leverage screens). Keeper discipline: run this
// BETWEEN GhostGate windows only — a drip while a window is open trips the drift guard (safe cancel, wasted
// round). Amount is capped at the 1M-tokens/call mock mint cap.
// Run: DRIP_USDC=50000 npx hardhat run scripts/drip-yield.ts --network sepolia
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const usdc = await ethers.getContractAt(["function mint(address,uint256)"], dep.tokens.usdcUnderlying);
  const vault = await ethers.getContractAt("MockYieldVault", dep.market2.vault);
  const p0 = await vault.sharePrice6();
  const amt = BigInt(process.env.DRIP_USDC || "50000") * 1_000_000n; // 6-dec base units
  const tx = await usdc.mint(dep.market2.vault, amt);
  await tx.wait();
  const p1 = await vault.sharePrice6();
  console.log(`dripped ${process.env.DRIP_USDC || "50000"} USDC → vault ${dep.market2.vault}`);
  console.log(`sharePrice6 ${p0} → ${p1}  (tx ${tx.hash})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
