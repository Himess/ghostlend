import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// Market 2 vanilla batcher E2E: deposit (confidentialTransferAndCall) → window → dispatch → publicDecrypt
// → dispatchBatchCallback (finalizeUnwrap + vault.deposit + wrap shares) → claim → user holds cSHARE.
describe("Market 2 — DepositBatcher full cycle (mock)", function () {
  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  it("join → dispatch → callback(publicDecrypt) → claim", async function () {
    const [deployer, user] = await ethers.getSigners();

    const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
    await USDC.waitForDeployment();
    const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
    const cUSDC = await Wrapper.deploy(await USDC.getAddress());
    await cUSDC.waitForDeployment();
    const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
    await vault.waitForDeployment();
    const cSHARE = await Wrapper.deploy(await vault.getAddress());
    await cSHARE.waitForDeployment();
    const batcher = await (await ethers.getContractFactory("DepositBatcher")).deploy(
      await cUSDC.getAddress(),
      await cSHARE.getAddress(),
      await vault.getAddress(),
      60,
    );
    await batcher.waitForDeployment();

    const cUSDCAddr = await cUSDC.getAddress();
    const batcherAddr = await batcher.getAddress();

    // user gets 1e6 USDC → wrap into cUSDC
    await (await USDC.mint(user.address, 1_000_000n)).wait();
    await (await USDC.connect(user).approve(cUSDCAddr, 1_000_000n)).wait();
    await (await cUSDC.connect(user).wrap(user.address, 1_000_000n)).wait();

    // deposit into the batcher via confidentialTransferAndCall (there is NO join())
    const enc = await fhevm.createEncryptedInput(cUSDCAddr, user.address).add64(1_000_000n).encrypt();
    await (
      await cUSDC.connect(user)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
        batcherAddr,
        enc.handles[0],
        enc.inputProof,
        "0x",
      )
    ).wait();

    // window gate: too soon → revert; then advance past minBatchAge
    await expect(batcher.dispatchBatch()).to.be.reverted;
    await time.increase(61);
    await (await batcher.dispatchBatch()).wait();

    // async unwrap: publicDecrypt the unwrapped-amount handle (= unwrapRequestId)
    const reqId = await batcher.unwrapRequestId(1);
    const pub = await fhevm.publicDecrypt([reqId]);
    const clear = BigInt(pub.clearValues[reqId as keyof typeof pub.clearValues] as any);
    await (await batcher.dispatchBatchCallback(1, clear, pub.decryptionProof)).wait();

    expect(await batcher.exchangeRate(1)).to.be.greaterThan(0n); // batch finalized

    // claim cSHARE
    await (await batcher.claim(1, user.address)).wait();
    const balHandle = await cSHARE.confidentialBalanceOf(user.address);
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balHandle, await cSHARE.getAddress(), user);
    console.log(`      user cSHARE after claim = ${bal}`);
    expect(bal).to.be.greaterThan(0n);
  });

  it("vault share price (Market 2 oracle) rises as yield is dripped in", async function () {
    const [deployer] = await ethers.getSigners();
    const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
    await USDC.waitForDeployment();
    const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
    await vault.waitForDeployment();

    await (await USDC.mint(deployer.address, 1_000_000n)).wait();
    await (await USDC.approve(await vault.getAddress(), 1_000_000n)).wait();
    await (await vault.deposit(1_000_000n, deployer.address)).wait();
    const p0 = await vault.sharePrice6();

    // keeper drips 500000 USDC of "yield" into the vault (public mint on the underlying)
    await (await USDC.mint(await vault.getAddress(), 500_000n)).wait();
    const p1 = await vault.sharePrice6();
    console.log(`      sharePrice6: ${p0} -> ${p1}`);
    expect(p1).to.be.greaterThan(p0); // convertToAssets rises → Market 2 collateral appreciates
  });
});
