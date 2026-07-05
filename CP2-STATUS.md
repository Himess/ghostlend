# CP2 — Epoch + Liquidation machines, Sepolia deploy — Status Report

**Date:** 2026-07-04 · **Checkpoint:** CP2 (per ADDENDUM §E) · **Result:** complete, one open deviation for ruling

---

## Deployed (Sepolia)

| Contract | Address | Notes |
|---|---|---|
| **GhostLendPool** | `0x9631263997E127Cbf82363FF31Ad7917d3612D64` | 2 markets; registry `isValid` validation passed on-chain (confirms P2) |
| **OracleAdapter** | `0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495` | Chainlink ETH/USD, 2h staleness; live price ~$1758 |

Markets: **M0** = borrow cUSDC against cWETH · **M1** = borrow cWETH against cUSDC · LLTV 80%.
Deployment record: `deployments/sepolia-core.json`.

## Test status

- **Mock suites: 15 passing** (`npm test`) — 3 template + 8 CP1 core + 4 CP2 (epoch, liquidation, HCU gate, property).
- **Live Sepolia smoke: 2 passing** (`test/GhostLendSepolia.ts`).

---

## Directive compliance (from the CP1 review)

### #2 — Money-math rewrite → DONE
- `INDEX_ONE = 1e6`, `MAX_INDEX = 4e6`, `MAX_AMOUNT = 1e12` (1,000,000 whole tokens).
- **All money math is now euint64 — zero euint128.** Universal `_cap` on every operand + folded/normalized
  `COEF_NUM / kDen` coefficients (price·LLTV·decimals·1e4 collapsed to one scalar mul+div). User-favorable
  coefficient rounded down, protocol-favorable up — ≤1-unit conservatism documented at each site.
- Scaled↔actual conversions short-circuit to identity at `index == 1e6` (fast path).

### #3 — granted-vs-transferred → DONE (stronger than specified)
- Instead of conservatively-rounded `avail`, physical liquidity is tracked as a **`availCash` euint64
  accumulator** updated by the real transferred/granted deltas. It is `≤` physical balance **by
  construction**, so `granted == transferred` on every outgoing leg — no rounding audit needed.
- **#3b property test passes:** after every outgoing transfer, token-balance delta == position-implied
  granted (verified across borrow, clamped over-borrow, and withdrawSupply).

### Epoch machine (ARCHITECTURE §5) → DONE
`closeEpoch` → `publicDecrypt([supplySnap, borrowSnap])` → `finalizeEpoch(cleartexts, proof)` with the
P6-validated pattern: **replay guard** (status enum), **storage-rebuilt handle list** (never calldata),
`FHE.checkSignatures`, util → IRM → rate. No caller-dependent effects. E2E test passes incl. replay-revert.

### Liquidation machine (ARCHITECTURE §6) → DONE
`poke` reveals **one bit** (healthy/unhealthy) → `finalizeLiquidation` (replay guard, storage-rebuilt
handle, POKE_TTL, **internal absorb — no token transfer**, debt wiped, collateral seized to reserves).
E2E passes: healthy → no-op; ETH price crash → unhealthy → debt wiped.

### #5 — Sepolia smoke (zero-handle pre-check) → DONE (live)
A never-funded account's `supply` **succeeds on real Sepolia** — the `_pullClamped` zero-handle pre-check
short-circuits before `confidentialTransferFrom` would revert `ERC7984ZeroBalance`. Plus a funded
wrap → setOperator → supply → decrypt round-trip (decrypted scaledSupply = 250000).

### #1 / #4 / #6 — DONE
- 1M-token position cap reflected in `README.md`. #4 viaIR retained.
- `view` warning fixed; `npm test` targets the mock files so bare-glob **HH201 is avoided**.
- Keeper skeleton (`scripts/keeper.ts`) + deploy script (`scripts/deploy-core.ts`) added.

---

## ⚠️ Open deviation — the #2e HCU depth gate (NEEDS A RULING)

Borrow-with-interest (index at `MAX_INDEX`, fast-path OFF) measures:

| metric | measured | your target | real protocol cap |
|---|---|---|---|
| global HCU | **6.46M** | ≤ 10M ✅ | 20M |
| **sequential depth** | **3.57M** | ≤ 3.0M ❌ (0.57M over) | 5M (28% margin ✅) |

The CI guard is **mandatory at the real 5M cap** (passes) — I did **not** silently relax the 3.0M number
or ship a hidden compromise. The ~3.4–3.6M floor is inherent to a *correct* 2-conversion borrow (live-price
credit limit + scaled interest accounting).

**Options to reach 3.0M:**
- **(a)** round debt-add DOWN by ≤1 unit (saves ~0.13M; mild deviation from "protocol-favorable").
- **(b)** scaled-space restructure (~3.4M; marginal, adds a serial transfer).
- **(c)** accept 3.57M as safe — correct, 28% under the real cap, property-verified. **← recommended.**

### RULING: option (c) accepted (3.57M stands). Conditions satisfied:
1. **CI drift guard added** — the mandatory gate now FAILS the build if borrow depth exceeds **4.2M**
   ("re-measure and justify"), with the hard caps at 5M depth / 10M global. No silent drift.
2. **LIVE depth headroom CONFIRMED (condition #2).** A throwaway `ThrowawayDepthProbe` (dev-only index
   setter, deployed `0x84460019e557d4Ad6893334d4544503C44e0d9D0`, now abandoned) forced index → MAX_INDEX
   and ran one worst-case borrow-with-interest **on live Sepolia**: **succeeded**, HCU **depth 3,574,000 /
   global 6,456,128** — identical to the mock. → the deployed **HCULimit v0.3.0 does NOT enforce tighter
   than 5M**; our borrow clears it with 28% headroom. (Resolves the last PROBE-RESULTS P8 uncertainty.)
   tx `0x869b4b52a1d1616ba141f90e3883ba5a6498cc34011416406ce0f896399725a4`.
- Protocol-favorable rounding retained as a safety invariant (option (a) rejected, per ruling).
- `availCash` documented as the canonical liquidity design (ARCHITECTURE amendment note A1).

---

## Not yet done (flagged)
- Keeper is a **skeleton** (single-pass; production needs an event-log watch-list + timer/cron).
- No mainnet deployment (non-goal).

## Gate — two asks before CP3
1. **Rule on the depth deviation** (accept 3.57M, or pursue 3.0M via option a/b).
2. **Confirm CP3 start** — which begins with **B.0: read the real `BatcherConfidential` source (confirmed
   present in OZ 0.5.1 npm `finance/`), write `BATCHER-NOTES.md`, and STOP for review before wiring GhostGate.**
