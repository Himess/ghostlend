import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// Market 0: collateral cWETH (eth leg), debt cUSDC. LLTV 80%.
// Market 1: collateral cUSDC, debt cWETH (eth leg). LLTV 80%.
const M0 = 0;
const ETH_PX_E8 = 2000n * 10n ** 8n; // $2000
const UNTIL = 4_000_000_000; // far-future operator expiry

// Error codes (must match GhostLendPool)
const E_OK = 0n;
const E_COLLATERAL = 1n;
const E_LIQUIDITY = 2n;

describe("GhostLendPool (CP1 core)", function () {
  let deployer: HardhatEthersSigner, lender: HardhatEthersSigner, borrower: HardhatEthersSigner;
  let cUSDC: any, cWETH: any, oracle: any, pool: any;
  let poolAddr: string, cUSDCAddr: string, cWETHAddr: string;

  before(async function () {
    if (!fhevm.isMock) {
      console.warn("GhostLendPool CP1 suite runs only in the FHEVM mock");
      this.skip();
    }
  });

  async function deployFixture() {
    [deployer, lender, borrower] = await ethers.getSigners();
    const Mock = await ethers.getContractFactory("ERC7984Mock");
    cUSDC = await Mock.deploy("Confidential USDC", "cUSDC", "");
    cWETH = await Mock.deploy("Confidential WETH", "cWETH", "");
    await cUSDC.waitForDeployment();
    await cWETH.waitForDeployment();
    cUSDCAddr = await cUSDC.getAddress();
    cWETHAddr = await cWETH.getAddress();

    const Agg = await ethers.getContractFactory("MockAggregator");
    const feed = await Agg.deploy(ETH_PX_E8, "ETH / USD (mock)");
    await feed.waitForDeployment();
    const Oracle = await ethers.getContractFactory("OracleAdapter");
    oracle = await Oracle.deploy(await feed.getAddress());
    await oracle.waitForDeployment();

    const Pool = await ethers.getContractFactory("GhostLendPool");
    const cfgs = [
      // collateral, debt, collIsEth, debtIsEth, lltvBps, liqBonusBps, reserveBps
      [cWETHAddr, cUSDCAddr, true, false, 8000, 500, 1000, ethers.ZeroAddress],
      [cUSDCAddr, cWETHAddr, false, true, 8000, 500, 1000, ethers.ZeroAddress],
    ];
    pool = await Pool.deploy(await oracle.getAddress(), ethers.ZeroAddress, cfgs);
    await pool.waitForDeployment();
    poolAddr = await pool.getAddress();
  }

  beforeEach(deployFixture);

  // helpers -------------------------------------------------------------
  async function fundAndApprove(token: any, user: HardhatEthersSigner, amount: bigint) {
    await (await token.mint(user.address, amount)).wait();
    await (await token.connect(user).setOperator(poolAddr, UNTIL)).wait();
  }
  async function enc(user: HardhatEthersSigner, amount: bigint) {
    return fhevm.createEncryptedInput(poolAddr, user.address).add64(amount).encrypt();
  }
  async function decPos(user: HardhatEthersSigner) {
    const p = await pool.positionOf(M0, user.address);
    const dec = async (h: string) =>
      h === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, h, poolAddr, user);
    return {
      scaledSupply: await dec(p[0]),
      collateral: await dec(p[1]),
      scaledDebt: await dec(p[2]),
      lastError: await dec(p[3]),
      nonce: p[4],
    };
  }
  async function decTokenBal(token: any, tokenAddr: string, user: HardhatEthersSigner) {
    const h = await token.confidentialBalanceOf(user.address);
    return h === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, h, tokenAddr, user);
  }

  // tests ---------------------------------------------------------------
  it("supply credits scaled principal (index 1e9 → 1:1)", async function () {
    await fundAndApprove(cUSDC, lender, 2_000_000_000n);
    const e = await enc(lender, 2_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();
    const p = await decPos(lender);
    expect(p.scaledSupply).to.eq(2_000_000_000n);
    expect(p.lastError).to.eq(E_OK);
  });

  it("depositCollateral credits raw collateral", async function () {
    await fundAndApprove(cWETH, borrower, 1_000_000n);
    const e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();
    const p = await decPos(borrower);
    expect(p.collateral).to.eq(1_000_000n);
  });

  it("borrow within LLTV: grants full amount, credits debt, pays out tokens", async function () {
    await fundAndApprove(cUSDC, lender, 2_000_000_000n);
    let e = await enc(lender, 2_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();

    await fundAndApprove(cWETH, borrower, 1_000_000n); // 1 WETH = $2000 collateral
    e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();

    // max borrow = $2000*0.8 = $1600 = 1.6e9 cUSDC base units. Borrow 1e9 (< limit).
    e = await enc(borrower, 1_000_000_000n);
    await (await pool.connect(borrower).borrow(M0, e.handles[0], e.inputProof)).wait();

    const p = await decPos(borrower);
    expect(p.scaledDebt).to.eq(1_000_000_000n);
    expect(p.lastError).to.eq(E_OK);
    expect(await decTokenBal(cUSDC, cUSDCAddr, borrower)).to.eq(1_000_000_000n);
  });

  it("over-borrow clamps to LLTV max and flags COLLATERAL", async function () {
    await fundAndApprove(cUSDC, lender, 5_000_000_000n);
    let e = await enc(lender, 5_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();

    await fundAndApprove(cWETH, borrower, 1_000_000n);
    e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();

    e = await enc(borrower, 2_000_000_000n); // ask $2000 > $1600 cap
    await (await pool.connect(borrower).borrow(M0, e.handles[0], e.inputProof)).wait();

    const p = await decPos(borrower);
    expect(p.scaledDebt).to.eq(1_600_000_000n); // clamped
    expect(p.lastError).to.eq(E_COLLATERAL);
  });

  it("repay reduces debt (clamped to owed)", async function () {
    await fundAndApprove(cUSDC, lender, 2_000_000_000n);
    let e = await enc(lender, 2_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();
    await fundAndApprove(cWETH, borrower, 1_000_000n);
    e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();
    e = await enc(borrower, 1_000_000_000n);
    await (await pool.connect(borrower).borrow(M0, e.handles[0], e.inputProof)).wait();

    // borrower now has 1e9 cUSDC; approve pool to pull for repay, repay 4e8
    await (await cUSDC.connect(borrower).setOperator(poolAddr, UNTIL)).wait();
    e = await enc(borrower, 400_000_000n);
    await (await pool.connect(borrower).repay(M0, e.handles[0], e.inputProof)).wait();

    const p = await decPos(borrower);
    expect(p.scaledDebt).to.eq(600_000_000n);
  });

  it("withdrawCollateral clamps to LLTV-free amount", async function () {
    await fundAndApprove(cUSDC, lender, 2_000_000_000n);
    let e = await enc(lender, 2_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();
    await fundAndApprove(cWETH, borrower, 1_000_000n);
    e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();
    e = await enc(borrower, 1_600_000_000n); // borrow the full $1600 → 0 free collateral
    await (await pool.connect(borrower).borrow(M0, e.handles[0], e.inputProof)).wait();

    // try to withdraw all collateral → should clamp to ~0 and flag COLLATERAL
    e = await enc(borrower, 1_000_000n);
    await (await pool.connect(borrower).withdrawCollateral(M0, e.handles[0], e.inputProof)).wait();
    const p = await decPos(borrower);
    expect(p.collateral).to.eq(1_000_000n); // nothing withdrawn (fully utilized)
    expect(p.lastError).to.eq(E_COLLATERAL);
  });

  it("withdrawSupply returns funds to lender", async function () {
    await fundAndApprove(cUSDC, lender, 2_000_000_000n);
    let e = await enc(lender, 2_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();
    e = await enc(lender, 500_000_000n);
    await (await pool.connect(lender).withdrawSupply(M0, e.handles[0], e.inputProof)).wait();
    const p = await decPos(lender);
    expect(p.scaledSupply).to.eq(1_500_000_000n);
    expect(await decTokenBal(cUSDC, cUSDCAddr, lender)).to.eq(500_000_000n);
  });

  it("HCU: deposit and borrow stay within ARCHITECTURE §8 targets", async function () {
    await fundAndApprove(cUSDC, lender, 3_000_000_000n);
    let e = await enc(lender, 3_000_000_000n);
    await (await pool.connect(lender).supply(M0, e.handles[0], e.inputProof)).wait();

    await fundAndApprove(cWETH, borrower, 1_000_000n);
    e = await enc(borrower, 1_000_000n);
    const depRc = await (await pool.connect(borrower).depositCollateral(M0, e.handles[0], e.inputProof)).wait();

    e = await enc(borrower, 1_000_000_000n);
    const borRc = await (await pool.connect(borrower).borrow(M0, e.handles[0], e.inputProof)).wait();

    const dep = fhevm.computeTransactionHCU(depRc);
    const bor = fhevm.computeTransactionHCU(borRc);
    console.log(`      HCU deposit: global=${dep.globalHCU} depth=${dep.maxHCUDepth}`);
    console.log(`      HCU borrow : global=${bor.globalHCU} depth=${bor.maxHCUDepth}`);
    // Real protocol caps (PROBE-RESULTS P8): 20M global / 5M sequential-depth per tx.
    expect(dep.globalHCU).to.be.lessThan(20_000_000);
    expect(dep.maxHCUDepth).to.be.lessThan(5_000_000);
    expect(bor.globalHCU).to.be.lessThan(20_000_000);
    expect(bor.maxHCUDepth).to.be.lessThan(5_000_000);
    // CP1 targets (index == 1e9 fast path): comfortably inside the caps (regression guards).
    expect(dep.globalHCU).to.be.lessThan(1_500_000);
    expect(bor.globalHCU).to.be.lessThan(6_000_000);
    expect(bor.maxHCUDepth).to.be.lessThan(3_500_000);
  });
});
