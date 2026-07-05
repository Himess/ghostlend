// CP6 demo seeding — puts realistic, non-zero state on the LIVE Sepolia deploy so the UI shows sensible
// numbers before the video. Single funded wallet (the deployer 0xF505… = the wallet you connect in the
// demo) plays every role, so My Position shows real decryptable positions and the aggregates (utilization,
// total supplied) are identical to a multi-wallet scene. Modest testnet amounts — not stress testing.
//
// Order: mint+shield → setOperator → vault deposit (csteakcUSDC + Total Deposits) → seedTreasury(M2) →
//        supply liquidity (M0/M1/M2) → deposit collateral + borrow (M0/M1) → openLeveragedYield(M2, 3×) →
//        drive one epoch pass per market (close+finalize) so utilization/rates/aggregates refresh → REPORT.
//
// Run (stop the keeper first to avoid epoch races):  npx hardhat run scripts/seed-demo.ts --network sepolia
import { ethers, fhevm } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const E6 = 1_000_000n; // one 6-dec unit
const UNTIL = 4_000_000_000; // operator approval expiry (year 2096)
const WETH_RATE = 1_000_000_000_000n; // cWETH wrapper rate (1e12): 1 cWETH unit = 1e12 wei underlying

// ---- modest amounts (base units; cUSDC/cWETH are 6-dec confidential) ----
const M0_SUPPLY = 50_000n * E6; // cUSDC liquidity
const M0_COLL_USD = 60_000n; // cWETH collateral target value ($) — 3× the borrow for safe headroom
const M0_BORROW = 20_000n * E6; // borrow cUSDC → util ~40%
const M1_SUPPLY_WETH = 5n * E6; // 5 cWETH liquidity
const M1_COLL = 20_000n * E6; // cUSDC collateral
const M1_BORROW_WETH = 2n * E6; // borrow 2 cWETH → util ~40%
const M2_SUPPLY = 40_000n * E6; // cUSDC liquidity
const M2_TREASURY = 60_000n * E6; // csteakcUSDC seeded into the M2 treasury
const LEV_DEPOSIT = 10_000n * E6; // cUSDC leverage deposit
const LEV = 3; // 3× → borrows 20k → util ~50%
const VAULT_EXTRA = 20_000n * E6; // extra vault deposit the wallet keeps as csteakcUSDC

function irmAprPct(utilBps: number): number {
  const u = Math.min(10000, Math.max(0, utilBps));
  const aprBps = u <= 8000 ? 200 + (400 * u) / 8000 : 200 + 400 + (6000 * (u - 8000)) / 2000;
  return aprBps / 100;
}
const supplyApyPct = (u: number, r = 1000) => (irmAprPct(u) * u * (10000 - r)) / 1e8;

