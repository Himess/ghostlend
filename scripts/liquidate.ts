// Phase B — REAL on-chain liquidation on live Sepolia (no faked health, no oracle manipulation).
// A fresh throwaway wallet opens a max-LTV M0 position (deposit cWETH, borrow cUSDC to the credit limit);
// real interest accrual then pushes debtActual past creditLimit, and we poke -> KMS-decrypt the ONE health
// bit -> finalizeLiquidation. Idempotent: re-run after the accrual wait; setup is skipped once the position
// exists, and a healthy poke is finalized (which clears the H-2 lock) so we can re-poke later.
//
//   Run: npx hardhat run scripts/liquidate.ts --network sepolia   (keeper MUST be off — nonce safety)
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as fs from "fs";
import * as path from "path";

const M = 0; // M0: cWETH collateral -> cUSDC debt (Chainlink-priced; oracle read only, never moved)
const FRESH_PK = "0x" + "a1".repeat(32); // throwaway TESTNET-ONLY key for the dedicated liquidation-test position
const COLL_UNITS = 300_000n; // 0.3 cWETH (6-dec units) — small dedicated position, doesn't touch seeded ones
const WETH_RATE = 1_000_000_000_000n; // cWETH wrapper rate (1e12)
const BORROW_ASK = 5_000_000_000n; // 5,000 cUSDC ask -> clamps down to the credit limit (max LTV)

function ev(pool: any, rc: any, name: string) {
  return rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === name);
}

async function main() {
  await fhevm.initializeCLIApi();
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider!;
  const fresh = new ethers.Wallet(FRESH_PK, provider);
  const poolAddr = d.pool as string;
  console.log("pool:", poolAddr, "\nfresh position owner:", fresh.address);

  const fee = await provider.getFeeData();
  const OV: any = {
    maxFeePerGas: (fee.maxFeePerGas ?? 2_000_000_000n) * 2n,
    maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei floor for reliable inclusion
  };
  const OVG = { ...OV }; // no explicit gasLimit — let ethers estimate (upfront reservation stays affordable)

  const pool = await ethers.getContractAt("GhostLendPool", poolAddr);
  const poolF = pool.connect(fresh) as any;
  const cWETH = new ethers.Contract(d.tokens.cWETH, ["function wrap(address,uint256) returns (bytes32)", "function setOperator(address,uint48)", "function confidentialBalanceOf(address) view returns (bytes32)"], fresh);
  const WETH = new ethers.Contract(d.tokens.wethUnderlying, ["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"], fresh);

  const dec = async (h: string) => (h === ethers.ZeroHash ? 0n : await fhevm.userDecryptEuint(FhevmType.euint64, h, poolAddr, fresh));
  const decPos = async () => { const p = await pool.positionOf(M, fresh.address); return { collateral: await dec(p[1]), scaledDebt: await dec(p[2]), nonce: Number(p[4]) }; };

  const nonce0 = Number((await pool.positionOf(M, fresh.address))[4]);

  // ---------- SETUP (only if the fresh position doesn't exist yet) ----------
  if (nonce0 === 0) {
    console.log("\n== SETUP: fund gas + wrap collateral + max-LTV borrow ==");
    if ((await provider.getBalance(fresh.address)) < ethers.parseEther("0.06")) {
      await (await deployer.sendTransaction({ to: fresh.address, value: ethers.parseEther("0.04"), ...OV })).wait();
      console.log("  topped up gas (only deployer-key tx)");
    }
    const underlying = COLL_UNITS * WETH_RATE;
    if ((await cWETH.confidentialBalanceOf(fresh.address)) === ethers.ZeroHash) {
      await (await WETH.mint(fresh.address, underlying, OV)).wait();
      await (await WETH.approve(d.tokens.cWETH, underlying, OV)).wait();
      await (await cWETH.wrap(fresh.address, underlying, OV)).wait();
      console.log("  minted + wrapped", COLL_UNITS.toString(), "cWETH units");
    } else {
      console.log("  cWETH already wrapped — skipping mint/wrap");
    }
    await (await cWETH.setOperator(poolAddr, Math.floor(Date.now() / 1000) + 86400, OV)).wait();
    console.log("  operator set");
    const ec = await fhevm.createEncryptedInput(poolAddr, fresh.address).add64(COLL_UNITS).encrypt();
    await (await poolF.depositCollateral(M, ec.handles[0], ec.inputProof, OVG)).wait();
    console.log("  deposited collateral");
    const eb = await fhevm.createEncryptedInput(poolAddr, fresh.address).add64(BORROW_ASK).encrypt();
    const brc = await (await poolF.borrow(M, eb.handles[0], eb.inputProof, OVG)).wait();
    console.log("  borrowed to max (clamped to credit limit), tx:", brc.hash);
  } else {
    console.log("\n== fresh position exists (nonce", nonce0, ") — skipping setup, going straight to poke ==");
  }

  const before = await decPos();
  console.log("\nBEFORE — collateral:", before.collateral.toString(), "| scaledDebt:", before.scaledDebt.toString());

  // ---------- POKE (permissionless, fresh wallet) ----------
  console.log("\n== POKE ==");
  const prc = await (await poolF.poke(M, fresh.address, OVG)).wait();
  const pk = ev(pool, prc, "Poked");
  const pokeId = pk.args.pokeId;
  console.log("  poke tx:", prc.hash, "| pokeId:", pokeId.toString());

  // ---------- KMS-decrypt the ONE health bit ----------
  const pub = await fhevm.publicDecrypt([pk.args.unhealthy]);
  const bit = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], pub.abiEncodedClearValues)[0] as bigint;
  const unhealthy = bit !== 0n;
  console.log("  KMS-decrypted health bit:", unhealthy ? "🔴 UNHEALTHY" : "🟢 healthy");

  // ---------- FINALIZE ----------
  console.log("\n== FINALIZE ==");
  const frc = await (await poolF.finalizeLiquidation(pokeId, pub.abiEncodedClearValues, pub.decryptionProof, OVG)).wait();
  console.log("  finalize tx:", frc.hash);

  const nextPoke = await pool.nextPokeId();
  if (unhealthy) {
    const after = await decPos();
    console.log("\n=== ✅ LIQUIDATION EXECUTED LIVE ON SEPOLIA ===");
    console.log("poke tx     :", prc.hash);
    console.log("finalize tx :", frc.hash);
    console.log("nextPokeId  :", nextPoke.toString(), "(was 0)");
    console.log("BEFORE      : collateral", before.collateral.toString(), "| debt", before.scaledDebt.toString());
    console.log("AFTER       : collateral", after.collateral.toString(), "| debt", after.scaledDebt.toString());
    console.log(after.scaledDebt === 0n ? ">>> debt WIPED and collateral seized ✓" : ">>> check: debt not fully wiped");
  } else {
    console.log("\n== Position is at the limit but rounding didn't tip it yet. The finalize just cleared the H-2 lock.");
    console.log("== nextPokeId is now", nextPoke.toString(), "(a real poke DID execute). WAIT ~18-20 min (keeper OFF, do NOT touch M0),");
    console.log("== then RE-RUN this script — real interest accrual will push debtActual past creditLimit and liquidate.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
