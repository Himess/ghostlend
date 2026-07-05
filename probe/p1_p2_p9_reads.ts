// P1 (token decimals & rate), P2 (registry validity), P9 (Chainlink feed) — all read-only.
// Run: npx hardhat run probe/p1_p2_p9_reads.ts --network sepolia
import { ethers } from "hardhat";
import { ADDR, ERC20_ABI, WRAPPER_ABI, REGISTRY_ABI, CHAINLINK_ABI, writeFragment, writeState, fmtErr } from "./_lib";

async function tryCall<T>(fn: () => Promise<T>): Promise<T | string> {
  try {
    return await fn();
  } catch (e) {
    return `ERROR(${fmtErr(e)})`;
  }
}

async function main() {
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  console.log(`network chainId=${net.chainId}`);

  // ---------------- P1 ----------------
  const tokens = [
    { key: "cUSDC", ...ADDR.cUSDC },
    { key: "cWETH", ...ADDR.cWETH },
  ];
  const p1rows: string[] = [];
  const p1state: any = {};
  for (const t of tokens) {
    const w = new ethers.Contract(t.wrapper, WRAPPER_ABI, provider);
    const u = new ethers.Contract(t.underlying, ERC20_ABI, provider);
    const wName = await tryCall(() => w.name());
    const wSym = await tryCall(() => w.symbol());
    const wDec = await tryCall(() => w.decimals());
    const wRate = await tryCall(() => w.rate());
    const wUnderlying = await tryCall(() => w.underlying());
    const wCTS = await tryCall(() => w.confidentialTotalSupply());
    const uName = await tryCall(() => u.name());
    const uSym = await tryCall(() => u.symbol());
    const uDec = await tryCall(() => u.decimals());
    const uTS = await tryCall(() => u.totalSupply());
    console.log(`${t.key}: wrapperDec=${wDec} rate=${wRate} underlying(fn)=${wUnderlying} underlyingDec=${uDec}`);
    const expRate = typeof uDec === "bigint" ? 10n ** (uDec - 6n) : "?";
    p1state[t.key] = {
      wrapper: t.wrapper,
      underlying: t.underlying,
      wrapperDecimals: wDec?.toString?.() ?? String(wDec),
      rate: wRate?.toString?.() ?? String(wRate),
      underlyingDecimals: uDec?.toString?.() ?? String(uDec),
    };
    p1rows.push(
      `| ${t.key} | wrapper \`${t.wrapper}\` | name=${wName} symbol=${wSym} | wrapperDec=**${wDec}** | rate=**${wRate}** | underlying()=${wUnderlying} | confTotalSupply=${typeof wCTS === "string" ? wCTS : "bytes32 ok"} |\n` +
        `| | underlying \`${t.underlying}\` | name=${uName} symbol=${uSym} | underlyingDec=**${uDec}** | expectedRate(10^(udec-6))=**${expRate}** | totalSupply=${uTS} | |`,
    );
  }
  const p1 = `### P1 — Token decimals & rate constants

Read-only calls against the deployed wrappers + underlyings (chainId ${net.chainId}).

| token | address | name/symbol | decimals | rate | underlying | totalSupply |
|---|---|---|---|---|---|---|
${p1rows.join("\n")}

**Assumption check:** cUSDC → udec 6 / wrapperDec 6 / rate 1; cWETH → udec 18 / wrapperDec 6 / rate 1e12 (1 confidential base unit = 1e-6 WETH). Compare the bolded values above.
`;
  writeFragment("p1", p1);

  // ---------------- P2 ----------------
  const reg = new ethers.Contract(ADDR.registry, REGISTRY_ABI, provider);
  const p2rows: string[] = [];
  for (const t of tokens) {
    const byUnderlying = await tryCall(() => reg.getConfidentialTokenAddress(t.underlying));
    const validWrapper = await tryCall(() => reg.isConfidentialTokenValid(t.wrapper));
    let isValid: any = "?";
    let confAddr: any = "?";
    let matches: any = "?";
    if (Array.isArray(byUnderlying) || (byUnderlying && typeof byUnderlying === "object" && "isValid" in (byUnderlying as any))) {
      const r: any = byUnderlying;
      isValid = r.isValid ?? r[0];
      confAddr = r.confidentialToken ?? r[1];
      matches = String(confAddr).toLowerCase() === t.wrapper.toLowerCase();
    } else {
      confAddr = byUnderlying;
    }
    console.log(`${t.key}: registry.getConfidentialTokenAddress -> isValid=${isValid} addr=${confAddr} matchesWrapper=${matches}; isConfidentialTokenValid(wrapper)=${validWrapper}`);
    p2rows.push(
      `| ${t.key} | getConfidentialTokenAddress(underlying) → isValid=**${isValid}**, token=\`${confAddr}\` (matches wrapper: **${matches}**) | isConfidentialTokenValid(wrapper) = **${validWrapper}** |`,
    );
  }
  const p2 = `### P2 — Registry validity

Registry \`${ADDR.registry}\`. Signature (from docs): \`getConfidentialTokenAddress(erc20) → (bool isValid, address confidentialToken)\`.

| token | lookup by underlying | wrapper validity |
|---|---|---|
${p2rows.join("\n")}
`;
  writeFragment("p2", p2);

  // ---------------- P9 ----------------
  const cl = new ethers.Contract(ADDR.chainlink, CHAINLINK_ABI, provider);
  const desc = await tryCall(() => cl.description());
  const dec = await tryCall(() => cl.decimals());
  const ver = await tryCall(() => cl.version());
  const rd: any = await tryCall(() => cl.latestRoundData());
  const latestBlock = await provider.getBlock("latest");
  const nowTs = latestBlock ? Number(latestBlock.timestamp) : Math.floor(Date.now() / 1000);
  let priceStr = "?";
  let ageSec: any = "?";
  let updatedAt: any = "?";
  if (Array.isArray(rd)) {
    const answer = rd[1] as bigint;
    updatedAt = Number(rd[3]);
    ageSec = nowTs - updatedAt;
    const d = typeof dec === "bigint" ? Number(dec) : 8;
    priceStr = (Number(answer) / 10 ** d).toString();
  }
  console.log(`Chainlink: desc=${desc} decimals=${dec} price=${priceStr} updatedAt=${updatedAt} ageSec=${ageSec}`);
  const p9 = `### P9 — Chainlink ETH/USD feed sanity

Feed \`${ADDR.chainlink}\` (chainId ${net.chainId}).

| field | value |
|---|---|
| description | **${desc}** |
| decimals | **${dec}** (expect 8) |
| version | ${ver} |
| latest answer (raw) | ${Array.isArray(rd) ? rd[1] : rd} |
| price (USD) | **${priceStr}** |
| updatedAt (unix) | ${updatedAt} |
| chain now (latest block ts) | ${nowTs} |
| staleness (sec) | **${ageSec}** ${typeof ageSec === "number" && ageSec < 3600 ? "(fresh < 1h ✓)" : "(CHECK)"} |
`;
  writeFragment("p9", p9);

  writeState({ p1: p1state, chainId: Number(net.chainId) });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