async function main() {
  await fhevm.initializeCLIApi();
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const [me] = await ethers.getSigners();
  console.log(`seeding as ${me.address}  bal ${ethers.formatEther(await ethers.provider.getBalance(me.address))} ETH\n`);

  const pool = await ethers.getContractAt("GhostLendPool", d.pool);
  const vault = await ethers.getContractAt("MockYieldVault", d.market2.vault);
  const oracle = await ethers.getContractAt("OracleAdapter", d.oracle);
  const wAbi = ["function wrap(address,uint256) returns (bytes32)", "function setOperator(address,uint48)", "function confidentialBalanceOf(address) view returns (bytes32)"];
  const cUSDC = await ethers.getContractAt(wAbi, d.tokens.cUSDC);
  const cWETH = await ethers.getContractAt(wAbi, d.tokens.cWETH);
  const cSHARE = await ethers.getContractAt(wAbi, d.tokens.cSHARE);
  const erc = ["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"];
  const USDC = await ethers.getContractAt(erc, d.tokens.usdcUnderlying);
  const WETH = await ethers.getContractAt(erc, d.tokens.wethUnderlying);
  const vaultShareErc = await ethers.getContractAt(erc, d.market2.vault);

  const priceE8 = BigInt(await oracle.priceE8());
  const ethUsd = Number(priceE8) / 1e8;
  console.log(`ETH/USD (Chainlink) = $${ethUsd.toFixed(2)}`);
  const m0CollWeth = (M0_COLL_USD * 10n ** 14n) / priceE8; // cWETH 6-dec units worth $M0_COLL_USD
  console.log(`M0 collateral = ${(Number(m0CollWeth) / 1e6).toFixed(3)} cWETH (~$${M0_COLL_USD})\n`);

  // Gas overrides — Sepolia fee data is frequently too low (esp. the priority fee), which causes
  // "gas too low" / "replacement transaction underpriced". Bump generously so every tx confirms.
  const fee = await ethers.provider.getFeeData();
  const OV = {
    maxFeePerGas: (fee.maxFeePerGas ?? 2_000_000_000n) * 3n,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas && fee.maxPriorityFeePerGas > 1_500_000_000n ? fee.maxPriorityFeePerGas : 1_500_000_000n,
  };
  console.log(`gas override: maxFee ${Number(OV.maxFeePerGas) / 1e9} gwei · maxPrio ${Number(OV.maxPriorityFeePerGas) / 1e9} gwei\n`);

  const tx = (p: Promise<any>) => p.then((t: any) => t.wait());
  const encP = (a: bigint) => fhevm.createEncryptedInput(d.pool, me.address).add64(a).encrypt();

  // helpers: fund confidential balances (OV appended to every write)
  async function mintWrapUSDC(units: bigint) {
    await tx(USDC.mint(me.address, units, OV));
    await tx(USDC.approve(d.tokens.cUSDC, units, OV));
    await tx(cUSDC.wrap(me.address, units, OV)); // rate 1 → `units` cUSDC
  }
  async function mintWrapWETH(cwethUnits: bigint) {
    const wei = cwethUnits * WETH_RATE;
    await tx(WETH.mint(me.address, wei, OV));
    await tx(WETH.approve(d.tokens.cWETH, wei, OV));
    await tx(cWETH.wrap(me.address, wei, OV)); // rate 1e12 → cwethUnits cWETH
  }
  async function vaultDepositWrap(usdcUnits: bigint) {
    await tx(USDC.mint(me.address, usdcUnits, OV));
    await tx(USDC.approve(d.market2.vault, usdcUnits, OV));
    await tx(vault.deposit(usdcUnits, me.address, OV)); // → vault shares (1:1 at price 1.0)
    const shares = await vault.balanceOf(me.address);
    await tx(vaultShareErc.approve(d.tokens.cSHARE, shares, OV));
    await tx(cSHARE.wrap(me.address, shares, OV)); // → csteakcUSDC
    return shares;
  }
  async function poolOp(fn: string, marketId: number, amt: bigint) {
    const e = await encP(amt);
    await tx((pool as any)[fn](marketId, e.handles[0], e.inputProof, OV));
  }
  (globalThis as any).__OV = OV; // share with driveEpoch

  // ---- 1. operator approvals (once) ----
  console.log("1) operator approvals…");
  await tx(cUSDC.setOperator(d.pool, UNTIL, OV));
  await tx(cWETH.setOperator(d.pool, UNTIL, OV));
  await tx(cSHARE.setOperator(d.pool, UNTIL, OV));

  // ---- 2. vault deposit → csteakcUSDC exists + Total Deposits > 0 ----
  console.log("2) vault deposit (csteakcUSDC + treasury supply)…");
  await vaultDepositWrap(M2_TREASURY + VAULT_EXTRA); // one deposit funds both treasury seed + a kept balance

  // ---- 3. seed Market 2 treasury with csteakcUSDC ----
  console.log("3) seedTreasury(M2)…");
  await poolOp("seedTreasury", 2, M2_TREASURY);

  // ---- 4. supply liquidity to all 3 markets ----
  console.log("4) supply liquidity M0/M1/M2…");
  await mintWrapUSDC(M0_SUPPLY);
  await poolOp("supply", 0, M0_SUPPLY);
  await mintWrapWETH(M1_SUPPLY_WETH);
  await poolOp("supply", 1, M1_SUPPLY_WETH);
  await mintWrapUSDC(M2_SUPPLY);
  await poolOp("supply", 2, M2_SUPPLY);

  // ---- 5. collateral + borrow on M0 (cWETH→cUSDC) and M1 (cUSDC→cWETH) ----
  console.log("5) collateral + borrow M0…");
  await mintWrapWETH(m0CollWeth);
  await poolOp("depositCollateral", 0, m0CollWeth);
  await poolOp("borrow", 0, M0_BORROW);

  console.log("6) collateral + borrow M1…");
  await mintWrapUSDC(M1_COLL);
  await poolOp("depositCollateral", 1, M1_COLL);
  await poolOp("borrow", 1, M1_BORROW_WETH);

  // ---- 7. one 3× leverage position on Market 2 ----
  console.log("7) openLeveragedYield(M2, 3×)…");
  await mintWrapUSDC(LEV_DEPOSIT);
  {
    const e = await fhevm.createEncryptedInput(d.pool, me.address).add64(LEV_DEPOSIT).add8(LEV).encrypt();
    await tx(pool.openLeveragedYield(2, e.handles[0], e.handles[1], e.inputProof, OV));
  }

  // ---- 8. drive one epoch pass per market so utilization/rates/aggregates refresh ----
  console.log("\n8) epoch pass (close + finalize) so utilization/rates update…");
  const utilOf: Record<number, number> = {};
  const suppliedOf: Record<number, bigint> = {};
  for (const mkt of [0, 1, 2]) {
    utilOf[mkt] = await driveEpoch(pool, mkt, suppliedOf);
  }

  // ---- 9. report ----
  const names = ["cWETH → cUSDC", "cUSDC → cWETH", "csteakcUSDC → cUSDC"];
  const debtTok = ["cUSDC", "cWETH", "cUSDC"];
  const totalAssets = await vault.totalAssets();
  console.log(`\n================= ON-CHAIN STATE AFTER SEEDING =================`);
  for (const mkt of [0, 1, 2]) {
    const u = utilOf[mkt];
    console.log(
      `Market ${mkt} (${names[mkt]}):  supplied ≈ ${(Number(suppliedOf[mkt]) / 1e6).toLocaleString()} ${debtTok[mkt]}` +
        ` · utilization ${(u / 100).toFixed(1)}% · borrow APR ${irmAprPct(u).toFixed(2)}% · supply APY ${supplyApyPct(u).toFixed(2)}%`,
    );
  }
  console.log(`Vault total deposits: ${(Number(totalAssets) / 1e6).toLocaleString()} cUSDC · sharePrice6 ${await vault.sharePrice6()}`);
  console.log(`Leverage position on M2: deposit ${Number(LEV_DEPOSIT) / 1e6} cUSDC at ${LEV}× (collateral ${(Number(LEV_DEPOSIT) / 1e6) * LEV}k csteakcUSDC / debt ${(Number(LEV_DEPOSIT) / 1e6) * (LEV - 1)}k cUSDC)`);
  console.log(`================================================================`);
  console.log(`\nConnect ${me.address} in the browser → Dashboard/Markets show these; My Position → Decrypt shows the positions.`);
}

