import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// Market 2 (leveraged yield): collateral cSHARE, debt cUSDC, priced by MockYieldVault.sharePrice6().
const M2 = 0; // single-market pool in this suite
const UNTIL = 4_000_000_000;

describe("Market 2 — openLeveragedYield / deleverage (B.5)", function () {
  let deployer: HardhatEthersSigner, lender: HardhatEthersSigner, user: HardhatEthersSigner;
  let USDC: any, cUSDC: any, vault: any, cSHARE: any, pool: any;
  let poolAddr: string, cUSDCAddr: string, cSHAREAddr: string, vaultAddr: string, shareAddr: string;

  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  async function setup(Factory = "GhostLendPool") {
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
    shareAddr = vaultAddr;

    const P = await ethers.getContractFactory(Factory);
    // Market 2: [cSHARE, cUSDC, false, false, lltv 9000, liqBonus 500, reserve 1000, vault]
    pool = await P.deploy(ethers.ZeroAddress, ethers.ZeroAddress, [
      [cSHAREAddr, cUSDCAddr, false, false, 9000, 500, 1000, vaultAddr],
    ]);
    await pool.waitForDeployment();
    poolAddr = await pool.getAddress();

    // seed treasury with 10e6 cSHARE (deposit USDC → shares → wrap → seedTreasury)
    await (await USDC.mint(deployer.address, 10_000_000n)).wait();
    await (await USDC.approve(vaultAddr, 10_000_000n)).wait();
    await (await vault.deposit(10_000_000n, deployer.address)).wait();
    await (await vault.approve(cSHAREAddr, 10_000_000n)).wait();
    await (await cSHARE.wrap(deployer.address, 10_000_000n)).wait();
    await (await cSHARE.setOperator(poolAddr, UNTIL)).wait();
    let e = await fhevm.createEncryptedInput(poolAddr, deployer.address).add64(10_000_000n).encrypt();
    await (await pool.seedTreasury(M2, e.handles[0], e.inputProof)).wait();

    // lender supplies 10e6 cUSDC liquidity (enables the leverage debt draw)
    await (await USDC.mint(lender.address, 10_000_000n)).wait();
    await (await USDC.connect(lender).approve(cUSDCAddr, 10_000_000n)).wait();
    await (await cUSDC.connect(lender).wrap(lender.address, 10_000_000n)).wait();
    await (await cUSDC.connect(lender).setOperator(poolAddr, UNTIL)).wait();
    e = await fhevm.createEncryptedInput(poolAddr, lender.address).add64(10_000_000n).encrypt();
    await (await pool.connect(lender).supply(M2, e.handles[0], e.inputProof)).wait();
  }

  async function fundUserCUSDC(u: HardhatEthersSigner, amt: bigint) {
    await (await USDC.mint(u.address, amt)).wait();
    await (await USDC.connect(u).approve(cUSDCAddr, amt)).wait();
    await (await cUSDC.connect(u).wrap(u.address, amt)).wait();
    await (await cUSDC.connect(u).setOperator(poolAddr, UNTIL)).wait();
  }
  async function openLev(u: HardhatEthersSigner, deposit: bigint, lev: number) {
    const e = await fhevm.createEncryptedInput(poolAddr, u.address).add64(deposit).add8(lev).encrypt();
    return (await pool.connect(u).openLeveragedYield(M2, e.handles[0], e.handles[1], e.inputProof)).wait();
  }
  async function decPos(u: HardhatEthersSigner) {
    const p = await pool.positionOf(M2, u.address);
    const d = async (h: string) => (h === ethers.ZeroHash ? 0n : fhevm.userDecryptEuint(FhevmType.euint64, h, poolAddr, u));
    return { collateral: await d(p[1]), scaledDebt: await d(p[2]) };
  }

  it("born healthy: lev 2/3/4 give debt/collateral = (lev-1)/lev ≤ 75% < 90% LLTV", async function () {
    await setup();
    for (const [signer, lev, coll, debt] of [
      [lender, 2, 2_000_000n, 1_000_000n],
      [user, 3, 3_000_000n, 2_000_000n],
      [deployer, 4, 4_000_000n, 3_000_000n],
    ] as [HardhatEthersSigner, number, bigint, bigint][]) {
      // fresh signer each — use a random wallet funded for gas
      const w = ethers.Wallet.createRandom().connect(ethers.provider);
      await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("1") })).wait();
      await fundUserCUSDC(w, 1_000_000n);
      await openLev(w, 1_000_000n, lev);
      const pos = await decPos(w);
      expect(pos.collateral).to.eq(coll);
      expect(pos.scaledDebt).to.eq(debt);
      // health: debt ≤ collateralValue(=coll at sp6≈1e6) × 90%
      expect(pos.scaledDebt * 10000n).to.be.lessThanOrEqual(pos.collateral * 9000n);
      console.log(`      lev ${lev}: collateral=${pos.collateral} debt=${pos.scaledDebt} (ratio ${(Number(debt) / Number(coll) * 100).toFixed(1)}%)`);
    }
  });

  it("deleverage closes: shares to treasury, debt repaid from share value, remainder to user", async function () {
    await setup();
    const w = ethers.Wallet.createRandom().connect(ethers.provider);
    await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("1") })).wait();
    await fundUserCUSDC(w, 1_000_000n);
    await openLev(w, 1_000_000n, 4); // collateral 4e6 shares, debt 3e6
    // close all 4e6 shares: shareValue 4e6 - debt 3e6 = 1e6 cUSDC remainder to user
    const e = await fhevm.createEncryptedInput(poolAddr, w.address).add64(4_000_000n).encrypt();
    await (await pool.connect(w).deleverage(M2, e.handles[0], e.inputProof)).wait();
    const pos = await decPos(w);
    expect(pos.collateral).to.eq(0n);
    expect(pos.scaledDebt).to.eq(0n);
    const cusdcBal = await cUSDC.confidentialBalanceOf(w.address);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, cusdcBal, cUSDCAddr, w);
    console.log(`      after close: collateral=0 debt=0 user cUSDC payout=${bal}`);
    expect(bal).to.eq(1_000_000n); // deposit back (share appreciated 0 in this window)
  });

  it("HCU: openLeveragedYield at MAX_INDEX clears the 4.2M drift guard", async function () {
    await setup("ThrowawayDepthProbe");
    const w = ethers.Wallet.createRandom().connect(ethers.provider);
    await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("1") })).wait();
    await fundUserCUSDC(w, 1_000_000n);
    await openLev(w, 1_000_000n, 2); // seed a position at index 1e6
    await (await pool.setIndexForProbe(M2, 4_000_000n, 4_000_000n)).wait();
    await fundUserCUSDC(w, 1_000_000n);
    const rc = await openLev(w, 1_000_000n, 4); // measured op at MAX_INDEX
    const hcu = fhevm.computeTransactionHCU(rc);
    console.log(`      openLeveragedYield @ MAX_INDEX: global=${hcu.globalHCU} depth=${hcu.maxHCUDepth}`);
    expect(hcu.maxHCUDepth).to.be.lessThanOrEqual(4_200_000);
    expect(hcu.globalHCU).to.be.lessThanOrEqual(10_000_000);
  });
});
