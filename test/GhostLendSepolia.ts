// Sepolia smoke test — runs ONLY on --network sepolia (skips in mock). Uses the deployed core.
// npx hardhat test test/GhostLendSepolia.ts --network sepolia
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

const WRAPPER_ABI = [
  "function decimals() view returns (uint8)",
  "function confidentialBalanceOf(address) view returns (bytes32)",
  "function setOperator(address operator, uint48 until)",
  "function wrap(address to, uint256 amount) returns (bytes32)",
];
const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 value) returns (bool)",
];

describe("GhostLend Sepolia smoke", function () {
  this.timeout(10 * 60 * 1000);
  let pool: any, poolAddr: string, cUSDC: string, cUSDCUnderlying: string;
  let deployer: any;

  before(async function () {
    if (fhevm.isMock) {
      console.warn("Sepolia smoke test skipped in mock");
      this.skip();
    }
    await fhevm.initializeCLIApi();
    const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia-core.json"), "utf8"));
    poolAddr = dep.pool;
    cUSDC = dep.tokens.cUSDC;
    cUSDCUnderlying = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
    pool = await ethers.getContractAt("GhostLendPool", poolAddr);
    [deployer] = await ethers.getSigners();
  });

  // The KEY CP1-review #5 check: a never-funded account must NOT hit ERC7984ZeroBalance — the pool's
  // _pullClamped zero-handle pre-check short-circuits before confidentialTransferFrom would revert.
  it("zero-handle pre-check: supply from a never-funded account succeeds (no ERC7984ZeroBalance)", async function () {
    const Y = ethers.Wallet.createRandom().connect(ethers.provider);
    const fund = await deployer.sendTransaction({ to: Y.address, value: ethers.parseEther("0.03") });
    await fund.wait();
    console.log(`      throwaway Y=${Y.address} (never held cUSDC)`);

    const enc = await fhevm.createEncryptedInput(poolAddr, Y.address).add64(1000n).encrypt();
    // Market 0 debt token = cUSDC. Y has a zero balance handle → pre-check returns encrypted 0.
    const tx = await pool.connect(Y).supply(0, enc.handles[0], enc.inputProof);
    const rc = await tx.wait();
    expect(rc.status).to.eq(1); // did NOT revert
    const p = await pool.positionOf(0, Y.address);
    // scaledSupply credited 0 (nothing pulled). Handle may be a real ciphertext of 0 or ZeroHash.
    console.log(`      supply tx ok (status ${rc.status}); Y scaledSupply handle=${p[0]}`);
  });

  it("funded supply round-trip: wrap → setOperator → supply → decrypt position", async function () {
    const under = new ethers.Contract(cUSDCUnderlying, ERC20_ABI, deployer);
    const wrapper = new ethers.Contract(cUSDC, WRAPPER_ABI, deployer);
    const amt = 250_000n; // 0.25 USDC base units

    await (await under.mint(deployer.address, amt)).wait();
    await (await under.approve(cUSDC, amt)).wait();
    await (await wrapper.wrap(deployer.address, amt)).wait();
    await (await wrapper.setOperator(poolAddr, 4_000_000_000)).wait();

    const enc = await fhevm.createEncryptedInput(poolAddr, deployer.address).add64(amt).encrypt();
    const rc = await (await pool.supply(0, enc.handles[0], enc.inputProof)).wait();
    expect(rc.status).to.eq(1);

    const p = await pool.positionOf(0, deployer.address);
    const scaled = await fhevm.userDecryptEuint(FhevmType.euint64, p[0], poolAddr, deployer);
    console.log(`      supplied ${amt}; decrypted scaledSupply=${scaled}`);
    expect(scaled).to.be.greaterThan(0n);
  });
});
