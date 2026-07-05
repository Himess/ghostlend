// P4 — fresh-account transfer behavior: ERC7984ZeroBalance revert vs clamp-to-0.
// Run: npx hardhat run probe/p4_fresh.ts --network sepolia
import { ethers, fhevm } from "hardhat";
import { ADDR, ERC20_ABI, WRAPPER_ABI, writeFragment, writeState, fmtErr } from "./_lib";

const TOKEN = ADDR.cUSDC.wrapper;
const UNDER = ADDR.cUSDC.underlying;

async function main() {
  await fhevm.initializeCLIApi();
  const [mainSigner] = await ethers.getSigners();
  const provider = ethers.provider;

  // Brand-new throwaway wallet Y (never held tokens).
  const Y = ethers.Wallet.createRandom().connect(provider);
  console.log("Y address:", Y.address, "Y pk:", Y.privateKey);

  // Fund Y with ETH for gas (a few heavy FHE txs).
  const fundTx = await mainSigner.sendTransaction({ to: Y.address, value: ethers.parseEther("0.08") });
  await fundTx.wait();
  console.log("funded Y with 0.08 ETH:", fundTx.hash);

  const tokenAsY = new ethers.Contract(TOKEN, WRAPPER_ABI, Y);
  const results: any = { Y: Y.address, Ypk: Y.privateKey, fundTx: fundTx.hash };

  // ---- Attempt 1: zero-balance confidentialTransfer (Y never held) ----
  let zeroOutcome = "";
  try {
    const enc = await fhevm.createEncryptedInput(TOKEN, Y.address).add64(1n).encrypt();
    console.log("encrypted amount for Y (zero-balance attempt)");
    const tx = await tokenAsY["confidentialTransfer(address,bytes32,bytes)"](
      mainSigner.address,
      enc.handles[0],
      enc.inputProof,
    );
    const rc = await tx.wait();
    zeroOutcome = `SUCCESS (clamp-to-0) tx=${tx.hash} status=${rc?.status} gasUsed=${rc?.gasUsed}`;
    results.zeroBalance = { outcome: "clamp-to-0-success", tx: tx.hash, gasUsed: rc?.gasUsed?.toString() };
  } catch (e: any) {
    const sel = typeof e?.data === "string" ? e.data.slice(0, 10) : "?";
    zeroOutcome = `REVERT selector=${sel} decoded=${e?.revert?.name ?? "?"}(${(e?.revert?.args ?? []).join(",")}) | ${fmtErr(e)}`;
    results.zeroBalance = { outcome: "revert", selector: sel, decoded: e?.revert?.name ?? null, raw: fmtErr(e) };
  }
  console.log("ZERO-BALANCE OUTCOME:", zeroOutcome);

  // ---- Fund Y via wrap, then retry (funded path) ----
  let fundedOutcome = "";
  try {
    const underAsMain = new ethers.Contract(UNDER, ERC20_ABI, mainSigner);
    const underAsY = new ethers.Contract(UNDER, ERC20_ABI, Y);
    const wrapAmt = 100000n; // 0.1 USDC in base units (rate=1 -> 100000 confidential units)
    // main mints underlying to Y (permissionless mint to arbitrary address)
    const mtx = await underAsMain.getFunction("mint(address,uint256)")(Y.address, wrapAmt);
    await mtx.wait();
    // Y approves wrapper and wraps
    const atx = await underAsY.approve(TOKEN, wrapAmt);
    await atx.wait();
    const wtx = await tokenAsY.wrap(Y.address, wrapAmt);
    const wrc = await wtx.wait();
    console.log(`Y wrapped ${wrapAmt}: mint=${mtx.hash} approve=${atx.hash} wrap=${wtx.hash}`);
    results.funding = { mint: mtx.hash, approve: atx.hash, wrap: wtx.hash, wrapAmt: wrapAmt.toString() };

    // Now Y has a confidential balance; retry the transfer of 1 unit to main.
    const enc2 = await fhevm.createEncryptedInput(TOKEN, Y.address).add64(1n).encrypt();
    const tx2 = await tokenAsY["confidentialTransfer(address,bytes32,bytes)"](
      mainSigner.address,
      enc2.handles[0],
      enc2.inputProof,
    );
    const rc2 = await tx2.wait();
    fundedOutcome = `SUCCESS tx=${tx2.hash} status=${rc2?.status} gasUsed=${rc2?.gasUsed}`;
    results.fundedTransfer = { outcome: "success", tx: tx2.hash, gasUsed: rc2?.gasUsed?.toString() };
  } catch (e: any) {
    fundedOutcome = `ERROR ${fmtErr(e)}`;
    results.fundedTransfer = { outcome: "error", raw: fmtErr(e) };
  }
  console.log("FUNDED OUTCOME:", fundedOutcome);

  const md = `### P4 — Fresh-account transfer behavior (ERC7984ZeroBalance vs clamp-to-0)

Throwaway wallet **Y** = \`${Y.address}\` (never held cUSDC), pk (audit) = \`${Y.privateKey}\`.
Funded with 0.08 ETH for gas: \`${fundTx.hash}\`.
Token = cUSDC wrapper \`${TOKEN}\`.

**Zero-balance attempt** — Y calls \`confidentialTransfer(main, enc(1), proof)\` with an empty, never-initialized balance:

> ${zeroOutcome}

**Funded retry** — Y minted+wrapped 0.1 USDC, then transfers 1 unit to main:

> ${fundedOutcome}

**Decision forced:** if the zero-balance attempt **reverts** (e.g. \`ERC7984ZeroBalance\`), the deposit/supply path MUST pre-check or try/catch the first interaction from a never-funded user. If it **clamps to 0** (succeeds), the pool can rely on the returned \`transferred\` handle uniformly. Selector \`0x3a91f045\`-style decoding is included above.
`;
  writeFragment("p4", md);
  writeState({ p4: results });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
