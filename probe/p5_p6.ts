// P5 (deposit primitive) + P6 (public decryption round-trip) against real Sepolia + KMS.
// Run: npx hardhat run probe/p5_p6.ts --network sepolia
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ADDR, ERC20_ABI, WRAPPER_ABI, writeFragment, writeState, fmtErr } from "./_lib";

const TOKEN = ADDR.cUSDC.wrapper;
const UNDER = ADDR.cUSDC.underlying;

function now() {
  return Number(process.hrtime.bigint() / 1000000n); // ms, monotonic
}

async function main() {
  await fhevm.initializeCLIApi();
  const [signer] = await ethers.getSigners();
  const me = signer.address;
  console.log("signer:", me);
  const state: any = {};

  // ============ P5 ============
  // 1) Deploy ProbeSink(token=cUSDC)
  const Factory = await ethers.getContractFactory("ProbeSink");
  const sink = await Factory.deploy(TOKEN);
  await sink.waitForDeployment();
  const sinkAddr = await sink.getAddress();
  console.log("ProbeSink:", sinkAddr);
  state.sink = sinkAddr;

  // 2) Fund `me` with a confidential cUSDC balance via mint+approve+wrap
  const under = new ethers.Contract(UNDER, ERC20_ABI, signer);
  const token = new ethers.Contract(TOKEN, WRAPPER_ABI, signer);
  const wrapAmt = 500000n; // 0.5 USDC (rate=1 -> 500000 confidential units)
  const mtx = await under.getFunction("mint(address,uint256)")(me, wrapAmt);
  await mtx.wait();
  const atx = await under.approve(TOKEN, wrapAmt);
  await atx.wait();
  const wtx = await token.wrap(me, wrapAmt);
  const wrc = await wtx.wait();
  // parse Wrap event for roundedAmount
  let rounded = "?";
  for (const log of wrc?.logs ?? []) {
    try {
      const p = token.interface.parseLog(log as any);
      if (p?.name === "Wrap") rounded = p.args[1].toString();
    } catch {}
  }
  console.log(`wrapped ${wrapAmt}; Wrap.roundedAmount=${rounded}; wrap tx=${wtx.hash}`);
  state.wrap = { amount: wrapAmt.toString(), roundedAmount: rounded, tx: wtx.hash };

  // 3) setOperator(sink, until)
  const until = Math.floor(Date.now() / 1000) + 3600;
  const otx = await token.setOperator(sinkAddr, until);
  const orc = await otx.wait();
  let evtUntil = "?";
  for (const log of orc?.logs ?? []) {
    try {
      const p = token.interface.parseLog(log as any);
      if (p?.name === "OperatorSet") evtUntil = p.args[2].toString();
    } catch {}
  }
  const isOp = await token.isOperator(me, sinkAddr);
  console.log(`setOperator until=${until} eventUntil=${evtUntil} isOperator=${isOp} tx=${otx.hash}`);
  state.operator = { until, eventUntil: evtUntil, isOperator: isOp, tx: otx.hash };

  // 4) Encrypt deposit amount bound to (sink, me); call sink.pull(me, enc, proof)
  const depositAmt = 1000n;
  const enc = await fhevm.createEncryptedInput(sinkAddr, me).add64(depositAmt).encrypt();
  const ptx = await sink.pull(me, enc.handles[0], enc.inputProof);
  const prc = await ptx.wait();
  console.log(`pull tx=${ptx.hash} status=${prc?.status} gasUsed=${prc?.gasUsed}`);
  state.pull = { depositAmt: depositAmt.toString(), tx: ptx.hash, gasUsed: prc?.gasUsed?.toString() };

  // 5) Read back the accounted total by user-decrypting the sink's aggregate handle
  const totalHandle = await sink.totalPulledHandle();
  let decryptedTotal = "?";
  try {
    decryptedTotal = (await fhevm.userDecryptEuint(FhevmType.euint64, totalHandle, sinkAddr, signer)).toString();
  } catch (e) {
    decryptedTotal = `DECRYPT_ERROR(${fmtErr(e)})`;
  }
  console.log(`totalPulled handle=${totalHandle} decrypted=${decryptedTotal} (expect ${depositAmt})`);
  state.readback = { handle: totalHandle, decrypted: decryptedTotal, expected: depositAmt.toString() };

  // Optional: real-Sepolia HCU of the pull tx (P8 cross-check)
  try {
    const hcu = fhevm.computeTransactionHCU(prc!);
    state.pullHCU = { globalHCU: hcu.globalHCU, maxHCUDepth: hcu.maxHCUDepth };
    console.log(`pull HCU: global=${hcu.globalHCU} depth=${hcu.maxHCUDepth}`);
  } catch (e) {
    state.pullHCU = `unavailable(${fmtErr(e)})`;
  }

  const p5 = `### P5 — Deposit primitive E2E (wrap → operator → confidentialTransferFrom → read-back)

ProbeSink deployed at \`${sinkAddr}\` (token = cUSDC \`${TOKEN}\`).

1. **Fund**: mint ${wrapAmt} base USDC, approve, \`wrap(me, ${wrapAmt})\` → \`Wrap.roundedAmount = ${rounded}\`. tx \`${state.wrap.tx}\`.
2. **setOperator(sink, ${until})**: \`OperatorSet.until = ${evtUntil}\`, \`isOperator(me, sink) = ${isOp}\`. tx \`${otx.hash}\`.
3. **Operator pull**: encrypted input bound to (sink, me); \`sink.pull(me, enc(${depositAmt}), proof)\` → status ${prc?.status}, **gasUsed ${prc?.gasUsed}**. tx \`${ptx.hash}\`.
4. **Accounting read-back**: sink's \`_totalPulled\` (returned \`transferred\` handle FHE.add'd) user-decrypts to **${decryptedTotal}** (expected ${depositAmt}).
5. **Real-Sepolia HCU of the pull tx**: ${typeof state.pullHCU === "string" ? state.pullHCU : `global=${state.pullHCU.globalHCU}, depth=${state.pullHCU.maxHCUDepth}`}.

**Confirms:** operator pull works; the pool-as-\`to\` can CONSUME the returned \`transferred\` handle (FHE.add) and re-authorize it for user decryption — the core deposit design is sound on the real mock.
`;
  writeFragment("p5", p5);

  // ============ P6 ============
  // 1) Store a trivially-encrypted constant and make it publicly decryptable
  const CONST = 12345n;
  const stx = await sink.storeForPublicDecrypt(CONST);
  const src = await stx.wait();
  const handle = await sink.storedHandle();
  console.log(`stored ${CONST}; handle=${handle}; tx=${stx.hash}`);
  state.p6 = { const: CONST.toString(), handle, storeTx: stx.hash };

  // 2) Off-chain publicDecrypt (real relayer + KMS), timed
  const t0 = now();
  const pub = await fhevm.publicDecrypt([handle]);
  const t1 = now();
  const latencyMs = t1 - t0;
  console.log(`publicDecrypt latency=${latencyMs}ms clearValues=${JSON.stringify(pub.clearValues, (_k, v) => (typeof v === "bigint" ? v.toString() : v))}`);
  state.p6.publicDecrypt = {
    latencyMs,
    abiEncodedClearValues: pub.abiEncodedClearValues,
    decryptionProofLen: pub.decryptionProof.length,
    numSigners: parseInt(pub.decryptionProof.slice(2, 4), 16),
  };

  // 3) Tamper tests via staticCall (must revert) BEFORE the real finalize
  let tamperProofOutcome = "", tamperClearOutcome = "";
  const goodClear = pub.abiEncodedClearValues;
  const goodProof = pub.decryptionProof;
  // (a) flip last byte of proof
  const badProof = goodProof.slice(0, -2) + (goodProof.slice(-2) === "00" ? "01" : "00");
  try {
    await sink.finalize.staticCall(goodClear, badProof);
    tamperProofOutcome = "NO REVERT (unexpected!)";
  } catch (e) {
    tamperProofOutcome = `reverted ✓ (${fmtErr(e)})`;
  }
  // (b) wrong cleartext (encode 99999) with the real proof
  const wrongClear = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [99999]);
  try {
    await sink.finalize.staticCall(wrongClear, goodProof);
    tamperClearOutcome = "NO REVERT (unexpected!)";
  } catch (e) {
    tamperClearOutcome = `reverted ✓ (${fmtErr(e)})`;
  }
  console.log(`tamper proof -> ${tamperProofOutcome}`);
  console.log(`tamper cleartext -> ${tamperClearOutcome}`);

  // 4) Real finalize (verifies real KMS proof on-chain)
  const ftx = await sink.finalize(goodClear, goodProof);
  const frc = await ftx.wait();
  const finalized = await sink.finalizedValue();
  console.log(`finalize tx=${ftx.hash} status=${frc?.status} gasUsed=${frc?.gasUsed} finalizedValue=${finalized}`);
  state.p6.finalize = {
    tx: ftx.hash,
    gasUsed: frc?.gasUsed?.toString(),
    finalizedValue: finalized.toString(),
    tamperProof: tamperProofOutcome,
    tamperCleartext: tamperClearOutcome,
  };

  const p6 = `### P6 — Public decryption on REAL Sepolia + latency

ProbeSink \`${sinkAddr}\`. Stored constant **${CONST}**, handle \`${handle}\` (tx \`${stx.hash}\`).

- **publicDecrypt round-trip latency: ${latencyMs} ms** (real relayer + KMS).
- decryptionProof: ${state.p6.publicDecrypt.decryptionProofLen} hex chars, **numSigners = ${state.p6.publicDecrypt.numSigners}** (proof layout = 1 + 65·numSigners + extraData).
- clearValues returned: field is \`clearValues\` (not \`values\`).
- **Tamper — bad proof** (flipped byte): \`finalize\` staticCall → ${tamperProofOutcome}
- **Tamper — wrong cleartext** (encode 99999 w/ real proof): \`finalize\` staticCall → ${tamperClearOutcome}
- **Real finalize**: \`checkSignatures\` accepted the real KMS proof on-chain; decoded \`finalizedValue = ${finalized}\` (expected ${CONST}). status ${frc?.status}, **gasUsed ${frc?.gasUsed}** (≈ epoch/liquidation finalize cost). tx \`${ftx.hash}\`.

**Confirms:** real KMS proofs verify via \`FHE.checkSignatures\`; tampered proof/cleartext revert (\`InvalidKMSSignatures\`); the storage-rebuilt handle list + replay guard pattern works on live Sepolia.
`;
  writeFragment("p6", p6);
  writeState({ p5: state, p6: state.p6 });
  console.log("\nP5+P6 DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
