// CP3 close: LIVE Sepolia batch cycle against the DEPLOYED cUSDC (Zama UUPS wrapper — NOT the OZ
// ERC7984ERC20Wrapper used in mock). Probes whether the batcher can construct (ERC165) and whether the
// deployed wrapper's unwrap/finalizeUnwrap/unwrapAmount match the OZ v0.5.1 pattern. Any deviation → STOP.
// Run: npx hardhat run scripts/sepolia-batch-e2e.ts --network sepolia
import { ethers, fhevm } from "hardhat";

const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cUSDCu = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";

function iface7984WrapperId(): string {
  const sels = [
    "wrap(address,uint256)",
    "unwrap(address,address,bytes32,bytes)",
    "underlying()",
    "finalizeUnwrap(bytes32,uint64,bytes)",
    "rate()",
    "unwrapAmount(bytes32)",
  ].map((s) => parseInt(ethers.id(s).slice(2, 10), 16));
  const x = sels.reduce((a, b) => a ^ b, 0) >>> 0;
  return "0x" + x.toString(16).padStart(8, "0");
}

async function main() {
  await fhevm.initializeCLIApi();
  const [me] = await ethers.getSigners();
  console.log(`signer ${me.address}`);

  // ---- read-only pre-checks on the DEPLOYED cUSDC ----
  const W = await ethers.getContractAt(
    [
      "function rate() view returns (uint256)",
      "function underlying() view returns (address)",
      "function decimals() view returns (uint8)",
      "function supportsInterface(bytes4) view returns (bool)",
      "function unwrapAmount(bytes32) view returns (bytes32)",
    ],
    cUSDC,
  );
  const wid = iface7984WrapperId();
  const pre: any = { computedWrapperInterfaceId: wid };
  for (const [k, fn] of [
    ["rate", () => W.rate()],
    ["underlying", () => W.underlying()],
    ["decimals", () => W.decimals()],
    ["supportsInterface(IERC7984ERC20Wrapper)", () => W.supportsInterface(wid)],
    ["unwrapAmount(0x00..)", () => W.unwrapAmount(ethers.ZeroHash)],
  ] as [string, () => Promise<any>][]) {
    try {
      pre[k] = String(await fn());
    } catch (e: any) {
      pre[k] = `REVERT/absent (${e.shortMessage || e.message?.split("\n")[0]})`;
    }
  }
  console.log("PRE-CHECKS:", JSON.stringify(pre, null, 2));

  const supportsWrapperIface = pre["supportsInterface(IERC7984ERC20Wrapper)"] === "true";
  if (!supportsWrapperIface) {
    console.log(
      `\n⚠ DEVIATION (STOP): deployed cUSDC does NOT advertise IERC7984ERC20Wrapper via ERC165 (id ${wid}).\n` +
        `  BatcherConfidential's constructor (ERC165Checker) would revert InvalidWrapperToken. GhostGate must\n` +
        `  therefore NOT reuse the base constructor's ERC165 gate against the deployed wrapper — it must take the\n` +
        `  wrapper addresses on trust (or check a different id). Reporting before any workaround.`,
    );
    return;
  }

  // ---- attempt the full cycle (vault over the deployed USDC + fresh cSHARE + DepositBatcher) ----
  const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(cUSDCu);
  await vault.waitForDeployment();
  const cSHARE = await (await ethers.getContractFactory("ConfidentialShareWrapper")).deploy(await vault.getAddress());
  await cSHARE.waitForDeployment();

  let batcher: any;
  try {
    batcher = await (await ethers.getContractFactory("DepositBatcher")).deploy(
      cUSDC,
      await cSHARE.getAddress(),
      await vault.getAddress(),
      60,
    );
    await batcher.waitForDeployment();
  } catch (e: any) {
    console.log(`\n⚠ DEVIATION (STOP): DepositBatcher construction reverted against deployed cUSDC — ${e.shortMessage || e.message?.split("\n")[0]}`);
    return;
  }
  const batcherAddr = await batcher.getAddress();
  console.log(`DepositBatcher deployed: ${batcherAddr}`);

  // fund: mint deployed USDC → wrap into deployed cUSDC
  const usdc = await ethers.getContractAt(["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"], cUSDCu);
  const cusdc = await ethers.getContractAt(
    [
      "function wrap(address,uint256) returns (bytes32)",
      "function confidentialTransferAndCall(address,bytes32,bytes,bytes) returns (bytes32)",
      "function confidentialBalanceOf(address) view returns (bytes32)",
    ],
    cUSDC,
  );
  await (await usdc.mint(me.address, 1_000_000n)).wait();
  await (await usdc.approve(cUSDC, 1_000_000n)).wait();
  await (await cusdc.wrap(me.address, 1_000_000n)).wait();

  const hashes: any = { batcher: batcherAddr, vault: await vault.getAddress(), cSHARE: await cSHARE.getAddress() };
  const enc = await fhevm.createEncryptedInput(cUSDC, me.address).add64(1_000_000n).encrypt();
  hashes.deposit = (await (await cusdc.confidentialTransferAndCall(batcherAddr, enc.handles[0], enc.inputProof, "0x")).wait()).hash;

  hashes.dispatch = (await (await batcher.dispatchBatch()).wait()).hash;

  const reqId = await batcher.unwrapRequestId(1);
  console.log(`unwrapRequestId(1) = ${reqId}`);
  const pub = await fhevm.publicDecrypt([reqId]);
  const clear = BigInt(pub.clearValues[reqId as keyof typeof pub.clearValues] as any);
  console.log(`publicDecrypt(unwrapAmount) = ${clear}`);
  hashes.callback = (await (await batcher.dispatchBatchCallback(1, clear, pub.decryptionProof)).wait()).hash;
  console.log(`exchangeRate(1) = ${await batcher.exchangeRate(1)}`);
  hashes.claim = (await (await batcher.claim(1, me.address)).wait()).hash;

  const balH = await cSHARE.confidentialBalanceOf(me.address);
  const bal = await fhevm.userDecryptEuint((await import("@fhevm/hardhat-plugin")).FhevmType.euint64, balH, await cSHARE.getAddress(), me);
  console.log(`\n✅ LIVE BATCH CYCLE COMPLETE — user cSHARE = ${bal}`);
  console.log("TX HASHES:", JSON.stringify(hashes, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
