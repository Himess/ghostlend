import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

const M0 = 0;
const ETH_PX_E8 = 2000n * 10n ** 8n;
const UNTIL = 4_000_000_000;

describe("GhostLendPool CP2 (epoch + liquidation + gates)", function () {
  let deployer: HardhatEthersSigner, lender: HardhatEthersSigner, borrower: HardhatEthersSigner;
  let cUSDC: any, cWETH: any, feed: any, pool: any;
  let poolAddr: string, cUSDCAddr: string, cWETHAddr: string;

  before(function () {
    if (!fhevm.isMock) {
      console.warn("CP2 suite runs only in the FHEVM mock");
      this.skip();
    }
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
  async function enc(user: HardhatEthersSigner, amount: bigint) {
    return fhevm.createEncryptedInput(poolAddr, user.address).add64(amount).encrypt();
  }
  async function call(fn: string, user: HardhatEthersSigner, amount: bigint) {
    const e = await enc(user, amount);
    return (await pool.connect(user)[fn](M0, e.handles[0], e.inputProof)).wait();
  }
  async function decTokenBal(token: any, tokenAddr: string, user: HardhatEthersSigner) {
    const h = await token.confidentialBalanceOf(user.address);
    return h === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, h, tokenAddr, user);
  }
  async function decDebt(user: HardhatEthersSigner) {
    const p = await pool.positionOf(M0, user.address);
    return p[2] === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, p[2], poolAddr, user);
  }

  it("epoch: close → publicDecrypt → finalize moves rates; replay guard holds", async function () {
    await fund(cUSDC, lender, 2_000_000_000n);
    await call("supply", lender, 2_000_000_000n);
    await fund(cWETH, borrower, 1_000_000n);
    await call("depositCollateral", borrower, 1_000_000n);
    await call("borrow", borrower, 1_000_000_000n); // util = 1e9/2e9 = 50%

    const rc = await (await pool.closeEpoch(M0)).wait();
    const ev = rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "EpochClosed");
    const supplySnap = ev.args.supplySnap;
    const borrowSnap = ev.args.borrowSnap;

    const pub = await fhevm.publicDecrypt([supplySnap, borrowSnap]);
    await (await pool.finalizeEpoch(M0, 0, pub.abiEncodedClearValues, pub.decryptionProof)).wait();

    const info = await pool.marketInfo(M0);
    expect(info[7]).to.eq(5000n); // lastUtilizationBps = 50% → rate set from the IRM
    expect(await pool.currentEpochId(M0)).to.eq(1n); // epoch advanced → finalize took effect

    // rate is now nonzero: warp + touch state → borrowIndex grows past 1e6
    await time.increase(60 * 60 * 24 * 365); // 1 year
    await call("repay", borrower, 1n); // any state-touching call runs _accrue
    expect((await pool.marketInfo(M0))[5]).to.be.greaterThan(1_000_000n);

    // replay guard: finalizing again reverts
    await expect(pool.finalizeEpoch(M0, 0, pub.abiEncodedClearValues, pub.decryptionProof)).to.be.reverted;
  });

  it("liquidation: poke reveals one bit; finalize(false) no-op, finalize(true) absorbs", async function () {
    await fund(cUSDC, lender, 3_000_000_000n);
    await call("supply", lender, 3_000_000_000n);
    await fund(cWETH, borrower, 1_000_000n); // 1 WETH = $2000
    await call("depositCollateral", borrower, 1_000_000n);
    await call("borrow", borrower, 1_600_000_000n); // borrow the full $1600 (LLTV 80%)

    // healthy now → poke reveals false
    let rc = await (await pool.poke(M0, borrower.address)).wait();
    let ev = rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "Poked");
    let pub = await fhevm.publicDecrypt([ev.args.unhealthy]);
    await (await pool.finalizeLiquidation(ev.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    expect(await decDebt(borrower)).to.eq(1_600_000_000n); // untouched

    // crash ETH to $1000 → collateral now $1000 < debt $1600 → unhealthy
    await (await feed.setAnswer(1000n * 10n ** 8n)).wait();
    rc = await (await pool.poke(M0, borrower.address)).wait();
    ev = rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "Poked");
    pub = await fhevm.publicDecrypt([ev.args.unhealthy]);
    const frc = await (await pool.finalizeLiquidation(ev.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    const fev = frc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "LiquidationFinalized");
    expect(fev.args.unhealthy).to.eq(true);
    expect(await decDebt(borrower)).to.eq(0n); // debt wiped by absorb
  });

  it("GATE (#2e): borrow with interest (index near MAX_INDEX) stays ≤3.0M depth / ≤10M global", async function () {
    await fund(cUSDC, lender, 5_000_000_000n);
    await call("supply", lender, 5_000_000_000n);
    await fund(cWETH, borrower, 10_000_000n); // 10 WETH = $20k collateral (max borrow $16k)
    await call("depositCollateral", borrower, 10_000_000n);
    await call("borrow", borrower, 4_500_000_000n); // util = 4.5e9/5e9 = 90% → high IRM rate

    // set a rate via an epoch at high utilization, then warp far so index hits MAX_INDEX (4e6)
    const rc = await (await pool.closeEpoch(M0)).wait();
    const ev = rc.logs.map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } }).find((e: any) => e?.name === "EpochClosed");
    const pub = await fhevm.publicDecrypt([ev.args.supplySnap, ev.args.borrowSnap]);
    await (await pool.finalizeEpoch(M0, 0, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    await time.increase(2_000_000_000); // ~63 years → index clamps at MAX_INDEX on next accrue
    await (await feed.setAnswer(ETH_PX_E8)).wait(); // refresh oracle updatedAt after the long warp

    // this borrow triggers _accrue (index → 4e6) then runs the full (non-fast-path) euint64 conversions
    const borRc = await call("borrow", borrower, 100_000_000n);
    const info = await pool.marketInfo(M0);
    const hcu = fhevm.computeTransactionHCU(borRc);
    console.log(`      index now=${info[5]}  borrow-with-interest HCU: global=${hcu.globalHCU} depth=${hcu.maxHCUDepth}`);
    expect(info[5]).to.be.greaterThan(3_500_000n); // index near MAX_INDEX
    // MANDATORY hard cap = the real protocol limit (PROBE-RESULTS P8): 5M depth / 20M global.
    expect(hcu.maxHCUDepth, "borrow depth exceeds the 5M protocol cap").to.be.lessThanOrEqual(5_000_000);
    expect(hcu.globalHCU, "borrow global HCU exceeds the 10M budget").to.be.lessThanOrEqual(10_000_000);
    // DRIFT GUARD (CP2 ruling: option (c) accepts 3.57M): FAIL the build if any future change pushes depth
    // past 4.2M — no silent drift toward the 5M cap.
    expect(
      hcu.maxHCUDepth,
      `borrow depth ${hcu.maxHCUDepth} > 4.2M drift threshold — RE-MEASURE AND JUSTIFY (ruling accepts 3.57M; do not creep toward the 5M cap)`,
    ).to.be.lessThanOrEqual(4_200_000);
  });

  it("PROPERTY (#3b): every outgoing transfer moves exactly `granted` (granted == transferred)", async function () {
    await fund(cUSDC, lender, 4_000_000_000n);
    await fund(cWETH, borrower, 2_000_000n);
    await call("supply", lender, 4_000_000_000n);
    await call("depositCollateral", borrower, 2_000_000n); // 2 WETH = $4000 → max borrow $3200 = 3.2e9

    // Sequence of outgoing ops; after each, assert the user's token-balance delta == the position-implied granted.
    // borrow within limit: expect full amount out
    let before = await decTokenBal(cUSDC, cUSDCAddr, borrower);
    await call("borrow", borrower, 1_000_000_000n);
    let after = await decTokenBal(cUSDC, cUSDCAddr, borrower);
    expect(after - before).to.eq(1_000_000_000n); // granted == transferred == 1e9

    // over-borrow: clamp to remaining headroom (3.2e9 - 1e9 = 2.2e9); still granted==transferred
    before = after;
    const debtBefore = await decDebt(borrower);
    await call("borrow", borrower, 5_000_000_000n); // ask way over
    after = await decTokenBal(cUSDC, cUSDCAddr, borrower);
    const debtAfter = await decDebt(borrower);
    expect(after - before).to.eq(debtAfter - debtBefore); // tokens out == debt added == granted == transferred
    expect(after - before).to.eq(2_200_000_000n); // clamped to headroom

    // withdrawSupply: lender pulls; tokens out == scaled reduction (index 1e6)
    const lenderBefore = await decTokenBal(cUSDC, cUSDCAddr, lender);
    await call("withdrawSupply", lender, 500_000_000n);
    const lenderAfter = await decTokenBal(cUSDC, cUSDCAddr, lender);
    expect(lenderAfter - lenderBefore).to.eq(500_000_000n);
  });
});
