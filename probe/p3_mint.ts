// P3 — underlying mock mint semantics. Run: npx hardhat run probe/p3_mint.ts --network sepolia
import { ethers } from "hardhat";
import { ADDR, ERC20_ABI, writeFragment, writeState, fmtErr } from "./_lib";

async function main() {
  const [main] = await ethers.getSigners();
  console.log("signer:", main.address);
  const rows: string[] = [];
  const state: any = {};

  const unders = [
    { key: "USDC", addr: ADDR.cUSDC.underlying, dec: 6 },
    { key: "WETH", addr: ADDR.cWETH.underlying, dec: 18 },
  ];

  for (const u of unders) {
    const c = new ethers.Contract(u.addr, ERC20_ABI, main);
    let sig = "mint(address,uint256)";
    // 1) detect signature via staticCall
    let detected = false;
    try {
      await c.getFunction("mint(address,uint256)").staticCall(main.address, 1n);
      detected = true;
    } catch (e) {
      try {
        await c.getFunction("mint(uint256)").staticCall(1n);
        sig = "mint(uint256)";
        detected = true;
      } catch (e2) {
        sig = `UNKNOWN (addr-variant: ${fmtErr(e)}; uint-variant: ${fmtErr(e2)})`;
      }
    }
    console.log(`${u.key}: mint signature = ${sig} detected=${detected}`);

    // 2) cap mapping via free staticCalls (only for the address-variant)
    const capProbe: string[] = [];
    if (sig === "mint(address,uint256)") {
      const candidates: [string, bigint][] = [
        ["1e6 base", 1_000_000n],
        ["1e6+1 base", 1_000_001n],
        ["1e6 tokens (1e6*10^dec)", 10n ** BigInt(u.dec) * 1_000_000n],
        ["1e6 tokens +1", 10n ** BigInt(u.dec) * 1_000_000n + 1n],
        ["2e6 tokens", 10n ** BigInt(u.dec) * 2_000_000n],
      ];
      for (const [label, amt] of candidates) {
        try {
          await c.getFunction("mint(address,uint256)").staticCall(main.address, amt);
          capProbe.push(`${label}=OK`);
        } catch (e) {
          capProbe.push(`${label}=REVERT(${fmtErr(e)})`);
        }
      }
    }
    console.log(`${u.key}: capProbe = ${capProbe.join(" ; ")}`);

    // 3) real mint of a small distinctive amount to learn units
    let unitFinding = "n/a";
    let bal0 = 0n, bal1 = 0n, bal2 = 0n, tx1hash = "", tx2hash = "";
    if (detected && sig === "mint(address,uint256)") {
      bal0 = await c.balanceOf(main.address);
      const m = 123456n; // distinctive, well below any cap
      const t1 = await c.getFunction("mint(address,uint256)")(main.address, m);
      const r1 = await t1.wait();
      tx1hash = t1.hash;
      bal1 = await c.balanceOf(main.address);
      const delta1 = bal1 - bal0;
      unitFinding = delta1 === m ? "arg = RAW BASE UNITS (delta == arg)" : `arg scaled (delta=${delta1} for arg=${m})`;
      // 4) second mint in a separate tx → cooldown?
      try {
        const t2 = await c.getFunction("mint(address,uint256)")(main.address, m);
        await t2.wait();
        tx2hash = t2.hash;
        bal2 = await c.balanceOf(main.address);
      } catch (e) {
        tx2hash = `REVERT(${fmtErr(e)})`;
        bal2 = bal1;
      }
      console.log(`${u.key}: bal0=${bal0} bal1=${bal1} bal2=${bal2} tx1=${tx1hash} tx2=${tx2hash}`);
    }

    state[u.key] = { addr: u.addr, sig, unitFinding, balanceAfter: bal2.toString(), tx1: tx1hash, tx2: tx2hash };
    rows.push(
      `#### ${u.key} underlying \`${u.addr}\`
- mint signature: **${sig}**
- units: **${unitFinding}**
- cap staticCall map: ${capProbe.length ? capProbe.join(" ; ") : "n/a"}
- 2nd mint in separate tx: ${tx2hash.startsWith("REVERT") ? "**BLOCKED** " + tx2hash : "**OK** (" + tx2hash + ") → no per-call cooldown"}
- balances: before=${bal0} afterMint1=${bal1} afterMint2=${bal2}
- tx1: ${tx1hash}`,
    );
  }

  const md = `### P3 — Underlying mock mint semantics

Signer (recipient) = \`${(await ethers.getSigners())[0].address}\`.

${rows.join("\n\n")}

**Interpretation:** "1,000,000 tokens per call" cap → see which staticCall boundary flips OK→REVERT above. If \`1e6 base=OK\` but \`1e6 tokens\` reverts, the cap is denominated in **base units** (=1e6 wei); if \`1e6 tokens=OK\` and \`2e6 tokens=REVERT\`, it is denominated in **whole tokens**.
`;
  writeFragment("p3", md);
  writeState({ p3: state });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