// Single-epoch driver for a FRESH pool with the keeper OFF: epoch 0 is not yet closed, so close it (which
// snapshots the just-seeded aggregates) and finalize straight from the TX RECEIPT — no historical getLogs,
// so we never hit the public RPC's archive limit. (Closing an epoch BEFORE liquidity exists would freeze a
// zero-handle snapshot that can't be made publicly decryptable → the epoch machine bricks; that is exactly
// why seeding must precede the first close and no keeper may run in between.)
async function driveEpoch(pool: any, marketId: number, suppliedOut: Record<number, bigint>): Promise<number> {
  const OV = (globalThis as any).__OV || {};
  const rc = await (await pool.closeEpoch(marketId, OV)).wait();
  const ev = rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((x: any) => x?.name === "EpochClosed");
  const pub = await fhevm.publicDecrypt([ev.args.supplySnap, ev.args.borrowSnap]);
  await (await pool.finalizeEpoch(marketId, Number(ev.args.epochId), pub.abiEncodedClearValues, pub.decryptionProof, (globalThis as any).__OV || {})).wait();
  // capture revealed scaled supply × supplyIndex → actual supplied
  const info = await pool.marketInfo(marketId);
  const supplyIndex = BigInt(info[6]);
  const scaledSupply = BigInt(pub.clearValues[ev.args.supplySnap as keyof typeof pub.clearValues] as any);
  suppliedOut[marketId] = (scaledSupply * supplyIndex) / 1_000_000n;
  console.log(`   market ${marketId} epoch ${ev.args.epochId} finalized · util ${Number(info[7]) / 100}%`);
  return Number(info[7]); // lastUtilizationBps
}

main().catch((e) => { console.error(e); process.exit(1); });
