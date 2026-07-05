# GhostLend (working name) — Confidential Lending + Leverage on Zama FHEVM
## ARCHITECTURE v1.0 — implementation blueprint for Claude Code

> **Ground rules for the implementer.** The `zama-docs/` pack (00–07) is the source of truth; when this
> document and the pack disagree, the pack wins — flag the conflict, don't silently pick. Anything marked
> `PROBE` below must be resolved against live Sepolia before the dependent code is written. Never use
> `FHE.requestDecryption`, `SepoliaConfig`, `TFHE.*`, `ebytes*`, `FHE.sum`, `FHE.isIn`, or any oracle
> push-callback pattern — all removed/unavailable (00-INDEX "headline corrections", 06 §1).

---

## Amendment notes (post-implementation, canonical)

- **A1 — Liquidity accounting = `availCash` accumulator (CP2, approved).** Supersedes any "avail =
  actual(aggSupply) − actual(aggBorrow)" derivation. Each market tracks a euint64 `availCash` handle updated
  by the REAL transferred/granted deltas (supply/repay `+`, borrow/withdrawSupply `−`). Because it tracks the
  same physical token flows, `availCash ≤ pool balance` **by construction**, so `granted ≤ availCash ⇒
  transferred == granted` on every outgoing leg (property-tested, #3b). This replaces conservative
  index-rounding for `avail` and keeps the money math in euint64 (no euint128).
- **A3 — Batcher deposit UX (CP3).** Users deposit into a Market 2 batcher via
  `fromToken.confidentialTransferAndCall(batcher, encAmount, inputProof, "")` → `onConfidentialTransferReceived`
  → internal `_join`. **There is no `join()` function** (BATCHER-NOTES §2). §12 frontend flows must use the
  transfer-and-call path; the "Next batch dispatched in ~mm:ss" countdown reads `batcher.dispatchableIn()` /
  the `BatchWindowOpened(batchId, dispatchableAt)` event.
- **A2 — Precision/caps (CP1-review #2).** `INDEX_ONE = 1e6`, `MAX_INDEX = 4e6`, `MAX_AMOUNT = 1e12`
  (1e6 whole tokens; §2's 1e15 is superseded). All plaintext price·LLTV·decimals factors are folded and
  normalized to a fixed `COEF_NUM` budget so every product stays < 2^64 (no euint128). Borrow-with-interest
  HCU depth ≈ 3.57M (accepted; CI drift-guarded at 4.2M, hard cap 5M).

---

## 0. Pinned stack

| Component | Pin | Why |
|---|---|---|
| `@fhevm/solidity` | `0.11.1` (exact) | OZ peer-dep pins exactly 0.11.1 |
| `@openzeppelin/confidential-contracts` | `0.5.1` | current, audited-per-release |
| `@fhevm/hardhat-plugin` | `^0.4.2` | current |
| Hardhat | `^2.28.6` (NOT v3), hardhat-deploy `^0.11.x`, chai `4`, ethers `^6.16` | template-verified |
| solc | `0.8.27`, evmVersion `cancun` | template-verified |
| Frontend | `@zama-fhe/sdk@3.2.0` + `@zama-fhe/react-sdk@3.2.0` | current SDK v3; tests still use legacy relayer-sdk `^0.4.4` like the template |
| Node | even LTS ≥ 20 | template requirement |
| Base contract | `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` | auto-resolves per chainid |

Sepolia externals (from 05-addresses / 03-erc7984 §8):
- cUSDCMock wrapper `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`, underlying `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`
- cWETHMock wrapper `0x46208622DA27d91db4f0393733C8BA082ed83158`, underlying `0xff54739b16576FA5402F211D0b938469Ab9A5f3F`
- Wrappers Registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` (check `isValid` at deploy, store result)
- Relayer `https://relayer.testnet.zama.org`
- Chainlink ETH/USD (Sepolia) `0x694AA1769357215DE4FAC081bf1f309aDC325306` — **PROBE: confirm against docs.chain.link before wiring; treat 8 decimals.**

---

## 1. System overview

Three contracts, one repo (fhevm-hardhat-template fork):

1. **`GhostLendPool.sol`** — the whole protocol: 2 isolated markets, encrypted per-user positions,
   plaintext interest indexes, epoch aggregate publishing, boolean-only liquidation. Inherits
   `ZamaEthereumConfig`, `ReentrancyGuard`.
2. **`InterestRateModel.sol`** — pure plaintext library (kinked IRM). No FHE.
3. **`OracleAdapter.sol`** — Chainlink wrapper: staleness check (`updatedAt + 1 hours`), positive answer,
   returns `(uint256 priceE8)`. No FHE.

Optional Phase-2 (only if Day 1–3 land): **`LeverageRouter.sol`** (§9).

**Markets** (isolated, Morpho-Blue-style):
- Market 0: collateral **cWETH**, debt **cUSDC**, LLTV 80% — "borrow stables against ETH"
- Market 1: collateral **cUSDC**, debt **cWETH**, LLTV 80% — "borrow ETH against stables" (the user's
  'deposit cUSDC, get ETH' flow)

Each market has its own supply side (lenders deposit the *debt asset* and earn borrow interest).
No external yield source — testnet has none; yield = real interest paid by borrowers.

**What is encrypted (euint64 handles per user per market):** lender supplied principal (scaled),
borrower collateral, borrower debt (scaled). **What is plaintext:** interest indexes, rates,
utilization *after epoch reveal*, prices, LLTV, timestamps, market config, participant addresses
(unavoidable — `ConfidentialTransfer` events expose from/to; 03 §9).

---

## 2. Precision & math model (locked — do not improvise)

- Token amounts: **euint64, 6 decimals** (wrapper-enforced; cWETH's on-chain unit = 1e-6 WETH via
  rate 1e12 — 03 §10/§31). All internal amounts are in these base units.
- Interest index: plaintext `uint64`, **1e9 precision** ("RAY-lite"), starts at `1e9`, monotonic.
- Prices: plaintext, Chainlink 1e8.
- **Encrypted×plaintext only.** Never encrypted×encrypted mul in user paths (HCU cliff: non-scalar
  euint64 mul 596k — 06 §3). `FHE.div`/`rem` plaintext divisor only (01 §1).
- Wide intermediates: cast `euint64 → euint128` before any mul whose product can exceed 2^64;
  downcast at the end (bounded by construction, see caps). Full arithmetic exists on euint128 (01 §1).
- **Caps to make overflow impossible by construction:** clamp every user-supplied amount:
  `amt = FHE.min(amt, FHE.asEuint64(MAX_AMOUNT))` with `MAX_AMOUNT = 1e15` (= 1e9 whole tokens).
  Then `amt(≤1e15) × index(≤~4e9) ≤ 4e24 << 2^127`, and results ÷1e9 fit euint64. Also cap growth:
  in `finalizeEpoch`, cap the index so it never exceeds `4e9` (revert-safe, plaintext).
- Scaled-balance accounting (Aave-style, per market):
  - store `scaled = actual_at_touch × 1e9 / index_at_touch` (round **down** for user credit,
    **up** for user debt: `divUp(x,d) = (x + d − 1)/d` — plaintext d, scalar ops)
  - current actual = `scaled × index / 1e9` (euint128 intermediate)
- Encrypted arithmetic wraps silently (06 §2) — with the caps above, wrap is unreachable in user
  paths; still use OZ `FHESafeMath.tryAdd/tryDecrease` on aggregate updates (belt & suspenders).

---

## 3. Storage layout

```solidity
struct Market {
    IERC7984 collateralToken;      // wrapper address
    IERC7984 debtToken;
    uint16   lltvBps;              // 8000
    uint16   liqBonusBps;          // 500
    // plaintext rate state
    uint64   borrowIndex;          // 1e9 start
    uint64   supplyIndex;          // 1e9 start
    uint64   borrowRateRayPerSec;  // set by finalizeEpoch (1e9 precision per-second rate)
    uint40   lastAccrual;          // timestamp of last index update
    // encrypted running aggregates (SCALED units, allowThis-only — never user-allowed)
    euint64  aggScaledSupply;
    euint64  aggScaledBorrow;
    // last revealed utilization (plaintext, from previous epoch)
    uint32   lastUtilizationBps;
}

struct Position {                   // per (market, user)
    euint64 scaledSupply;           // lender side
    euint64 collateral;             // raw base units (collateral earns no interest → unscaled)
    euint64 scaledDebt;
    euint64 lastError;              // encrypted error code of last op (§7)
    uint64  lastErrorNonce;         // plaintext, bump per op so UI knows which op the error belongs to
}

// epoch reveal state machine
enum EpochStatus { None, Pending, Finalized }
struct Epoch {
    euint64 supplySnap;             // snapshot handles frozen at closeEpoch
    euint64 borrowSnap;
    uint40  closedAt;
    EpochStatus status;
}
mapping(uint256 marketId => mapping(uint64 epochId => Epoch)) epochs;
mapping(uint256 marketId => uint64) currentEpochId;

// liquidation reveal state machine
enum PokeStatus { None, Pending, Done }
struct Poke {
    address user; uint8 marketId;
    ebool   unhealthy;              // the ONLY handle ever made publicly decryptable here
    euint64 debtSnap;               // scaled, frozen at poke (allowThis only)
    euint64 collSnap;
    uint64  priceE8Snap; uint64 borrowIndexSnap;
    uint40  pokedAt;
    PokeStatus status;
}
mapping(uint256 pokeId => Poke) pokes;  uint256 nextPokeId;
```

Rules:
- **Every** stored encrypted handle: `FHE.allowThis(h)` after every reassignment (each FHE op = new
  handle = new grant; 06 §4). Position handles additionally `FHE.allow(h, user)`. Aggregate/snapshot
  handles: `allowThis` ONLY.
- Never compare handles as bytes; never key mappings by handles (uniqueness caveat 06 §5).

---

## 4. User flows (all synchronous — the clamp idiom)

**Core insight:** no user operation waits for decryption. Solvency constraints are enforced by
*clamping* the requested amount to the encrypted maximum allowed, moving the clamped amount, and
recording an encrypted error flag. Both legs always execute (a failed op transfers encrypted 0) so
observers learn nothing from call patterns (06 §6). Async decryption exists ONLY in epochs (§5) and
liquidations (§6).

### 4.0 Common prologue for encrypted inputs
```solidity
euint64 amt = FHE.fromExternal(extAmt, inputProof);   // proof must be bound to (POOL address, user)!
amt = FHE.min(amt, FHE.asEuint64(MAX_AMOUNT));        // §2 cap
```
- Frontend encrypts against the **pool** address (03 §24: binding is (contract,user); wrong binding =
  proof failure). For any function accepting a raw `euint64` handle instead:
  `require(FHE.isSenderAllowed(h))` mandatory (inference attack, 06 §4).
- Note v0.12 behavior: malformed external handle silently becomes trivial-0 (06 §1) — harmless here
  (deposit/repay of 0 is a no-op; our flows never clear flags on zero).

### 4.1 accrue(marketId) — plaintext, runs first in every state-touching call
```
dt = block.timestamp − lastAccrual
borrowIndex  += borrowIndex  * borrowRateRayPerSec * dt / 1e9      // uint256 math, cap at 4e9
supplyIndex  += supplyIndex  * supplyRate(...)     * dt / 1e9      // supplyRate = borrowRate × lastUtilizationBps × (1−reserveBps)
lastAccrual = now
```
(Utilization is *last revealed* — rates lag one epoch by design; document in README.)

### 4.2 supply (lender) / depositCollateral (borrower)
1. UX precondition (frontend): `debtToken.setOperator(pool, until)` with **explicit until** (SDK
   default is only 1h — 03 §20); warn user operator = unlimited-amount, time-bounded.
2. `FHE.allowTransient(amt, address(token))` → `transferred = token.confidentialTransferFrom(user, address(this), amt)`
   (no-proof overload needs token allowed on the handle — 03 §24).
3. **Credit ONLY `transferred`** (clamp-to-zero semantics; never the requested amt — 06 §9 / 03 §3.3).
4. `scaledΔ = divDown(uint128(transferred) * 1e9, supplyIndex)` — via euint128 ops; add to
   `scaledSupply` and `aggScaledSupply`; re-grant ACLs.
5. `PROBE:` deployed mocks may revert `ERC7984ZeroBalance` for never-funded senders (03 §3.3,
   UNCERTAIN #14) — wrap step 2 in `try/catch` and surface a clean plaintext error (this leaks only
   "sender had no history", which the chain already shows).

### 4.3 borrow(marketId, extAmt, proof)
```
maxDebtValue   = collateral(e128) × priceCollE8 × lltvBps            // scalar muls
curDebtValue   = curDebt(e128)    × priceDebtE8 × 10000
headroomValue  = trySub-select(maxDebtValue − curDebtValue, else 0)
maxBorrow      = headroomValue / (priceDebtE8 × 10000)               // plaintext divisor
avail          = actual(aggSupply) − actual(aggBorrow)               // encrypted pool liquidity, trySub→0
granted        = FHE.min(amt, FHE.min(maxBorrow64, avail))
errFlag: INSUFFICIENT_COLLATERAL if granted < amt due to maxBorrow; INSUFFICIENT_LIQUIDITY if due to avail
                                                                     // encode via nested FHE.select into lastError
FHE.allowTransient(granted, token) → transferred = debtToken.confidentialTransfer(user, granted)   // ALWAYS call (both legs)
scaledDebt += divUp(uint128(transferred) × 1e9, borrowIndex);  aggScaledBorrow += same
```
Pricing: market0 debt=cUSDC → `priceDebtE8 = 1e8` (USDC≈USD assumption, document it); collateral cWETH
→ ETH/USD feed. Market1 mirrored. **Remember cWETH base unit = 1e-6 WETH:** value math must use
per-base-unit prices — precompute plaintext `pxCollPerUnit`, `pxDebtPerUnit` including the 1e6
decimals factor once per call, keep exponents documented in one comment block. Write unit tests that
pin exact expected numbers.

### 4.4 repay — deposit-mechanics into debt: pull `transferred`, `scaledDebt = trySub(...)→select(≥, sub, 0)`
(over-repay clamps to zero debt; excess is NOT pulled — clamp the pull amount first to
`FHE.min(amt, curDebtActual)` so we never take more than owed). Both aggregates updated.

### 4.5 withdrawCollateral — the synchronous trick
```
requiredColl = curDebtValue / (pxCollPerUnit × lltvBps ...)          // plaintext divisor chain
freeColl     = trySub(collateral − requiredColl) → select 0
granted      = FHE.min(amt, freeColl)
transfer granted to user (both legs); collateral −= granted; err flag if clamped
```
### 4.6 withdrawSupply (lender) — clamp vs own balance AND pool liquidity:
`granted = min(amt, ownActual, avail)`; same shape.

Every flow ends: re-`allowThis` + `allow(user)` on each mutated position handle; `allowThis` on
mutated aggregates; bump `lastErrorNonce`; emit a **uniform event** (same event, all ops’ clamp
outcomes hidden).

---

## 5. Epoch state machine (aggregate reveal → rates)

Anyone can call; keeper bot calls on a timer. `EPOCH_DURATION` constructor-configurable
(default 3600s; deploy demo with 300s for the video).

1. **`closeEpoch(marketId)`** — require `now ≥ lastClose + EPOCH_DURATION` and previous epoch not
   Pending. Snapshot: copy `aggScaledSupply/aggScaledBorrow` handles into `epochs[m][id]`,
   `FHE.makePubliclyDecryptable(supplySnap)` + `(borrowSnap)` (irrevocable — fine: aggregates only,
   pitfall #9), status=Pending, emit `EpochClosed(marketId, id, supplySnapHandle, borrowSnapHandle)`.
2. **Off-chain:** keeper `publicDecrypt([supplySnap, borrowSnap])` (that exact order) →
   `{clearValues, abiEncodedClearValues, decryptionProof}` (field is `clearValues`, NOT `values` —
   06 §7 typo trap).
3. **`finalizeEpoch(marketId, epochId, bytes cleartexts, bytes proof)`** — permissionless:
   - `require(status == Pending)` → the **replay guard** (checkSignatures has none — pitfall #2);
   - rebuild `bytes32[] handles = [FHE.toBytes32(supplySnap), FHE.toBytes32(borrowSnap)]` **from
     storage** in the same fixed order (never from calldata — pitfall #10);
   - `FHE.checkSignatures(handles, cleartexts, proof)`;
   - `(uint64 s, uint64 b) = abi.decode(cleartexts, (uint64, uint64))` (one 32-byte word per handle);
   - `accrue()`, compute `utilBps = b_actual*1e4 / s_actual` (guard s=0), run kinked IRM
     (base 200bps APR, slope1 to 80% kink, jump slope2; convert APR→per-second ray-lite),
     store `borrowRateRayPerSec`, `lastUtilizationBps`; status=Finalized.
   - **No caller-dependent effects** in finalize (frontrunnable/griefable — 06 §7).
   - Liveness: no deadlines anywhere; relayer downtime just delays rates (06 §7). Retries free.
   - Privacy note for README: consecutive epoch reveals differ by net flow; with few users this can
     bound one user's tx — mitigation: min-activity/min-interval batching, disclosed as known limit.

---

## 6. Liquidation — boolean-only reveal, pool-absorbed settlement

1. **`poke(marketId, user)`** — permissionless. `accrue()`. Freeze snapshots (debt, coll handles;
   price; borrowIndex). Compute cross-multiplied health (NO division on encrypted values):
   `unhealthy = FHE.lt( coll128 × pxCollPerUnit × lltvBps , scaledDebt128 × borrowIndex × pxDebtPerUnit × 10000 / 1e9 )`
   (fold every plaintext factor into ≤2 scalar coefficients first, in uint256, then apply — keep
   ≤2 wide muls per side). `FHE.makePubliclyDecryptable(unhealthy)` — **the only reveal, one bit**.
   Store Poke{...}, emit event with the ebool handle.
   - Anti-signaling: the keeper pokes **every open position each epoch** uniformly, so a poke
     carries no information. Cheap: ~4–6 FHE ops per position, separate txs.
2. **`finalizeLiquidation(pokeId, bytes cleartexts, bytes proof)`** — permissionless, once
   (`status==Pending` guard): rebuild `[FHE.toBytes32(pokes[id].unhealthy)]`, `checkSignatures`,
   `abi.decode(cleartexts, (bool))`.
   - `false` → status=Done. Nothing else (no leak beyond the bit).
   - `true` → **absorb internally, zero external calls** (both-legs trivially satisfied):
     `seize = min( debtActual × pxDebtPerUnit × (1e4+liqBonusBps) / (pxCollPerUnit × 1e4) , collateral )`
     (scalar ops; use **snapshot** price/index — the decrypted bit certifies the snapshot state);
     `collateral −= seize; scaledDebt = 0; aggScaledBorrow −= debtSnap` (trySub-clamped).
     Seized collateral accrues to a pool-owned encrypted `reserves[marketId]` bucket.
     Shortfall (if seize hit the coll clamp) is socialized to lenders implicitly — document.
   - Stale pokes: `require(now ≤ pokedAt + POKE_TTL)` (plaintext revert OK) — prevents finalizing
     against ancient prices; expired → status=Done, re-poke.
3. User debt/collateral values are never revealed — only the bit. This is the demo's signature claim.

---

## 7. Encrypted error idiom (uniform)

`lastError` per position: euint64 code (0=OK, 1=CLAMPED_COLLATERAL, 2=CLAMPED_LIQUIDITY,
3=CLAMPED_BALANCE...), built with nested `FHE.select`, `allowThis + allow(user)`, plaintext nonce
bumped per op, uniform `OpExecuted(user, marketId, nonce)` event. Frontend decrypts the flag after
each op and maps to human messages. (Verbatim pattern: 01 §7; rationale: no reverts on encrypted
conditions — 06 §6.)

---

## 8. HCU budget & measurement duty

Budgets (devnet numbers; Sepolia unpublished — **PROBE** read `HCULimit` getters at
`0xa10998783c8CF88D886Bc30307e631D6686F0A22`): 20M/tx global, 5M sequential depth (06 §3).
Design targets per tx: deposit ≤ ~1.5M, borrow/withdraw ≤ ~3M (they carry the mul-heavy clamp
chains), poke ≤ ~3M, finalize ≈ FHE-free (+checkSignatures gas — measure).
**Mandatory:** every mock test asserts `hre.fhevm.computeTransactionHCU(receipt)` under target;
CI fails on regression. If borrow blows depth: precompute/fold plaintext coefficients (uint256)
harder, or split the liquidity clamp into the supply-side path.

---

## 9. Phase-2 (ONLY after Day-3 checkpoint): LeverageRouter

Encrypted leverage intents: `openLeveraged(marketId, extDeposit, extLev /*euint8 1..4*/, proof)`.
Expand WITHOUT encrypted mul: `target = select(eq(lev,2), d2, select(eq(lev,3), d3, ...))` where
d2..d4 are scalar-mul precomputes. Intents queue; epoch-close nets long vs short notionals into one
aggregate handle → `makePubliclyDecryptable` → keeper swaps the NET on Uniswap V3 Sepolia
(router `PROBE` current address; pool seeded by us at oracle price) → `finalizeBatch` distributes via
FHE math. Fallback (ship regardless): frontend "guided loop" wizard chaining borrow → unshield
(two-step; reveals that leg — disclose honestly) → swap → shield → depositCollateral.

---

## 10. Day-0 PROBE list (resolve before dependent code)

1. `ERC7984ZeroBalance` on fresh accounts vs clamp (deposit path shape) — send a probe tx from an
   unfunded account against cUSDCMock.
2. `wrapper.decimals()`, `wrapper.rate()`, `underlying.decimals()` for both mocks (pin constants).
3. Underlying `mint(address,uint256)`: base-units vs whole tokens; cooldowns; the 1M cap semantics.
4. Registry `isValid` for both pairs.
5. Relayer keyless or `x-api-key` on testnet (docs contradict — 06 §12). Build the tiny backend
   proxy regardless; never ship a key client-side.
6. HCULimit getters (real caps).
7. `hre.fhevm.publicDecrypt` against `--network sepolia` (works like mock? — INDEX Q22); measure
   real public-decrypt latency (no SLA exists) with a throwaway contract **before** demo day.
8. Operator-based `unwrap` behavior (only if the guided-loop wizard automates unshield).
9. Chainlink feed address + heartbeat on Sepolia.

## 11. Testing plan (mock-first, template-style)

- Suites guard `fhevm.isMock` (skip on Sepolia) + one thin Sepolia smoke suite (template pattern,
  generous timeouts).
- Full local E2E: deposit→borrow→epoch close→`hre.fhevm.publicDecrypt`→finalizeEpoch→rates move→
  poke→finalize(true/false)→absorb. Negative tests: replay finalize (must revert on guard),
  reordered handles (KMSInvalidSigner), forged proof, wrong-epoch cleartexts, over-borrow clamps to
  encrypted 0 + error flag, over-withdraw clamped, repay-over-debt clamps, zero-supply utilization.
- Decrypt in tests via `fhevm.userDecryptEuint(FhevmType.euint64, handle, poolAddr, signer)`.
- HCU assertions per §8. Coverage in mock only; tag `[skip-on-coverage]` where snapshots break.

## 12. Frontend (Next.js + @zama-fhe/sdk v3)

- `<QueryClientProvider>` ABOVE `<ZamaProvider>`; client-only ("use client"/dynamic import — SSR
  crashes); alias viem's `sepolia` vs sdk `chains` export collision (06 §12).
- One `grantPermit` covering [pool, cUSDC, cWETH] (≤10 contracts/permit); gate all reads on
  `useHasPermit`; `useDecryptValues` stays `enabled: false` until explicit user click ("view my
  position") — never decrypt-on-render.
- Low-level hooks (`useEncrypt` bound to POOL address, `useDecryptValues`, `useDecryptPublicValues`)
  — the v3 token API is for wrapped tokens, not our pool (06 §12).
- Shield/unshield UX via SDK `wrappedToken.shield/unshield` (unshield is two-step; show the
  `onFinalizing` states). `setOperator` with explicit expiry picker (default 24h, max 7d).
- Screens: Markets (public: rates, utilization, epoch countdown) · My Position (decrypt-on-click:
  supplied, collateral, debt, health bar, error toasts from `lastError`) · Borrow/Repay/Withdraw ·
  Guided Loop wizard · Keeper status page (epoch/poke pipeline — great for the video).
- Keeper bot: small Node script (node() runtime; `sdk.terminate()` on exit — hang trap 06 §12):
  timer → closeEpoch → publicDecrypt (backoff on 429) → finalizeEpoch; each epoch also poke-all →
  finalize each. Runs on a $5 VPS or GitHub Actions cron.

## 13. Build order (checkpoints, not estimates)

- **CP1:** repo scaffold from template; PROBE list resolved; OracleAdapter + IRM + Market/Position
  storage; deposit/supply with clamp accounting; mock tests green.
- **CP2:** borrow/repay/withdraw clamp chains + error idiom; HCU assertions; epoch machine E2E in
  mock; deploy to Sepolia; first real publicDecrypt measured.
- **CP3:** liquidation machine E2E; keeper bot; frontend core (markets, position, op forms).
- **CP4:** guided-loop wizard; polish; seed demo data (3 wallets, both markets); Sepolia dress
  rehearsal of the FULL demo path; only then attempt Phase-2 LeverageRouter.
- **CP5:** video + X thread + README (threat model section: what's hidden vs public — reuse §1
  table + boundary-leak framing).

## 14. Non-goals (write these in the README — scope discipline)

No governance, no flash loans, no multi-collateral per position, no partial liquidations, no
interest-bearing collateral, no mainnet deployment, no bad-debt auctions (pool absorption only),
no dynamic LLTV. Roadmap slide only.
