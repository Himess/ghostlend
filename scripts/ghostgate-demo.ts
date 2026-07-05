// CP4 demo composition (ruling #3): the SAME 3-wallet scene — two deposits (700k + 800k cUSDC) and one
// withdrawal (1e6-worth of cSHARE) — run through BOTH settlement paths on the SAME MockYieldVault:
//   Path A  vanilla batcher pair  → the vault sees the GROSS flow: 1.5e6 in + 1.0e6 out = 2 public crossings.
//   Path B  GhostGate netting     → the vault sees only the NET flow: 0.5e6 in = 1 crossing; the matched
//                                    1.0e6 settles internally at the pinned rate and NEVER touches the vault.
// Headline: GhostGate hides the gross deposit/withdrawal demand and cuts on-chain-visible vault volume from
// 2.5e6 to 0.5e6. Runs in mock (default network, 3 wallets) or live (`--network sepolia`, single funded
// signer plays all three roles). All tx hashes are recorded to deployments/ghostgate-demo[.sepolia].json.
import { ethers, fhevm, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const D1 = 700_000n, D2 = 800_000n, W_USDC = 1_000_000n; // scene amounts (net = 1.5e6 - 1.0e6 = 0.5e6)
let MBA = 1; // minBatchAge — 1s in mock, a short real window on Sepolia (set in main)

// advance past the batch window: fast-forward in mock, real wall-clock wait on a live network
async function ready(c: any) {
  if (fhevm.isMock) {
    await ethers.provider.send("evm_increaseTime", [MBA + 1]);
    await ethers.provider.send("evm_mine", []);
    return;
  }
  const secs = Number(await c.dispatchableIn());
  if (secs > 0) await new Promise((r) => setTimeout(r, (secs + 3) * 1000));
}

// count ERC-4626 boundary volume by summing assets across the vault's Deposit/Withdraw events in a receipt
function vaultFlow(vault: any, rc: any): { crossings: number; volume: bigint } {
  let crossings = 0, volume = 0n;
  for (const l of rc.logs) {
    let p: any; try { p = vault.interface.parseLog(l); } catch { continue; }
    if (p && (p.name === "Deposit" || p.name === "Withdraw")) { crossings++; volume += p.args.assets as bigint; }
  }
  return { crossings, volume };
}

async function pubDec(handles: string[]) {
  const pub = await fhevm.publicDecrypt(handles);
  return pub;
}

async function main() {
  await fhevm.initializeCLIApi();
  const signers = await ethers.getSigners();
  const isMock = fhevm.isMock;
  MBA = isMock ? 1 : 10; // short but real window on Sepolia
  // mock: 3 distinct wallets. sepolia: one funded signer plays alice/bob/carol (intents still net).
  const [deployer] = signers;
  const alice = signers[1] ?? deployer;
  const bob = signers[2] ?? deployer;
  const carol = signers[3] ?? deployer; // withdrawer
  const H: any = { network: network.name, scene: { D1: D1.toString(), D2: D2.toString(), W_USDC: W_USDC.toString() } };

  // ---------- shared vault + confidential wrappers ----------
  const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
  await USDC.waitForDeployment();
  const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
  await vault.waitForDeployment();
  const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
  const cUSDC = await Wrapper.deploy(await USDC.getAddress());
  await cUSDC.waitForDeployment();
  const cSHARE = await Wrapper.deploy(await vault.getAddress());
  await cSHARE.waitForDeployment();
  const cUSDCa = await cUSDC.getAddress(), cSHAREa = await cSHARE.getAddress(), vAddr = await vault.getAddress();
  H.vault = vAddr; H.cUSDC = cUSDCa; H.cSHARE = cSHAREa;

  const mintWrapUSDC = async (u: any, amt: bigint) => {
    await (await USDC.mint(u.address, amt)).wait();
    await (await USDC.connect(u).approve(cUSDCa, amt)).wait();
    await (await cUSDC.connect(u).wrap(u.address, amt)).wait();
  };
  const acquireCShare = async (u: any, usdc: bigint) => {
    await (await USDC.mint(u.address, usdc)).wait();
    await (await USDC.connect(u).approve(vAddr, usdc)).wait();
    const before = await vault.balanceOf(u.address);
    await (await vault.connect(u).deposit(usdc, u.address)).wait();
    const sh = (await vault.balanceOf(u.address)) - before;
    await (await vault.connect(u).approve(cSHAREa, sh)).wait();
    await (await cSHARE.connect(u).wrap(u.address, sh)).wait();
    return sh;
  };
  const encTAC = async (token: any, tokenAddr: string, from: any, to: string, amt: bigint) => {
    const enc = await fhevm.createEncryptedInput(tokenAddr, from.address).add64(amt).encrypt();
    return (await (await token.connect(from)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      to, enc.handles[0], enc.inputProof, "0x")).wait());
  };

  // ============================================================
  // PATH A — VANILLA BATCHER PAIR (gross flow: 2 crossings)
  // ============================================================
  console.log("\n=== PATH A — vanilla batcher pair (gross) ===");
  const dep = await (await ethers.getContractFactory("DepositBatcher")).deploy(cUSDCa, cSHAREa, vAddr, MBA);
  await dep.waitForDeployment();
  const wdr = await (await ethers.getContractFactory("WithdrawBatcher")).deploy(cSHAREa, cUSDCa, vAddr, MBA);
  await wdr.waitForDeployment();
  const depA = await dep.getAddress(), wdrA = await wdr.getAddress();
  H.vanilla = { depositBatcher: depA, withdrawBatcher: wdrA, tx: {} };

  // two deposits into the DepositBatcher
  await mintWrapUSDC(alice, D1);
  await mintWrapUSDC(bob, D2);
  H.vanilla.tx.aliceDeposit = (await encTAC(cUSDC, cUSDCa, alice, depA, D1)).hash;
  H.vanilla.tx.bobDeposit = (await encTAC(cUSDC, cUSDCa, bob, depA, D2)).hash;
  // one withdrawal into the WithdrawBatcher
  const carolShares = await acquireCShare(carol, W_USDC);
  H.vanilla.tx.carolWithdraw = (await encTAC(cSHARE, cSHAREa, carol, wdrA, carolShares)).hash;

  let vanillaCrossings = 0, vanillaVolume = 0n;
  // dispatch + finalize the deposit batcher
  await ready(dep);
  const depDispatch = await (await dep.dispatchBatch()).wait();
  H.vanilla.tx.depDispatch = depDispatch.hash;
  {
    const reqId = await dep.unwrapRequestId(1);
    const pub = await pubDec([reqId]);
    const clear = BigInt(pub.clearValues[reqId as keyof typeof pub.clearValues] as any);
    const cb = await (await dep.dispatchBatchCallback(1, clear, pub.decryptionProof)).wait();
    H.vanilla.tx.depCallback = cb.hash;
    const f = vaultFlow(vault, cb); vanillaCrossings += f.crossings; vanillaVolume += f.volume;
  }
  // dispatch + finalize the withdraw batcher
  await ready(wdr);
  const wdrDispatch = await (await wdr.dispatchBatch()).wait();
  H.vanilla.tx.wdrDispatch = wdrDispatch.hash;
  {
    const reqId = await wdr.unwrapRequestId(1);
    const pub = await pubDec([reqId]);
    const clear = BigInt(pub.clearValues[reqId as keyof typeof pub.clearValues] as any);
    const cb = await (await wdr.dispatchBatchCallback(1, clear, pub.decryptionProof)).wait();
    H.vanilla.tx.wdrCallback = cb.hash;
    const f = vaultFlow(vault, cb); vanillaCrossings += f.crossings; vanillaVolume += f.volume;
  }
  console.log(`  vault boundary: ${vanillaCrossings} crossings, gross volume = ${vanillaVolume}`);
  H.vanilla.crossings = vanillaCrossings; H.vanilla.grossVolume = vanillaVolume.toString();

  // ============================================================
  // PATH B — GHOSTGATE NETTING (net flow: 1 crossing)
  // ============================================================
  console.log("\n=== PATH B — GhostGate netting (net) ===");
  const gate = await (await ethers.getContractFactory("GhostGate")).deploy(cUSDCa, cSHAREa, vAddr, MBA);
  await gate.waitForDeployment();
  const gateA = await gate.getAddress();
  H.ghostgate = { address: gateA, pin: (await gate.windowInfo(1)).pinRate6.toString(), tx: {} };

  // same scene, same amounts — but nets D=1.5e6 vs Wv=1.0e6 → only 0.5e6 crosses
  await mintWrapUSDC(alice, D1);
  await mintWrapUSDC(bob, D2);
  const carolShares2 = await acquireCShare(carol, W_USDC);
  H.ghostgate.tx.aliceDeposit = (await encTAC(cUSDC, cUSDCa, alice, gateA, D1)).hash;
  H.ghostgate.tx.bobDeposit = (await encTAC(cUSDC, cUSDCa, bob, gateA, D2)).hash;
  H.ghostgate.tx.carolWithdraw = (await encTAC(cSHARE, cSHAREa, carol, gateA, carolShares2)).hash;

  await ready(gate);
  const gDispatch = await (await gate.dispatch()).wait();
  H.ghostgate.tx.dispatch = gDispatch.hash;
  const dev = gDispatch.logs.map((l: any) => { try { return gate.interface.parseLog(l); } catch { return null; } })
    .find((e: any) => e?.name === "Dispatched");
  const pub = await pubDec([dev.args.dir, dev.args.net]);
  const dirClear = BigInt(pub.clearValues[dev.args.dir as keyof typeof pub.clearValues] as any);
  const netClear = BigInt(pub.clearValues[dev.args.net as keyof typeof pub.clearValues] as any);
  console.log(`  dispatch: dir=${dirClear} (1=deposits win), net=${netClear}`);
  const fin = await (await gate.finalizeGate(1, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
  H.ghostgate.tx.finalize = fin.hash;

  let gateCrossings = 0, gateVolume = 0n;
  { const f = vaultFlow(vault, fin); gateCrossings += f.crossings; gateVolume += f.volume; }
  if ((await gate.windowInfo(1)).status === 3n) { // Routing → drive the single net-leg route
    const reqId = await gate.unwrapRequestId(1);
    const pub2 = await pubDec([reqId]);
    const clear = BigInt(pub2.clearValues[reqId as keyof typeof pub2.clearValues] as any);
    const route = await (await gate.routeGate(1, clear, pub2.decryptionProof)).wait();
    H.ghostgate.tx.route = route.hash;
    const f = vaultFlow(vault, route); gateCrossings += f.crossings; gateVolume += f.volume;
  }
  // claims
  H.ghostgate.tx.aliceClaim = (await (await gate.connect(alice).claimDeposit(1)).wait()).hash;
  H.ghostgate.tx.bobClaim = (await (await gate.connect(bob).claimDeposit(1)).wait()).hash;
  H.ghostgate.tx.carolClaim = (await (await gate.connect(carol).claimWithdraw(1)).wait()).hash;
  console.log(`  vault boundary: ${gateCrossings} crossing(s), net volume = ${gateVolume}`);
  H.ghostgate.crossings = gateCrossings; H.ghostgate.netVolume = gateVolume.toString();

  // ---------- verdict ----------
  const hidden = vanillaVolume - gateVolume;
  const pct = vanillaVolume > 0n ? Number((hidden * 10000n) / vanillaVolume) / 100 : 0;
  console.log(`\n=== NETTING WIN ===`);
  console.log(`  vanilla: ${vanillaCrossings} crossings, ${vanillaVolume} gross exposed to the vault`);
  console.log(`  ghostgate: ${gateCrossings} crossing(s), ${gateVolume} net exposed`);
  console.log(`  hidden by netting: ${hidden} (${pct}% less on-chain-visible vault volume)`);
  H.verdict = { hiddenVolume: hidden.toString(), pctReduction: pct };

  const fn = isMock ? "ghostgate-demo.json" : "ghostgate-demo.sepolia.json";
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fn), JSON.stringify(H, null, 2));
  console.log(`\nrecorded tx hashes → deployments/${fn}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
