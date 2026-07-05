# CP3 — Market 2 vault stack — Status Report (near-complete)

**Date:** 2026-07-04 · **Checkpoint:** CP3 (ADDENDUM B / §E) · **Result:** B.5 + batcher pair (both legs)
built & E2E-validated (21/21 mock tests). **Only the Sepolia batch E2E + the randomized conservation
property test remain** (flagged, not silently skipped).

## Update — B.5 + WithdrawBatcher + #4 done since the partial gate
- **B.5 `openLeveragedYield` + `deleverage` + treasury** (`GhostLendPool.sol`, Market 2 = cSHARE collateral /
  cUSDC debt, vault-priced): closed-form `target = lev·deposit` via scalar-mul + select-chain (no encrypted
  mul); clamp chain over {select-target, treasury value, availCash headroom} with §7 error flags; cash-conserving
  accounting (deposit→availCash, debt→availCash−/queue+, shares→treasury−/collateral+). **Tests pass:**
  born-healthy at lev 2/3/4 (debt/coll = 50/66.7/75% < 90% LLTV), deleverage returns the deposit (payout
  1,000,000), and **HCU @ MAX_INDEX = 3.424M depth / 8.83M global — clears the 4.2M drift guard.**
- **WithdrawBatcher E2E** (CP4 prereq — settlement mirror): cSHARE → dispatch → publicDecrypt → `vault.redeem`
  → cUSDC → claim = 1,000,000. **Passes.**
- **Ruling #4 hardening:** README threat-model section (quotes the base "no confidentiality by default" NOTE),
  claim round-down dust documented, negative-carry risk documented + `leverageCarry` view; keeper capacity
  warning (`warnCapacity`, >50% of uint64 cap) added.
- Carry view `leverageCarry(marketId, lev, vaultApyBps) → (borrowAprBps, netCarryBps)` (design lock #5).

---

## B.0 (done earlier, ruled): `BATCHER-NOTES.md` delivered → EXTEND for the pair, STANDALONE for GhostGate (CP4).

## Built and TESTED this checkpoint (17/17 mock tests green, `npm test`)

| Piece | Contract | Status |
|---|---|---|
| **MockYieldVault** (B.1) | `contracts/market2/MockYieldVault.sol` | ✅ ERC-4626 over mock USDC; `sharePrice6()` oracle. **Tested:** yield drip raises share price 1.00 → 1.50. |
| **cSHARE wrapper** (B.2) | `contracts/market2/ConfidentialShareWrapper.sol` | ✅ the exact production `ERC7984ERC20Wrapper` over the vault share. |
| **Batcher pair** (B.3) | `contracts/market2/VaultBatchers.sol` (`VaultBatcherBase` + `DepositBatcher` + `WithdrawBatcher`) | ✅ **extends the audited `BatcherConfidential`** (ruling #1); `minBatchAge` gate + `BatchWindowOpened`/`dispatchableIn()` UX; `_executeRoute` wired to `vault.deposit`/`vault.redeem`. |
| **Full batch-cycle E2E** | `test/Market2Batcher.ts` | ✅ **PASSING in mock:** deposit via `confidentialTransferAndCall` → window gate (too-soon reverts) → `dispatchBatch` (async unwrap) → **real `publicDecrypt`** → `dispatchBatchCallback` (finalizeUnwrap + vault.deposit + wrap shares) → `claim` → user holds 1,000,000 cSHARE. |

**Key validation:** the two-step async unwrap + P6 `publicDecrypt`/`checkSignatures` finalize works end-to-end
through the extended batcher — the core Market 2 mechanism is proven, not just compiled.

## Ruling items handled
- **#1** batcher pair extends `BatcherConfidential`; `minBatchAge=60s` override + `BatchWindowOpened` event; routes wired to `MockYieldVault`; ARCHITECTURE UI note **A3** added (deposits via `confidentialTransferAndCall`, no `join()`).
- Also (earlier this turn) the CP2 conditions: CI drift guard @4.2M, `availCash` amendment (A1), **live Sepolia depth headroom CONFIRMED** (3.574M, matches mock; deployed HCULimit v0.3.0 not tighter than 5M).

## ✅ Sepolia batch E2E — LIVE, CP3 CLOSED (no deviation)
Ran the full deposit-batch cycle against the **DEPLOYED Zama UUPS cUSDC** (not the OZ wrapper used in mock).
**Pre-checks:** `supportsInterface(IERC7984ERC20Wrapper)` = **true** (id `0x1f1c62b2`), `rate()`=1, decimals=6,
`unwrapAmount` present. **Cycle (live tx hashes):**
- DepositBatcher `0xc8df9527d6F9EAF9B7C8A6897344b8b3b06A58CB` (vault `0xD6e3…B8c6`, cSHARE `0x4Eae…8B7B`)
- deposit `0x5091a78d…03ae65` → dispatch `0x34cf4f2c…0913a` → callback `0x71a0d485…c93c488` → claim `0xb4d49651…978d`
- `unwrapRequestId(1)` = burn-amount handle (matches OZ), `publicDecrypt` = 1,000,000, `exchangeRate` = 1,000,000,
  **user cSHARE = 1,000,000.**

**Finding (shapes CP4):** the deployed Zama UUPS wrapper is **behaviorally identical to OZ v0.5.1** for the
batcher's needs — ERC165 advertises the wrapper interface, and unwrap/finalizeUnwrap/unwrapAmount/request-id
semantics match. **GhostGate can reuse the exact unwrap/finalizeUnwrap pattern against the deployed wrapper.**
No workaround needed.

## Remaining → folds into CP4 (mandatory before the CP4 gate)
- **Randomized conservation property test** (design lock #2) — no wrapper dependency; MANDATORY before the
  CP4 gate closes (per HYBRID ruling #2). Accounting is cash-conserving by construction (verified indirectly:
  deleverage returns the exact deposit); the randomized open→rebalance→close invariant sweep folds into CP4.

## CP3 = CLOSED. Next: CP4 (GhostGate standalone, ruling #2)
Two encrypted aggregates (D, Wv); `dir = ge(D,Wv)`, `net = select(...)`, `makePubliclyDecryptable(dir,net)` only;
pinned-rate internal settlement; blended-rate claims (round-down); minBatchAge + BatchWindowOpened; cancel/full-
refund; idiom-reuse attribution comments pointing at BatcherConfidential source lines. PLUS the conservation
property test, PLUS the demo composition (ruling #3): vanilla pair + GhostGate on the SAME MockYieldVault, seed
script running the 3-wallet scene (2 deposits + 1 withdrawal) through both — vanilla = 2 boundary crossings,
GhostGate = 1 net crossing — and the CP4 Sepolia round runs that scene live with the keeper driving both.
