import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";

// CP4 — GhostGate netting gateway. PIN-ONLY settlement (ruling): every claim on both sides settles at the
// window's pinned rate; the net leg is routed physically; a drift guard requires realized == pin exactly.
// Coverage:
//   #2 reveal-surface: across the FULL lifecycle (incl. the net>0 routed path) the ONLY publicly-decryptable
//      handles are dir & net — never D, W, or any per-user intent.
//   #3 zero-net perfect netting: D == Wv → net = 0 → route skipped → internal pin settlement.
//   net>0 both directions: deposit-win (vault.deposit) and withdraw-win (vault.withdraw), pin claims, solvent.
//   drift guard: a mid-window yield drip → realized != pin → batch cancels with full encrypted refunds.
//   conservation sweep (randomized, seeded): many (D,W) shapes incl. both directions, zero-net, one-sided,
//      and a non-1.0 pin — every participant is paid floor(intent × pin-rate) and NO transfer ever reverts.
describe("GhostGate — confidential netting gateway (mock)", function () {
  before(function () {
    if (!fhevm.isMock) this.skip();
  });

  async function scene(preSeedUsdc = 0n, preDripUsdc = 0n) {
    const [deployer, alice, bob, carol] = await ethers.getSigners();
    const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
    await USDC.waitForDeployment();
    const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
    await vault.waitForDeployment();
    // optionally move the share price off 1.0 BEFORE the gate captures its pin (keeper discipline: drip
    // only while no window is live — here, before the gate exists at all).
    if (preSeedUsdc > 0n) {
      await (await USDC.mint(deployer.address, preSeedUsdc)).wait();
      await (await USDC.approve(await vault.getAddress(), preSeedUsdc)).wait();
      await (await vault.deposit(preSeedUsdc, deployer.address)).wait();
      if (preDripUsdc > 0n) await (await USDC.mint(await vault.getAddress(), preDripUsdc)).wait();
    }
    const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
    const cUSDC = await Wrapper.deploy(await USDC.getAddress());
    await cUSDC.waitForDeployment();
    const cSHARE = await Wrapper.deploy(await vault.getAddress());
    await cSHARE.waitForDeployment();
    const gate = await (await ethers.getContractFactory("GhostGate")).deploy(
      await cUSDC.getAddress(),
      await cSHARE.getAddress(),
      await vault.getAddress(),
      60,
    );
    await gate.waitForDeployment();
    return { deployer, alice, bob, carol, USDC, vault, cUSDC, cSHARE, gate };
  }

  // DEPOSIT intent: mint USDC → wrap cUSDC → confidentialTransferAndCall(gate). Returns cUSDC intent amount.
  async function joinDeposit(cUSDC: any, USDC: any, gate: any, user: any, amt: bigint) {
    const cAddr = await cUSDC.getAddress();
    await (await USDC.mint(user.address, amt)).wait();
    await (await USDC.connect(user).approve(cAddr, amt)).wait();
    await (await cUSDC.connect(user).wrap(user.address, amt)).wait();
    const enc = await fhevm.createEncryptedInput(cAddr, user.address).add64(amt).encrypt();
    await (await cUSDC.connect(user)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      await gate.getAddress(), enc.handles[0], enc.inputProof, "0x")).wait();
    return amt;
  }

  // WITHDRAWAL intent: mint USDC → vault.deposit → shares → wrap cSHARE → transferAndCall(gate). Returns the
  // actual SHARE intent (what the vault minted for `usdcForShares` at the current price).
  async function joinWithdraw(cSHARE: any, vault: any, USDC: any, gate: any, user: any, usdcForShares: bigint) {
    const vAddr = await vault.getAddress();
    const cAddr = await cSHARE.getAddress();
    await (await USDC.mint(user.address, usdcForShares)).wait();
    await (await USDC.connect(user).approve(vAddr, usdcForShares)).wait();
    const before = await vault.balanceOf(user.address);
    await (await vault.connect(user).deposit(usdcForShares, user.address)).wait();
    const shares = (await vault.balanceOf(user.address)) - before;
    await (await vault.connect(user).approve(cAddr, shares)).wait();
    await (await cSHARE.connect(user).wrap(user.address, shares)).wait();
    const enc = await fhevm.createEncryptedInput(cAddr, user.address).add64(shares).encrypt();
    await (await cSHARE.connect(user)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
      await gate.getAddress(), enc.handles[0], enc.inputProof, "0x")).wait();
    return shares;
  }

  // Drive one full window (window `w`) to Finalized/Canceled. Returns {dirClear, netClear, canceled}.
  async function driveWindow(gate: any, cUSDC: any, cSHARE: any, w: number) {
    await time.increase(61);
    const rc = await (await gate.dispatch()).wait();
    const ev = rc.logs.map((l: any) => { try { return gate.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "Dispatched");
    const pub = await fhevm.publicDecrypt([ev.args.dir, ev.args.net]);
    const dirClear = BigInt(pub.clearValues[ev.args.dir as keyof typeof pub.clearValues] as any);
    const netClear = BigInt(pub.clearValues[ev.args.net as keyof typeof pub.clearValues] as any);
    await (await gate.finalizeGate(w, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    // net==0 → Finalized directly; net>0 (no drift) → Routing → drive the async net-leg route to Finalized.
    if ((await gate.windowInfo(w)).status === 3n /* Routing */) {
      const reqId = await gate.unwrapRequestId(w);
      const pub2 = await fhevm.publicDecrypt([reqId]);
      const clear = BigInt(pub2.clearValues[reqId as keyof typeof pub2.clearValues] as any);
      await (await gate.routeGate(w, clear, pub2.decryptionProof)).wait();
    }
    const finalSt = (await gate.windowInfo(w)).status;
    return { dirClear, netClear, canceled: finalSt === 5n };
  }

  async function decU(token: any, who: any, signer: any) {
    const h = await token.confidentialBalanceOf(who);
    return fhevm.userDecryptEuint(FhevmType.euint64, h, await token.getAddress(), signer);
  }

  it("#2 reveal-surface: ONLY dir & net are ever publicly decryptable — never D, W, or any intent", async function () {
    const { alice, bob, USDC, vault, cUSDC, cSHARE, gate } = await scene();
    await joinDeposit(cUSDC, USDC, gate, alice, 1_000_000n);
    await joinWithdraw(cSHARE, vault, USDC, gate, bob, 1_000_000n);

    let r = await gate.revealed(1, alice.address);
    expect(r.dRev || r.wRev || r.depIntentRev || r.dirRev || r.netRev, "nothing revealed pre-dispatch").to.equal(false);
    expect((await gate.revealed(1, bob.address)).wdIntentRev).to.equal(false);

    await driveWindow(gate, cUSDC, cSHARE, 1); // zero-net here (D==Wv) → Finalized

    r = await gate.revealed(1, alice.address);
    expect(r.dirRev && r.netRev, "dir+net revealed after dispatch").to.equal(true);
    expect(r.dRev, "D hidden").to.equal(false);
    expect(r.wRev, "W hidden").to.equal(false);
    expect(r.depIntentRev, "deposit intent hidden").to.equal(false);
    expect((await gate.revealed(1, bob.address)).wdIntentRev, "withdraw intent hidden").to.equal(false);
    console.log("      reveal-surface (zero-net path): dir+net only ✓");
  });

  it("#3 zero-net: D == Wv → net = 0 → route skipped, both settle at pin, gate solvent", async function () {
    const { alice, bob, USDC, vault, cUSDC, cSHARE, gate } = await scene();
    await joinDeposit(cUSDC, USDC, gate, alice, 1_000_000n);
    const bobShares = await joinWithdraw(cSHARE, vault, USDC, gate, bob, 1_000_000n);
    expect(bobShares).to.equal(1_000_000n);

    const { netClear } = await driveWindow(gate, cUSDC, cSHARE, 1);
    expect(netClear, "perfect netting → net = 0").to.equal(0n);
    const info = await gate.windowInfo(1);
    expect(info.status).to.equal(4n); // Finalized
    expect(info.netClear).to.equal(0n);

    await (await gate.connect(alice).claimDeposit(1)).wait();
    await (await gate.connect(bob).claimWithdraw(1)).wait();
    expect(await decU(cSHARE, alice.address, alice)).to.equal(1_000_000n);
    expect(await decU(cUSDC, bob.address, bob)).to.equal(1_000_000n);
    console.log("      zero-net: alice 1e6 cSHARE, bob 1e6 cUSDC at pin, no route ✓");
  });

  it("net>0 deposit-win: D > Wv → route net cUSDC into the vault, both settle at pin", async function () {
    const { alice, bob, USDC, vault, cUSDC, cSHARE, gate } = await scene();
    await joinDeposit(cUSDC, USDC, gate, alice, 1_500_000n); // D = 1.5e6
    await joinWithdraw(cSHARE, vault, USDC, gate, bob, 1_000_000n); // Wv = 1.0e6 → net = 0.5e6, deposits win

    const { dirClear, netClear, canceled } = await driveWindow(gate, cUSDC, cSHARE, 1);
    expect(canceled).to.equal(false);
    expect(dirClear).to.equal(1n); // deposits win
    expect(netClear).to.equal(500_000n);
    expect((await gate.windowInfo(1)).status).to.equal(4n); // Finalized after route

    // reveal-surface holds through the ROUTED path too
    const r = await gate.revealed(1, alice.address);
    expect(r.dRev || r.wRev || r.depIntentRev, "aggregates+intent hidden through route").to.equal(false);
    expect((await gate.revealed(1, bob.address)).wdIntentRev).to.equal(false);

    await (await gate.connect(alice).claimDeposit(1)).wait();
    await (await gate.connect(bob).claimWithdraw(1)).wait();
    expect(await decU(cSHARE, alice.address, alice)).to.equal(1_500_000n); // 1.5e6 cUSDC / pin(1.0)
    expect(await decU(cUSDC, bob.address, bob)).to.equal(1_000_000n); // 1e6 shares × pin(1.0)

    // reveal surface stays dir/net-only even AFTER claims (claim math makes no handle public)
    const r2 = await gate.revealed(1, alice.address);
    expect(r2.dRev || r2.wRev || r2.depIntentRev, "surface unchanged post-claim").to.equal(false);
    console.log("      deposit-win: net 0.5e6 routed via vault.deposit; alice 1.5e6 cSHARE, bob 1e6 cUSDC ✓");
  });

  it("net>0 withdraw-win: Wv > D → route net shares out via the vault, both settle at pin", async function () {
    const { alice, bob, USDC, vault, cUSDC, cSHARE, gate } = await scene();
    const aliceIntent = await joinDeposit(cUSDC, USDC, gate, alice, 500_000n); // D = 0.5e6
    const bobShares = await joinWithdraw(cSHARE, vault, USDC, gate, bob, 1_000_000n); // Wv = 1e6 → net = 0.5e6

    const { dirClear, netClear, canceled } = await driveWindow(gate, cUSDC, cSHARE, 1);
    expect(canceled).to.equal(false);
    expect(dirClear).to.equal(0n); // withdrawals win
    expect(netClear).to.equal(500_000n);
    expect((await gate.windowInfo(1)).status).to.equal(4n);

    await (await gate.connect(alice).claimDeposit(1)).wait();
    await (await gate.connect(bob).claimWithdraw(1)).wait();
    expect(await decU(cSHARE, alice.address, alice)).to.equal(aliceIntent); // 0.5e6 cUSDC / pin(1.0)
    expect(await decU(cUSDC, bob.address, bob)).to.equal(bobShares); // 1e6 shares × pin(1.0)
    console.log("      withdraw-win: net 0.5e6 routed via vault.withdraw; alice 0.5e6 cSHARE, bob 1e6 cUSDC ✓");
  });

  it("drift guard: a mid-window yield drip → realized != pin → cancel + full encrypted refunds", async function () {
    const { alice, bob, USDC, vault, cUSDC, cSHARE, gate } = await scene();
    const aIntent = await joinDeposit(cUSDC, USDC, gate, alice, 1_500_000n);
    const bShares = await joinWithdraw(cSHARE, vault, USDC, gate, bob, 1_000_000n);

    await time.increase(61);
    const rc = await (await gate.dispatch()).wait();
    const ev = rc.logs.map((l: any) => { try { return gate.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "Dispatched");

    // keeper VIOLATES discipline: drips yield while the batch is mid-flight → share price moves off pin
    await (await USDC.mint(await vault.getAddress(), 500_000n)).wait();
    expect(await vault.sharePrice6()).to.not.equal((await gate.windowInfo(1)).pinRate6);

    const pub = await fhevm.publicDecrypt([ev.args.dir, ev.args.net]);
    const frc = await (await gate.finalizeGate(1, pub.abiEncodedClearValues, pub.decryptionProof)).wait();
    const cev = frc.logs.map((l: any) => { try { return gate.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e?.name === "Canceled");
    expect(cev, "Canceled event fired").to.not.equal(null);
    expect((await gate.windowInfo(1)).status).to.equal(5n); // Canceled

    // FULL refunds via quit(): intents were never unwrapped (cancel precedes any route step)
    await (await gate.connect(alice).quit(1)).wait();
    await (await gate.connect(bob).quit(1)).wait();
    expect(await decU(cUSDC, alice.address, alice)).to.equal(aIntent); // 1.5e6 cUSDC back
    expect(await decU(cSHARE, bob.address, bob)).to.equal(bShares); // 1e6 cSHARE back
    console.log("      drift → cancel; alice refunded 1.5e6 cUSDC, bob 1e6 cSHARE (full) ✓");
  });

  it("conservation sweep (seeded): pin claims solvent across both directions, zero-net, one-sided, pin!=1.0", async function () {
    // deterministic pseudo-random scenarios (seeded LCG — reproducible for CI). Each runs on a FRESH gate.
    // Models reality faithfully (ruling's "vault only moves on keeper drip"): ALL vault interaction — the
    // pin-shaping drip AND every withdrawer's share acquisition — happens BEFORE the gate captures its pin,
    // so nothing perturbs the price between pin-capture and the drift check. Fresh signer per participant
    // across the whole sweep → no cross-scenario balance bleed.
    let s = 1234567n;
    const rnd = (lo: number, hi: number) => {
      s = (s * 6364136223846793005n + 1442695040888963407n) % (1n << 64n);
      return lo + Number(s % BigInt(hi - lo + 1));
    };
    const SCEN: Array<{ dep: bigint[]; wd: bigint[]; seed?: bigint; drip?: bigint; tag: string }> = [
      { dep: [700_000n, 300_000n], wd: [1_000_000n], tag: "zero-net (2 dep + 1 wd)" },
      { dep: [1_500_000n], wd: [1_000_000n], tag: "deposit-win" },
      { dep: [400_000n], wd: [600_000n, 400_000n], tag: "withdraw-win (2 wd)" },
      { dep: [900_000n], wd: [], tag: "one-sided deposits (net = D)" },
      { dep: [], wd: [800_000n], tag: "one-sided withdrawals (net = Wv)" },
      { dep: [1_000_000n], wd: [1_000_000n], seed: 1_000_000n, drip: 500_000n, tag: "pin!=1.0 (rounding)" },
    ];
    SCEN.push({ dep: [BigInt(rnd(200_000, 1_500_000))], wd: [BigInt(rnd(200_000, 1_500_000))], tag: "random" });

    const signers = await ethers.getSigners();
    let gi = 1; // running signer index — never reuse a participant across scenarios
    for (const sc of SCEN) {
      const [deployer] = signers;
      const USDC = await (await ethers.getContractFactory("TestERC20")).deploy("USD Coin", "USDC", 6);
      const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(await USDC.getAddress());
      const Wrapper = await ethers.getContractFactory("ConfidentialShareWrapper");
      const cUSDC = await Wrapper.deploy(await USDC.getAddress());
      const cSHARE = await Wrapper.deploy(await vault.getAddress());

      // (1) shape the pin (drip) BEFORE the gate exists — keeper discipline, at its cleanest.
      if ((sc.seed ?? 0n) > 0n) {
        await (await USDC.mint(deployer.address, sc.seed!)).wait();
        await (await USDC.approve(await vault.getAddress(), sc.seed!)).wait();
        await (await vault.deposit(sc.seed!, deployer.address)).wait();
        if ((sc.drip ?? 0n) > 0n) await (await USDC.mint(await vault.getAddress(), sc.drip!)).wait();
      }
      // (2) withdrawers acquire their cSHARE (this touches the vault) BEFORE the gate captures its pin.
      const wds: Array<{ signer: any; intent: bigint }> = [];
      for (const amt of sc.wd) {
        const u = signers[gi++];
        const vAddr = await vault.getAddress();
        await (await USDC.mint(u.address, amt)).wait();
        await (await USDC.connect(u).approve(vAddr, amt)).wait();
        const before = await vault.balanceOf(u.address);
        await (await vault.connect(u).deposit(amt, u.address)).wait();
        const shares = (await vault.balanceOf(u.address)) - before;
        await (await vault.connect(u).approve(await cSHARE.getAddress(), shares)).wait();
        await (await cSHARE.connect(u).wrap(u.address, shares)).wait();
        wds.push({ signer: u, intent: shares });
      }
      // (3) NOW deploy the gate — pin captured on a stable vault; nothing touches it again until routeGate.
      const gate = await (await ethers.getContractFactory("GhostGate")).deploy(
        await cUSDC.getAddress(), await cSHARE.getAddress(), await vault.getAddress(), 60);
      const pin = (await gate.windowInfo(1)).pinRate6;

      // (4) joins: deposits (wrap cUSDC — no vault touch) + pre-acquired withdrawals (transferAndCall only)
      const deps: Array<{ signer: any; intent: bigint }> = [];
      for (const amt of sc.dep) {
        const u = signers[gi++];
        deps.push({ signer: u, intent: await joinDeposit(cUSDC, USDC, gate, u, amt) });
      }
      for (const wv of wds) {
        const enc = await fhevm.createEncryptedInput(await cSHARE.getAddress(), wv.signer.address).add64(wv.intent).encrypt();
        await (await cSHARE.connect(wv.signer)["confidentialTransferAndCall(address,bytes32,bytes,bytes)"](
          await gate.getAddress(), enc.handles[0], enc.inputProof, "0x")).wait();
      }

      const { canceled } = await driveWindow(gate, cUSDC, cSHARE, 1);
      expect(canceled, `${sc.tag}: should finalize (no drift mid-window)`).to.equal(false);

      // every claim settles at pin, rounded down; NO transfer reverts → solvency by construction.
      for (const d of deps) {
        await (await gate.connect(d.signer).claimDeposit(1)).wait();
        expect(await decU(cSHARE, d.signer.address, d.signer), `${sc.tag}: dep claim`).to.equal((d.intent * 1_000_000n) / pin);
      }
      for (const wv of wds) {
        await (await gate.connect(wv.signer).claimWithdraw(1)).wait();
        expect(await decU(cUSDC, wv.signer.address, wv.signer), `${sc.tag}: wd claim`).to.equal((wv.intent * pin) / 1_000_000n);
      }
      console.log(`      ✓ ${sc.tag} (pin=${pin}) — ${deps.length} dep + ${wds.length} wd all paid at pin`);
    }
  });
});
