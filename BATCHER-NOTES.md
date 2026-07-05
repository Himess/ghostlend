# BATCHER-NOTES — OpenZeppelin `BatcherConfidential` (v0.5.1) source analysis

**Source:** `node_modules/@openzeppelin/confidential-contracts/finance/BatcherConfidential.sol` (v0.5.1, 468 lines,
self-contained — no separate interface). Present in the pinned npm package, so **no vendoring needed** (ADDENDUM B.0).
`abstract contract BatcherConfidential is ReentrancyGuardTransient, IERC7984Receiver`. pragma ^0.8.27.

> **STOP deliverable for the GhostGate extend-vs-standalone decision.** Read §5 (contradictions) and §6
> (implications) before deciding — they change the picture materially.

---

## 1. What it actually is (one line)
A **unidirectional** batching primitive: users deposit `fromToken` (an ERC7984 wrapper), a permissionless
keeper dispatches the whole batch (async-unwraps the total `fromToken`, runs a developer `_executeRoute`
swap into `toToken`'s underlying, re-wraps), and users then `claim` `toToken` pro-rata at one batch
exchange rate. **It routes the batch TOTAL through a public venue — it does NOT net two opposing
directions against each other.** (Critical for GhostGate — see §5/§6.)

## 2. (i) Full external/public API surface

**Constructor** `constructor(IERC7984ERC20Wrapper fromToken_, IERC7984ERC20Wrapper toToken_)`
- ERC165-checks both are `IERC7984ERC20Wrapper`; requires `fromToken.underlying() != toToken.underlying()`.
- `forceApprove`s each underlying to its wrapper for `type(uint256).max` (so re-wrap works).

**Deposit / "join"** — there is **no `join()` function**. Users deposit by calling
`fromToken.confidentialTransferAndCall(batcher, amount, data)`, which invokes:
- `onConfidentialTransferReceived(address operator, address from, euint64 amount, bytes) external returns (ebool)`
  — `require(msg.sender == address(fromToken))`, then internal `_join(from, amount)`; returns an `ebool`
  success handle (allowTransient to the token). Emits `Joined(batchId, account, amount)`.
- `_join` uses `FHESafeMath.tryIncrease` on `totalDeposits`, `FHE.select` for the joined amount, updates
  `deposits[to]` and `totalDeposits`, grants ACLs.

**`quit(uint256 batchId) public virtual nonReentrant returns (euint64)`** — refund the caller's ENTIRE
deposit. Allowed only in `Pending | Canceled`. `confidentialTransfer`s the deposit back, zeroes it. Emits `Quit`.

**`dispatchBatch() public virtual`** — **permissionless, no time gate** (see §4). Reads current batch's
`totalDeposits`, calls `fromToken.unwrap(this, this, externalEuint64.wrap(handle), "")` (async unwrap of
the whole total), stores `unwrapRequestId`, increments `currentBatchId`. State → `Dispatched`. Emits
`BatchDispatched`.

**`dispatchBatchCallback(uint256 batchId, uint64 unwrapAmountCleartext, bytes decryptionProof) public virtual nonReentrant`**
— **permissionless.** Finalizes the async unwrap then routes (see §3). On success sets the exchange rate
(→ `Finalized`, emit `BatchFinalized`) or cancels (→ `Canceled`, emit `BatchCanceled`); `Partial` outcome
means "call me again." **Repeatable for multi-step routes.**

**`claim(uint256 batchId, address account) public virtual nonReentrant returns (euint64)`** — permissionless
(anyone can claim FOR `account`; `toToken` always sent to `account`, enabling relayers). Allowed only in
`Finalized`. `amountToSend = deposit × exchangeRate / 10^exchangeRateDecimals` (euint128 intermediate,
**rounded down**). Zeroes the deposit on transfer success. Emits `Claimed`.

**Views:** `fromToken()`, `toToken()`, `currentBatchId()`, `unwrapRequestId(batchId)`,
`totalDeposits(batchId)→euint64`, `deposits(batchId,account)→euint64`, `exchangeRate(batchId)→uint64`,
`exchangeRateDecimals()→uint8` (pure, default **6**), `batchState(batchId)→BatchState`, `routeDescription()→string` (pure, **must override**).

**Enums:** `BatchState {Pending, Dispatched, Finalized, Canceled}` · `ExecuteOutcome {Complete, Partial, Cancel}`.
**Errors:** `BatchNonexistent`, `ZeroDeposits`, `BatchUnexpectedState(batchId,current,expectedStatesBitmap)`,
`InvalidExchangeRate`, `Unauthorized`, `InvalidWrapperToken`, `DuplicateUnderlyingTokens`,
`IntermediateStepToTokenBalanceChanged`.
**Events:** `BatchDispatched`, `BatchCanceled`, `BatchFinalized`, `Joined`, `Claimed`, `Quit`.

## 3. (ii) How it integrates the wrapper's two-step async unwrap

Only the **`fromToken` UNWRAP is async** (two-step); the **`toToken` re-WRAP is synchronous** (one call).

1. `dispatchBatch()` → `unwrapRequestId = fromToken.unwrap(this, this, externalEuint64.wrap(euint64.unwrap(totalDeposits)), "")`.
   Note: casts the confidential total handle to `externalEuint64` with an **empty proof** (the batcher owns
   the handle, so the no-proof path applies). `unwrapRequestId` (bytes32) is returned; on the OZ wrapper it
   equals the burned-amount ciphertext handle.
2. **Off-chain (keeper):** `publicDecrypt(fromToken.unwrapAmount(unwrapRequestId))` (a euint64 handle) →
   `(unwrapAmountCleartext, decryptionProof)`. **This is exactly the P6 pull-model pattern**, applied to the
   wrapper's unwrap rather than our own handle.
3. `dispatchBatchCallback(batchId, unwrapAmountCleartext, decryptionProof)`:
   `try fromToken.finalizeUnwrap(unwrapRequestId, unwrapAmountCleartext, decryptionProof)` — on success the
   underlying `fromToken` is released to the batcher; on revert (already finalized by someone) it **falls
   back** to `FHE.checkSignatures([fromToken.unwrapAmount(id)], abi.encode(unwrapAmountCleartext), proof)` to
   validate the cleartext. Then `_executeRoute(batchId, unwrapAmountCleartext)` (underlying received =
   `unwrapAmountCleartext × fromToken.rate()`).
4. On `Complete`: `toToken.wrap(this, swappedUnderlying)` (**synchronous**), computes `exchangeRate`.
   On `Cancel`: `fromToken.wrap(this, unwrapAmountCleartext × fromToken.rate())` re-wraps so users can `quit`.

Wrapper surface used (from `IERC7984ERC20Wrapper`): `unwrap(from,to,externalEuint64,bytes)→bytes32`,
`finalizeUnwrap(bytes32,uint64,bytes)`, `unwrapAmount(bytes32)→euint64`, `wrap(address,uint256)→euint64`,
`rate()→uint256`, `underlying()→address`; events `UnwrapRequested`, `UnwrapFinalized(...,uint64 cleartextAmount)`.

## 4. (iv) minBatchAge / config surface

**Minimal.** Config = the constructor (fromToken, toToken) + two overridable virtuals:
`exchangeRateDecimals()` (default 6) and `routeDescription()` (must implement). Plus the mandatory
`_executeRoute(batchId, amount)→ExecuteOutcome`.

**There is NO `minBatchAge`, no deposit window, no time gate, and no keeper config in the base contract.**
`dispatchBatch()` can be called the instant a batch has any deposits. To get ADDENDUM B.3's
"`minBatchAge = 60s`" we must **override `dispatchBatch()`** to record each batch's open timestamp and
`require(block.timestamp >= openedAt + minBatchAge)`. (This is an extension we add, not base config.)

## 5. (v) Contradictions with the blog's description
1. **`minBatchAge` is NOT in the base contract** — the blog implies it's built in; it isn't. Must be added by override. (Biggest one.)
2. **"join" is not a function** — deposits arrive via `confidentialTransferAndCall` → `onConfidentialTransferReceived`. The blog's "join" = this callback + internal `_join`.
3. **"dispatch → callback" is two functions**: `dispatchBatch()` (starts async unwrap) then `dispatchBatchCallback()` (finalizes unwrap + routes, repeatable).
4. **The batcher is UNIDIRECTIONAL** (one `fromToken`→`toToken` per instance) and routes the batch **TOTAL** through a venue. It does **not** internally net opposing deposit vs withdrawal intents. A deposit+withdrawal pair needs **two** instances (ADDENDUM B.3 "batcher pair" is right).
5. **No confidentiality by default** — the contract's own NOTE says so; deposit *amounts* are encrypted handles, but participation/timing/`dispatch`/`claim` are public unless the developer restricts `quit`/`dispatch`.

## 6. Implications for GhostGate (the extend-vs-standalone decision)

- **What we get for free by extending:** the join→quit→dispatch→callback→claim state machine, the
  **async-unwrap finalize wiring** (P6 pattern, incl. the try/finalizeUnwrap-catch/checkSignatures fallback),
  per-user encrypted deposit accounting, pro-rata claim math, cancel/refund path, ERC165/dup-underlying guards.
- **What GhostGate (ADDENDUM C) needs that the base does NOT provide:** GhostGate nets **two opposing
  aggregates** (`D` = cUSDC-in vs `Wv` = withdrawal-shares-valued-in-cUSDC) within a window and crosses the
  boundary only with the **NET**, settling the matched portion internally at a pinned rate. `BatcherConfidential`
  has a **single** `totalDeposits` and routes it whole. So GhostGate's netting is **not** an `_executeRoute`
  detail — it needs a **second deposit aggregate + a direction/net computation + `makePubliclyDecryptable(dir)`
  and `(net)`** at dispatch, plus internal matched-settlement in `claim`.
- **Therefore the realistic options are:**
  - **(A) Extend** `BatcherConfidential`: override `dispatchBatch` (add `minBatchAge` + compute
    `dir/net`, reveal only those), keep `onConfidentialTransferReceived`/`_join` for the deposit leg, add a
    parallel withdrawal-intent path (a second `_join`-like accumulator — but the base's single `_batches`
    struct/`onConfidentialTransferReceived` is hard-wired to ONE `fromToken`, so a second leg fights the
    base). Feasible but the base's single-token assumptions push back.
  - **(B) Standalone `GhostGate`** that **reuses the idioms** (state enum, storage-rebuilt handle lists,
    the finalizeUnwrap/checkSignatures pattern copied from `dispatchBatchCallback`, pro-rata claim math) but
    models **two** aggregates natively. Cleaner fit for the two-direction netting; preserves the
    "audited base's proven patterns, our extension" framing without contorting the single-token base.

**My read (for your decision, not acted on):** the **Market 2 deposit/withdrawal batcher pair (B.3)** should
**extend `BatcherConfidential` directly** (it's exactly one-directional per instance — perfect fit). **GhostGate
netting (C)** is a poorer fit for extension because the base is single-`fromToken`; a **standalone GhostGate
reusing the base's idioms** is likely cleaner. But this is the decision you reserved — **stopping here for your
ruling before any wiring.**

---
*Also noted for later: `exchangeRateDecimals` default 6 matches our 6-dec token model; claim rounds down (dust
accrues in the batcher); if `toToken`/`fromToken` hit the uint64 supply cap, batches can brick (capacity must be
watched); `dispatchBatchCallback` is permissionless and its `_executeRoute` swap is the public boundary crossing.*
