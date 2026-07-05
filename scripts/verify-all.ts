// Verify the full production stack on Etherscan in one shot. Needs ETHERSCAN_API_KEY:
//   npx hardhat vars set ETHERSCAN_API_KEY <key>
// Run: npm run verify:all   (or: npx hardhat run scripts/verify-all.ts --network sepolia)
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function v(address: string, constructorArguments: any[], label: string) {
  try {
    await hre.run("verify:verify", { address, constructorArguments });
    console.log(`✓ ${label} ${address}`);
  } catch (e: any) {
    const m = e.message || String(e);
    if (/already verified/i.test(m)) console.log(`• ${label} already verified`);
    else console.log(`✗ ${label} ${address} — ${m.split("\n")[0]}`);
  }
}

async function main() {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const a = d.constructorArgs;
  await v(d.oracle, [d.chainlinkEthUsd], "OracleAdapter");
  await v(d.market2.vault, a.MockYieldVault, "MockYieldVault");
  await v(d.tokens.cSHARE, a.ConfidentialShareWrapper, "csteakcUSDC");
  await v(d.pool, a.GhostLendPool, "GhostLendPool");
  await v(d.market2.depositBatcher, a.DepositBatcher, "DepositBatcher");
  await v(d.market2.withdrawBatcher, a.WithdrawBatcher, "WithdrawBatcher");
  await v(d.ghostGate, a.GhostGate, "GhostGate");
}

main().catch((e) => { console.error(e); process.exit(1); });
