// Redeploy ONLY GhostLendPool (M0/M1/M2), reusing the live oracle/tokens/vault/cSHARE. The first production
// pool's epoch machine bricked: the keeper closed epoch 0 while the pool was empty, freezing a zero-handle
// aggregate snapshot that can't be made publicly decryptable — so closeEpoch reverts "prev pending" forever
// and utilization can never refresh. A fresh pool + seeding BEFORE the first epoch close (snapshots are then
// non-zero → finalizable) fixes it cleanly without touching GhostGate/vault/batchers/tokens.
// Run: npx hardhat run scripts/redeploy-pool.ts --network sepolia
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const dir = path.join(__dirname, "..", "deployments");
  const d = JSON.parse(fs.readFileSync(path.join(dir, "sepolia.json"), "utf8"));
  const [me] = await ethers.getSigners();
  const cUSDC = d.tokens.cUSDC, cWETH = d.tokens.cWETH, cSHARE = d.tokens.cSHARE, vault = d.market2.vault, oracle = d.oracle;
  const Z = ethers.ZeroAddress;
  const M0 = [cWETH, cUSDC, true, false, 8000, 500, 1000, Z];
  const M1 = [cUSDC, cWETH, false, true, 8000, 500, 1000, Z];
  const M2 = [cSHARE, cUSDC, false, false, 9000, 500, 1000, vault];

  const prev = d.pool;
  const pool = await (await ethers.getContractFactory("GhostLendPool")).deploy(oracle, Z, [M0, M1, M2]);
  await pool.waitForDeployment();
  const poolA = await pool.getAddress();
  console.log(`GhostLendPool redeployed: ${poolA}  (was ${prev}) markets=${await pool.marketCount()}`);

  d.pool = poolA;
  d.constructorArgs = d.constructorArgs || {};
  d.constructorArgs.GhostLendPool = [oracle, Z, [M0, M1, M2]];
  d.previousPool = prev;
  fs.writeFileSync(path.join(dir, "sepolia.json"), JSON.stringify(d, null, 2));
  console.log(`Updated deployments/sepolia.json → pool ${poolA}`);
  console.log(`\nStill need to update: frontend/lib/addresses.ts (ADDR.pool), deployments/ADDRESSES.md, deployments/verify-pool.js`);
}

main().catch((e) => { console.error(e); process.exit(1); });
