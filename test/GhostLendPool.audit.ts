import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// Regression tests for the deep-audit HIGH/M-1 fixes. Each test would FAIL against the pre-fix contract:
//   H-1  closeEpoch bricks / has no zero-aggregate guard
//   H-2  finalizeLiquidation over-seizes a cured borrower; poke has no dedup (double-seize)
//   M-1  deleverage credits availCash beyond the cash-backed (rebalanceQueue) portion
const M0 = 0;
const ETH_PX_E8 = 2000n * 10n ** 8n; // $2000
const UNTIL = 4_000_000_000;

describe("GhostLendPool — audit fixes (H-1 / H-2)", function () {
  let deployer: HardhatEthersSigner, lender: HardhatEthersSigner, borrower: HardhatEthersSigner;
  let cUSDC: any, cWETH: any, feed: any, pool: any;
  let poolAddr: string, cUSDCAddr: string, cWETHAddr: string;

  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  async function deployFixture() {
    [deployer, lender, borrower] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("ERC7984Mock");
    cUSDC = await Mock.deploy("cUSDC", "cUSDC", "");
    cWETH = await Mock.deploy("cWETH", "cWETH", "");
    await cUSDC.waitForDeployment();
    await cWETH.waitForDeployment();
    cUSDCAddr = await cUSDC.getAddress();
    cWETHAddr = await cWETH.getAddress();
    const Agg = await ethers.getContractFactory("MockAggregator");
    feed = await Agg.deploy(ETH_PX_E8, "ETH / USD (mock)");
    await feed.waitForDeployment();
    const Oracle = await ethers.getContractFactory("OracleAdapter");
    const oracle = await Oracle.deploy(await feed.getAddress());
    await oracle.waitForDeployment();
    const Pool = await ethers.getContractFactory("GhostLendPool");
    pool = await Pool.deploy(await oracle.getAddress(), ethers.ZeroAddress, [
      [cWETHAddr, cUSDCAddr, true, false, 8000, 500, 1000, ethers.ZeroAddress],
      [cUSDCAddr, cWETHAddr, false, true, 8000, 500, 1000, ethers.ZeroAddress],
    ]);
    await pool.waitForDeployment();
    poolAddr = await pool.getAddress();
  }
  beforeEach(deployFixture);

  async function fund(token: any, user: HardhatEthersSigner, amount: bigint) {
    await (await token.mint(user.address, amount)).wait();
    await (await token.connect(user).setOperator(poolAddr, UNTIL)).wait();
  }
  async function call(fn: string, user: HardhatEthersSigner, amount: bigint) {
    const e = await fhevm.createEncryptedInput(poolAddr, user.address).add64(amount).encrypt();
    return (await pool.connect(user)[fn](M0, e.handles[0], e.inputProof)).wait();
  }
  function ev(rc: any, name: string) {
    return rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === name);
  }
  async function decPos(user: HardhatEthersSigner) {
    const p = await pool.positionOf(M0, user.address);
    const d = async (h: string) => (h === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, h, poolAddr, user));
    return { collateral: await d(p[1]), scaledDebt: await d(p[2]) };
  }

  // ---- H-1 ----------------------------------------------------------------
  it("H-1(a): closeEpoch reverts on a never-touched (zero-activity) market", async function () {
    // No supply/borrow yet → the has-activity gate must reject. (Pre-fix: closeEpoch proceeds and snapshots
    // null aggregate handles, which the KMS rejects on finalize → the epoch machine bricks.)
    await expect(pool.closeEpoch(M0)).to.be.revertedWith("no activity");
  });

  it("H-1(b): a supply-only market (no borrows) can close+finalize to util 0", async function () {
    // aggScaledBorrow is the constructor baseline (a real trivial-0 handle). Pre-fix it would be the NULL
    // handle → publicDecrypt/finalize rejects → brick. This proves the baseline-0 handle is decryptable.
    await fund(cUSDC, lender, 2_000_000_000n);
    await call("supply", lender, 2_000_000_000n);

    const rc = await (await pool.closeEpoch(M0)).wait();
    const e = ev(rc, "EpochClosed");
    const pub = await fhevm.publicDecrypt([e.args.supplySnap, e.args.borrowSnap]); // borrowSnap == baseline(0)
    await (await pool.finalizeEpoch(M0, 0, pub.abiEncodedClearValues, pub.decryptionProof)).wait();

    const info = await pool.marketInfo(M0);
    expect(info[7]).to.eq(0n); // util 0 (no borrows), no skew from the baseline
    expect(await pool.currentEpochId(M0)).to.eq(1n); // finalized → advanced
  });

  it("H-1(c): an active market still finalizes to the exact utilization (baseline adds no skew)", async function () {
    await fund(cUSDC, lender, 2_000_000_000n);
    await call("supply", lender, 2_000_000_000n);
    await fund(cWETH, borrower, 1_000_000n);
    await call("depositCollateral", borrower, 1_000_000n);
    await call("borrow", borrower, 1_000_000_000n); // util = 1e9 / 2e9 = 50%

    const rc = await (await pool.closeEpoch(M0)).wait();
    const e = ev(rc, "EpochClosed");
    const pub = await fhevm.publicDecrypt([e.args.supplySnap, e.args.borrowSnap]);
    await (await pool.finalizeEpoch(M0, 0, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    expect((await pool.marketInfo(M0))[7]).to.eq(5000n); // exactly 50% — baseline(0) contributes nothing
  });

  // ---- H-2 ----------------------------------------------------------------
  async function setupUnhealthy() {
    await fund(cUSDC, lender, 3_000_000_000n);
    await call("supply", lender, 3_000_000_000n);
    await fund(cWETH, borrower, 1_000_000n); // 1 WETH = $2000
    await call("depositCollateral", borrower, 1_000_000n);
    await call("borrow", borrower, 1_600_000_000n); // full $1600 @ LLTV 80% (healthy at $2000)
    await (await feed.setAnswer(1000n * 10n ** 8n)).wait(); // crash to $1000 → coll $1000 < debt $1600 → unhealthy
  }

  it("H-2(b): a borrower who cures between poke and finalize is NOT seized", async function () {
    await setupUnhealthy();
    const rc = await (await pool.poke(M0, borrower.address)).wait();
    const e = ev(rc, "Poked");
    const pub = await fhevm.publicDecrypt([e.args.unhealthy]); // decrypts true at the crashed price

    // CURE: price recovers to $2000 → creditLimit $1600 == debt $1600 → healthy again.
    await (await feed.setAnswer(ETH_PX_E8)).wait();

    const before = await decPos(borrower);
    await (await pool.finalizeLiquidation(e.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    const after = await decPos(borrower);

    // Pre-fix: finalize seizes from the frozen snapshot and wipes debt regardless of the recovery.
    expect(after.collateral).to.eq(before.collateral); // collateral untouched
    expect(after.scaledDebt).to.eq(1_600_000_000n); // debt intact
  });

  it("H-2(b'): a still-unhealthy borrower IS seized (fix does not weaken real liquidation)", async function () {
    await setupUnhealthy();
    const rc = await (await pool.poke(M0, borrower.address)).wait();
    const e = ev(rc, "Poked");
    const pub = await fhevm.publicDecrypt([e.args.unhealthy]);
    // stays unhealthy (price left at $1000) through finalize
    const frc = await (await pool.finalizeLiquidation(e.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    expect(ev(frc, "LiquidationFinalized").args.unhealthy).to.eq(true);
    expect((await decPos(borrower)).scaledDebt).to.eq(0n); // debt wiped (real liquidation)
  });

  it("H-2(c): a second poke on the same position while one is pending reverts", async function () {
    await setupUnhealthy();
    await (await pool.poke(M0, borrower.address)).wait(); // first poke ok
    // Pre-fix: a second poke silently creates a second Pending poke → double-seize on double finalize.
    await expect(pool.poke(M0, borrower.address)).to.be.revertedWith("poke pending");
  });

  it("H-2(c'): after finalize, the position can be re-poked", async function () {
    await setupUnhealthy();
    let rc = await (await pool.poke(M0, borrower.address)).wait();
    let e = ev(rc, "Poked");
    let pub = await fhevm.publicDecrypt([e.args.unhealthy]);
    await (await pool.finalizeLiquidation(e.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    // block cleared on finalize → re-poke works
    await expect(pool.poke(M0, borrower.address)).to.not.be.reverted;
  });

  it("H-2 HCU: finalizeLiquidation seizure at MAX_INDEX stays under the 5M depth cap (Sepolia-viable)", async function () {
    // The new finalize re-checks live health (extra FHE ops). Verify the WORST case — a seizure at the full
    // interest index (non-fast-path _actualUp) — still fits the real Sepolia 5M HCU-depth cap, else liquidation
    // would revert on-chain. Uses ThrowawayDepthProbe to force the index.
    const Agg = await ethers.getContractFactory("MockAggregator");
    const f2 = await Agg.deploy(ETH_PX_E8, "ETH/USD");
    await f2.waitForDeployment();
    const Oracle = await ethers.getContractFactory("OracleAdapter");
    const orc = await Oracle.deploy(await f2.getAddress());
    await orc.waitForDeployment();
    const P = await ethers.getContractFactory("ThrowawayDepthProbe");
    const pl: any = await P.deploy(await orc.getAddress(), ethers.ZeroAddress, [
      [cWETHAddr, cUSDCAddr, true, false, 8000, 500, 1000, ethers.ZeroAddress],
    ]);
    await pl.waitForDeployment();
    const pa = await pl.getAddress();
    const encA = async (u: HardhatEthersSigner, amt: bigint) => fhevm.createEncryptedInput(pa, u.address).add64(amt).encrypt();

    await (await cUSDC.mint(lender.address, 3_000_000_000n)).wait();
    await (await cUSDC.connect(lender).setOperator(pa, UNTIL)).wait();
    let e = await encA(lender, 3_000_000_000n);
    await (await pl.connect(lender).supply(0, e.handles[0], e.inputProof)).wait();
    await (await cWETH.mint(borrower.address, 1_000_000n)).wait();
    await (await cWETH.connect(borrower).setOperator(pa, UNTIL)).wait();
    e = await encA(borrower, 1_000_000n);
    await (await pl.connect(borrower).depositCollateral(0, e.handles[0], e.inputProof)).wait();
    e = await encA(borrower, 500_000_000n); // healthy at open ($500 < $1600 limit)
    await (await pl.connect(borrower).borrow(0, e.handles[0], e.inputProof)).wait();

    await (await pl.setIndexForProbe(0, 4_000_000n, 1_000_000n)).wait(); // debt ×4 → $2000 > $1600 → unhealthy
    await (await f2.setAnswer(ETH_PX_E8)).wait(); // refresh oracle updatedAt after the index jump
    const rc = await (await pl.poke(0, borrower.address)).wait();
    const pe = rc.logs.map((l: any) => { try { return pl.interface.parseLog(l); } catch { return null; } }).find((x: any) => x?.name === "Poked");
    const pub = await fhevm.publicDecrypt([pe.args.unhealthy]);
    const frc = await (await pl.finalizeLiquidation(pe.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    const hcu = fhevm.computeTransactionHCU(frc);
    console.log(`      finalizeLiquidation @ MAX_INDEX (seizure): global=${hcu.globalHCU} depth=${hcu.maxHCUDepth}`);
    expect(hcu.maxHCUDepth, "finalizeLiquidation depth must stay under the 5M Sepolia HCU cap").to.be.lessThanOrEqual(5_000_000);
  });
});

describe("GhostLendPool — audit fix (M-1 deleverage accounting)", function () {
  let deployer: HardhatEthersSigner, lender: HardhatEthersSigner, user: HardhatEthersSigner;
  let USDC: any, cUSDC: any, vault: any, cSHARE: any, pool: any;
  let poolAddr: string, cUSDCAddr: string, cSHAREAddr: string, vaultAddr: string;
  const M2 = 0;

  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  beforeEach(async function () {
    [deployer, lender, user] = await ethers.getSigners();
    USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
    await USDC.waitForDeployment();
    const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
    cUSDC = await Wrapper.deploy(await USDC.getAddress());
    await cUSDC.waitForDeployment();
    vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
    await vault.waitForDeployment();
    cSHARE = await Wrapper.deploy(await vault.getAddress());
    await cSHARE.waitForDeployment();
    vaultAddr = await vault.getAddress();
    cUSDCAddr = await cUSDC.getAddress();
    cSHAREAddr = await cSHARE.getAddress();

    // ThrowawayDepthProbe: subclass with setIndexForProbe + debugGrantAvailCash/availCashHandle.
    const P = await ethers.getContractFactory("ThrowawayDepthProbe");
    pool = await P.deploy(ethers.ZeroAddress, ethers.ZeroAddress, [
      [cSHAREAddr, cUSDCAddr, false, false, 9000, 500, 1000, vaultAddr],
    ]);
    await pool.waitForDeployment();
    poolAddr = await pool.getAddress();

    // seed treasury 10e6 cSHARE
    await (await USDC.mint(deployer.address, 10_000_000n)).wait();
    await (await USDC.approve(vaultAddr, 10_000_000n)).wait();
    await (await vault.deposit(10_000_000n, deployer.address)).wait();
    await (await vault.approve(cSHAREAddr, 10_000_000n)).wait();
    await (await cSHARE.wrap(deployer.address, 10_000_000n)).wait();
    await (await cSHARE.setOperator(poolAddr, UNTIL)).wait();
    let e = await fhevm.createEncryptedInput(poolAddr, deployer.address).add64(10_000_000n).encrypt();
    await (await pool.seedTreasury(M2, e.handles[0], e.inputProof)).wait();

    // lender supplies 10e6 cUSDC liquidity → pool physical cUSDC = 10e6
    await (await USDC.mint(lender.address, 10_000_000n)).wait();
    await (await USDC.connect(lender).approve(cUSDCAddr, 10_000_000n)).wait();
    await (await cUSDC.connect(lender).wrap(lender.address, 10_000_000n)).wait();
    await (await cUSDC.connect(lender).setOperator(poolAddr, UNTIL)).wait();
    e = await fhevm.createEncryptedInput(poolAddr, lender.address).add64(10_000_000n).encrypt();
    await (await pool.connect(lender).supply(M2, e.handles[0], e.inputProof)).wait();
  });

  async function fundUserCUSDC(u: HardhatEthersSigner, amt: bigint) {
    await (await USDC.mint(u.address, amt)).wait();
    await (await USDC.connect(u).approve(cUSDCAddr, amt)).wait();
    await (await cUSDC.connect(u).wrap(u.address, amt)).wait();
    await (await cUSDC.connect(u).setOperator(poolAddr, UNTIL)).wait();
  }

  it("M-1: deleverage under accrued interest never inflates availCash above physical cash", async function () {
    const w = ethers.Wallet.createRandom().connect(ethers.provider);
    await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("1") })).wait();
    await fundUserCUSDC(w, 1_000_000n);

    // open lev 4: deposit 1e6 → collateral 4e6 shares, debt 3e6, rebalanceQueue 3e6, availCash 8e6.
    // pool physical cUSDC = 10e6 (lender) + 1e6 (deposit) = 11e6.
    let e = await fhevm.createEncryptedInput(poolAddr, w.address).add64(1_000_000n).add8(4).encrypt();
    await (await pool.connect(w).openLeveragedYield(M2, e.handles[0], e.handles[1], e.inputProof)).wait();

    // accrue interest: force borrowIndex ×2 → curDebt = scaledDebt(3e6)·2 = 6e6 > queued 3e6.
    await (await pool.setIndexForProbe(M2, 2_000_000n, 1_000_000n)).wait();

    // deleverage all 4e6 shares: shareValue 4e6, debtRepaid = min(4e6, curDebt 6e6) = 4e6 > queue 3e6.
    e = await fhevm.createEncryptedInput(poolAddr, w.address).add64(4_000_000n).encrypt();
    await (await pool.connect(w).deleverage(M2, e.handles[0], e.inputProof)).wait();

    // decrypt the internal availCash. Pre-fix: availCash = 8e6 + debtRepaid(4e6) = 12e6 > physical 11e6.
    // Fixed:   availCash = 8e6 + min(4e6, queue 3e6) = 11e6 == physical.
    await (await pool.debugGrantAvailCash(M2)).wait();
    const h = await pool.availCashHandle(M2);
    const availCash = await fhevm.userDecryptEuint(FhevmType.euint64, h, poolAddr, deployer);
    console.log(`      availCash after deleverage-under-interest = ${availCash} (physical = 11000000)`);
    expect(availCash).to.eq(11_000_000n); // exactly the cash-backed amount; no phantom cash
    expect(availCash).to.be.lessThanOrEqual(11_000_000n); // invariant: availCash ≤ physical
  });
});
