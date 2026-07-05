# CP4 — GhostGate netting gateway — Status Report (gate close)

**Date:** 2026-07-04 · **Checkpoint:** CP4 (ADDENDUM §E, ruling #2 STANDALONE) · **Result:** GhostGate built,
the split-settlement design conflict resolved by ruling (pin-only), **27/27 mock tests green**, demo
composition validated (mock **80% vault-volume reduction**) and run **LIVE on Sepolia**.

---

## 0. The design conflict I flagged, and your ruling
At the start of CP4 I hit a hard conflict between two of your binding instructions and **stopped rather than
improvise**:
- **Binding addition #1:** per-user claims at the *blended* rate (matched-at-pin + net-at-realized-route).
- **Ruling #2 (mandatory):** the ONLY handles ever made publicly decryptable are `dir` and `net`.

Blended per-user claims on the split side require dividing each intent by the **encrypted** aggregate total
(`D` or `W`). FHE has **no euint/euint division** (plaintext divisor only), so the only ways to do it are
(a) reveal a side's total as a third handle, or (b) encrypted division — and (a) destroys the netting privacy
(`dir + net + one total ⇒ both aggregates derivable`), (b) doesn't exist.

**Your ruling: Option 1 (pin-only) — and you noted the contradiction was in binding addition #1; pin-only
supersedes the "blended rate" language.** Everything below implements that ruling exactly.

## 1. What GhostGate does (pin-only model)
Within a `minBatchAge` window it accumulates two encrypted aggregates — `D` (cUSDC deposit intents) and `W`
(cSHARE withdrawal intents) — and at dispatch reveals **only** `dir = (D ≥ Wv)` and `net = |D − Wv|`, where
`Wv = W·pin/1e6` and `pin` is the vault share price captured at window OPEN. Every claim on both sides settles
at `pin` (`claim = intent × pin`, plaintext scalar, **zero division**). The matched portion never touches the
vault; only the residual `net` is routed once, so just the net flow crosses the confidential↔plaintext line.

## 2. Ruling requirements — all satisfied
| # | Requirement | Status |
|---|---|---|
| 1 | All claims settle at the pinned rate, no third handle | ✅ `claimDeposit`/`claimWithdraw` = `_mulDivScalar(intent, …, pin)`; reveal-surface test extended through the claim phase. |
| 2 | Drift guard **in code**: `realized == pin` exactly, else cancel + full refunds | ✅ `finalizeGate` reads `sharePrice6()` and cancels (status `Canceled`) on any mismatch, **before** any unwrap → intents intact for `quit()`. Dedicated test drips mid-window → asserts cancel + full refunds. |
| 3 | Keeper discipline: never drip while a window is live | ✅ README threat-model invariant + `keeper.ts::runGhostGate` drives the window to Finalized **before** any yield drip in the same pass (`drip → open → dispatch → drip`). |
| 4 | Docs/threat-model note (why pin-only; reject reveal; roadmap) | ✅ README "GhostGate" section: pin-only exact for this vault; reveal-total rejected (both aggregates derivable) + euint/euint division absent; roadmap = coarse-bucket splits. |
| 5 | Un-revert net>0; conservation sweep (both dirs + zero-net); 3-wallet demo E2E mock+live | ✅ `finalizeGate` routes net>0 both directions; seeded conservation sweep (7 shapes) passes; demo run in mock and **live on Sepolia**. |

## 3. Reveal surface — proven, not asserted by hand
`revealed(w, who)` probes `FHE.isPubliclyDecryptable` for `dir`, `net`, `D`, `W`, and both per-user intents.
The reveal-surface test walks the **full lifecycle** (pre-dispatch → post-dispatch → post-finalize → **post-
route** → **post-claim**) and asserts: `D`, `W`, and every intent are **never** publicly decryptable; `dir`
and `net` become decryptable only at dispatch. The net-leg unwrap does make the wrapper's burn-amount handle
public, but that value **equals `net`** (already revealed) — no new information; `D`/`W`/intents stay hidden.

## 4. Conservation sweep (design lock #2 — mandatory before this gate)
Seeded pseudo-random sweep, each scenario on a fresh gate, every participant a fresh signer:

| Scenario | pin | Result |
|---|---|---|
| zero-net (2 dep + 1 wd) | 1.0 | route skipped, both paid at pin |
| deposit-win | 1.0 | net routed via `vault.deposit`, solvent |
| withdraw-win (2 wd) | 1.0 | net routed via `vault.withdraw`, solvent |
| one-sided deposits (net = D) | 1.0 | full amount routed, solvent |
| one-sided withdrawals (net = Wv) | 1.0 | full amount routed, solvent |
| pin ≠ 1.0 (rounding) | 1.5 | round-down dust to gate, no short |
| random shape | 1.0 | solvent |

**Invariant asserted every scenario:** each claim equals `floor(intent × pin-rate)` and **no transfer ever
reverts** (solvency by construction; round-down dust accrues to the gate).

## 5. Demo composition (ruling #3) — the headline
Same 3-wallet scene (two deposits 700k + 800k, one withdrawal worth 1.0e6) through BOTH paths on the SAME
`MockYieldVault` (`scripts/ghostgate-demo.ts`):

| Path | Vault boundary crossings | On-chain-visible vault volume |
|---|---|---|
| Vanilla batcher pair | **2** (gross 1.5e6 in + 1.0e6 out) | **2,500,000** |
| **GhostGate netting** | **1** (net 0.5e6 in only) | **500,000** |

**GhostGate hides 2,000,000 of gross flow — 80% less on-chain-visible vault volume — and the gross
deposit/withdrawal demand is never revealed.** The matched 1.0e6 settles internally at the pin.

## 6. Sepolia live round (ruling #3)
The same script ran **live on Sepolia** — identical result (2 crossings/2.5e6 vs **1 crossing/0.5e6, 80%
hidden**). Fresh deploys: vault `0xA46D…3CC8`, cUSDC `0x8018…257A`, cSHARE `0xd032…5d66`, DepositBatcher
`0xb4E1…881a`, WithdrawBatcher `0x673F…b3e3`, **GhostGate `0xd1ea58aA0E5F9E5744A7906E1065B55a7833b16A`**
(pin captured = 1,000,000). Signer `0xF505…E5Ae` played all three roles. Full hashes in
`deployments/ghostgate-demo.sepolia.json`.

**GhostGate lane (live tx):** aliceDeposit `0x62cb5b4e…` → bobDeposit `0xe4ff875d…` → carolWithdraw
`0x75f5192d…` → **dispatch** `0x9fd87071…` (dir=1, net=500000) → **finalizeGate** `0x054be31f…` → **routeGate**
`0xbe5e799e…` (net-leg `vault.deposit`) → claims alice `0x03c3cad2…` / bob `0x161bf9da…` / carol `0xea9212a0…`.
**Vanilla lane (live tx):** deposits `0x1bd9a5c1…` + `0xc9b06c52…`, withdraw `0x26bfd088…`, depDispatch
`0x10f68ea3…` + callback `0x138e23ed…`, wdrDispatch `0xa4108344…` + callback `0xf65c0fbd…`.

The net-leg `routeGate` (`finalizeUnwrap` + `vault.deposit` + re-wrap) executed against the **live** relayer
`publicDecrypt` + KMS proof — the two-step async route works on-chain exactly as in mock.

## 7. Deviations flagged (none silent)
1. **Binding addition #1 superseded by your ruling** — claims settle at pin, not a blended realized-route
   rate. This was your explicit resolution of the flagged conflict; recorded here for the trail.
2. **Drift guard placed in `finalizeGate` (route-decision point), not after the unwrap.** Observable behavior
   is identical (cancel + full refunds on drift) but strictly safer — it cancels *before* any irreversible
   unwrap, so refunds are the untouched original intents. Deliberate strengthening of "in the route execution
   path."
3. **Net-leg reveals the burn amount (= `net`) via the wrapper's unwrap**, a handle other than `dir`/`net`.
   It carries no new information (equals the already-public `net`); `D`/`W`/intents remain hidden. Documented
   in the reveal-surface section; ruling #2's intent (aggregates + intents secret) is fully preserved.

## 8. Idiom reuse — attribution (OZ confidential-contracts 0.5.1 `finance/BatcherConfidential.sol`)
`onConfidentialTransferReceived` intake (L282); self-balance unwrap via `externalEuint64.wrap(unwrap(handle))`
+ empty proof (L195); two-step async route callback + `finalizeUnwrap`/`checkSignatures` try-catch fallback
(L210–225); status-enum replay guards + storage-rebuilt handle lists (mirrors `_validateStateBitmap` L442 +
the epoch-machine discipline); ERC-165 wrapper checks (ctor); pro-rata round-down claim shape (L359).

## CP4 = CLOSED. Next: CP5 (swap lane).
Contracts: `contracts/market2/GhostGate.sol`. Tests: `test/GhostGate.ts` (6 GhostGate cases; 27/27 mock
suite green). Scripts: `scripts/ghostgate-demo.ts` (both paths, mock + Sepolia), `scripts/keeper.ts`
(`runGhostGate`). Docs: README GhostGate threat-model.
