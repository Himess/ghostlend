// Keeper bot SKELETON (CP2). Single pass; wrap in a timer/cron for production.
// Drives the two async reveal machines using the P6-validated finalize pattern:
//   epoch:       closeEpoch → publicDecrypt([supplySnap,borrowSnap]) → finalizeEpoch(cleartexts,proof)
//   liquidation: poke(user) → publicDecrypt([unhealthy])            → finalizeLiquidation(cleartexts,proof)
// Run: npx hardhat run scripts/keeper.ts --network sepolia
import { ethers, fhevm } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Positions are encrypted and NOT enumerable on-chain. A production keeper builds its watch-list from
// OpExecuted / Poked / MarketAdded event logs (borrowers who have ever borrowed). For the skeleton we
// accept an explicit list via env KEEPER_USERS="0xabc,0xdef".
function watchList(): string[] {
  return (process.env.KEEPER_USERS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// Self-healing epoch driver: FIRST recover+finalize any epoch that was closed but not finalized (a relayer
// hiccup on a prior pass leaves it Pending, and then closeEpoch reverts "prev pending" forever) by pulling
// its snapshot handles back from the EpochClosed log; THEN close the next epoch when its duration elapses.
async function finalizeFromLog(pool: any, marketId: number, epochId: number): Promise<boolean> {
  const filter = pool.filters.EpochClosed(marketId, epochId);
  const latest = await pool.runner.provider.getBlockNumber();
  // small recent window only — the public RPC rejects deep getLogs as "archive" requests.
  const logs = await pool.queryFilter(filter, Math.max(0, latest - 30), latest);
  if (logs.length === 0) return false;
  const ev: any = logs[logs.length - 1];
  const pub = await fhevm.publicDecrypt([ev.args.supplySnap, ev.args.borrowSnap]); // ~3s (PROBE P6)
  await (await pool.finalizeEpoch(marketId, epochId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
  return true;
}

async function runEpoch(pool: any, marketId: number) {
  const epochId = Number(await pool.currentEpochId(marketId));
  // 1) recover a stuck pending epoch (idempotent — finalizeEpoch reverts "not pending" if already done)
  try {
    if (await finalizeFromLog(pool, marketId, epochId)) console.log(`  [epoch] market ${marketId} epoch ${epochId} finalized (recovered)`);
  } catch (e: any) { console.log(`  [epoch] market ${marketId} recover(${epochId}): ${e.shortMessage || e.message?.split("\n")[0]}`); }
  // H-1 skip-guard: never call closeEpoch on a market whose aggregate handles are still the null handle —
  // makePubliclyDecryptable on a null handle freezes a snapshot the KMS rejects → the epoch machine bricks.
  // (New pools baseline these to a real zero handle, so this only trips on a legacy/never-seeded market.)
  try {
    const info = await pool.marketInfo(marketId);
    if (info[8] === ethers.ZeroHash || info[9] === ethers.ZeroHash) {
      console.log(`  [epoch] market ${marketId} skipped: aggregates uninitialized (seed before first close)`);
      return;
    }
  } catch {
    /* marketInfo read failed — fall through; closeEpoch has its own on-chain guard */
  }
  // 2) close the next epoch if its duration has elapsed, then finalize it this pass
  try {
    const rc = await (await pool.closeEpoch(marketId)).wait();
    const ev = rc.logs
      .map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "EpochClosed");
    if (!ev) return;
    const pub = await fhevm.publicDecrypt([ev.args.supplySnap, ev.args.borrowSnap]);
    await (await pool.finalizeEpoch(marketId, Number(ev.args.epochId), pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    console.log(`  [epoch] market ${marketId} epoch ${ev.args.epochId} closed+finalized`);
  } catch (e: any) {
    const m = e.shortMessage || e.message?.split("\n")[0] || "";
    if (!/duration|prev pending|not due/i.test(m)) console.log(`  [epoch] market ${marketId} skipped: ${m}`);
  }
}

async function runLiquidations(pool: any, marketId: number, users: string[]) {
  for (const user of users) {
    try {
      const rc = await (await pool.poke(marketId, user)).wait();
      const ev = rc.logs
        .map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } })
        .find((e: any) => e?.name === "Poked");
      if (!ev) continue;
      const pub = await fhevm.publicDecrypt([ev.args.unhealthy]);
      const frc = await (await pool.finalizeLiquidation(ev.args.pokeId, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
      const fev = frc.logs
        .map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } })
        .find((e: any) => e?.name === "LiquidationFinalized");
      console.log(`  [liq] market ${marketId} user ${user}: unhealthy=${fev?.args.unhealthy}`);
    } catch (e: any) {
      console.log(`  [liq] market ${marketId} user ${user} skipped: ${e.shortMessage || e.message?.split("\n")[0]}`);
    }
  }
}

// GhostGate driver (CP4): dispatch the current window when its minBatchAge elapses, publicDecrypt the ONLY
// two revealed handles (dir, net), finalizeGate, and — for a net>0 window — drive the single net-leg route.
// KEEPER DISCIPLINE (mandatory, README threat-model): the keeper is the sole writer of vault yield and MUST
// order operations `drip → open window → dispatch → (only then) drip again`. Never drip while a GhostGate
// window is live: a mid-window share-price move trips the in-contract drift guard and cancels the batch
// (safe — full encrypted refunds via quit — but a wasted round). We therefore drive GhostGate to Finalized
// BEFORE any yield drip in the same pass.
async function runGhostGate(gateAddr: string) {
  if (!gateAddr) return;
  const gate = await ethers.getContractAt("GhostGate", gateAddr);
  try {
    const w = Number(await gate.currentWindow());
    // 1) dispatch the open window once its window closes
    if (Number(await gate.dispatchableIn()) === 0) {
      const rc = await (await gate.dispatch()).wait();
      const ev = rc.logs
        .map((l: any) => { try { return gate.interface.parseLog(l); } catch { return null; } })
        .find((e: any) => e?.name === "Dispatched");
      if (ev) {
        // 2) reveal surface is exactly [dir, net] — decrypt both, then finalize
        const pub = await fhevm.publicDecrypt([ev.args.dir, ev.args.net]);
        await (await gate.finalizeGate(w, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
        // 3) net>0 (no drift) → the window is now Routing; drive the single net-leg route to Finalized
        if (Number((await gate.windowInfo(w)).status) === 3) {
          const reqId = await gate.unwrapRequestId(w);
          const pub2 = await fhevm.publicDecrypt([reqId]);
          const clear = BigInt(pub2.clearValues[reqId as keyof typeof pub2.clearValues] as any);
          await (await gate.routeGate(w, clear, pub2.decryptionProof)).wait();
        }
        const st = Number((await gate.windowInfo(w)).status);
        console.log(`  [ghostgate] window ${w}: ${st === 4 ? "finalized" : st === 5 ? "canceled (drift)" : "state " + st}`);
      }
    }
  } catch (e: any) {
    console.log(`  [ghostgate] skipped: ${e.shortMessage || e.message?.split("\n")[0]}`);
  }
}

// #4 hardening: warn when a wrapper's inferred capacity utilization exceeds 50% — a filled wrapper
// (supply → type(uint64).max) can brick batches (the batcher can't wrap). Pass KEEPER_WRAPPERS="0x..,0x.."
const WRAPPER_CAP_ABI = [
  "function inferredTotalSupply() view returns (uint256)",
  "function maxTotalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
];
async function warnCapacity() {
  const addrs = (process.env.KEEPER_WRAPPERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const a of addrs) {
    try {
      const w = await ethers.getContractAt(WRAPPER_CAP_ABI, a);
      const [used, max] = [await w.inferredTotalSupply(), await w.maxTotalSupply()];
      const pctBps = max > 0n ? (used * 10000n) / max : 0n;
      if (pctBps > 5000n) console.log(`  ⚠ CAPACITY: wrapper ${a} at ${Number(pctBps) / 100}% of uint64 cap — risk of bricked batches`);
    } catch {
      /* not a wrapper / read failed */
    }
  }
}

// Read the full production deploy (deployments/sepolia.json) with a fallback to the legacy core file.
function loadDeploy() {
  const dir = path.join(__dirname, "..", "deployments");
  for (const f of ["sepolia.json", "sepolia-core.json"]) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  }
  throw new Error("no deployments/sepolia.json");
}

async function pass() {
  const dep = loadDeploy();
  const pool = await ethers.getContractAt("GhostLendPool", dep.pool);
  const marketCount = Number(await pool.marketCount());
  const users = watchList();
  const gate = (process.env.GHOSTGATE || dep.ghostGate || "").trim();
  console.log(`\nkeeper pass @ ${new Date().toISOString()}: pool=${dep.pool} markets=${marketCount} watch=${users.length}`);

  await warnCapacity();
  for (let m = 0; m < marketCount; m++) {
    await runEpoch(pool, m); // uniform anti-signaling: also poke every watched position each pass
    await runLiquidations(pool, m, users);
  }
  // CP4: drive the GhostGate netting window. Keeper discipline (README): GhostGate is driven to Finalized
  // BEFORE any yield drip — a mid-window drip would trip the drift guard. Yield drips live in drip-yield.ts,
  // sequenced between windows.
  await runGhostGate(gate);
}

async function main() {
  await fhevm.initializeCLIApi();
  // KEEPER_LOOP=1 → run continuously (demo env stays live); otherwise single pass. Interval in seconds.
  const loop = (process.env.KEEPER_LOOP || "") === "1";
  const intervalMs = (Number(process.env.KEEPER_INTERVAL) || 45) * 1000;
  if (!loop) {
    await pass();
    return;
  }
  console.log(`keeper LOOP mode · every ${intervalMs / 1000}s · Ctrl-C to stop`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pass();
    } catch (e: any) {
      console.log(`  pass error (continuing): ${e.shortMessage || e.message?.split("\n")[0]}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
