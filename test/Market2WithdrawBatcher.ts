import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// WithdrawBatcher E2E (CP4 prereq — GhostGate's settlement mirrors this): cSHARE → (unwrap) shares →
// vault.redeem → USDC → (wrap) cUSDC → claim.
describe("Market 2 — WithdrawBatcher full cycle (mock)", function () {
  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  it("deposit cSHARE → dispatch → callback(publicDecrypt: redeem) → claim cUSDC", async function () {
    const [, user] = await ethers.getSigners();
    const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
    await USDC.waitForDeployment();
    const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
    const cUSDC = await Wrapper.deploy(await USDC.getAddress());
    await cUSDC.waitForDeployment();
    const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
    await vault.waitForDeployment();
    const cSHARE = await Wrapper.deploy(await vault.getAddress());
    await cSHARE.waitForDeployment();
    const batcher = await (await ethers.getContractFactory("WithdrawBatcher")).deploy(
      await cSHARE.getAddress(),
      await cUSDC.getAddress(),
      await vault.getAddress(),
      60,
    );
    await batcher.waitForDeployment();
    const cSHAREAddr = await cSHARE.getAddress();
    const batcherAddr = await batcher.getAddress();

    // user: USDC → vault shares → cSHARE (1e6)
    await (await USDC.mint(user.address, 1_000_000n)).wait();
    await (await USDC.connect(user).approve(await vault.getAddress(), 1_000_000n)).wait();
    await (await vault.connect(user).deposit(1_000_000n, user.address)).wait();
    await (await vault.connect(user).approve(cSHAREAddr, 1_000_000n)).wait();
    await (await cSHARE.connect(user).wrap(user.address, 1_000_000n)).wait();

    // deposit cSHARE into the withdraw batcher
    const enc = await fhevm.createEncryptedInput(cSHAREAddr, user.address).add64(1_000_000n).encrypt();
    await (
      await cSHARE.connect(user)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        batcherAddr,
        enc.handles[0],
        enc.inputProof,
        "0x",
      )
    ).wait();

    await time.increase(61);
    await (await batcher.dispatchBatch()).wait();

    const reqId = await batcher.unwrapRequestId(1);
    const pub = await fhevm.publicDecrypt([reqId]);
    const clear = BigInt(pub.clearValues[reqId as keyof typeof pub.clearValues] as any);
    await (await batcher.dispatchBatchCallback(1, clear, pub.decryptionProof)).wait();
    expect(await batcher.exchangeRate(1)).to.be.greaterThan(0n);

    await (await batcher.claim(1, user.address)).wait();
    const balHandle = await cUSDC.confidentialBalanceOf(user.address);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, await cUSDC.getAddress(), user);
    console.log(`      user cUSDC after withdraw-claim = ${bal}`);
    expect(bal).to.be.greaterThan(0n); // received USDC back as cUSDC
  });
});
