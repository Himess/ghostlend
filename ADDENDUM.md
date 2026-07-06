# GhostLend — ARCHITECTURE ADDENDUM v1.1
## Probe-locked constants + Market 2 (Confidential Vault stack) + GhostGate netting + Swap lane

> Companion to `ARCHITECTURE.md` v1.0 — read that first; this file amends it with the probe-locked
> constants and the Market 2 (Confidential Vault stack) + GhostGate design.

---

## A. Probe-forced amendments to v1.0 (apply before/while building the core)

1. **ZeroBalance guard (P4).** Deployed wrappers REVERT `ERC7984ZeroBalance` (selector `0x5ff91cdc`)
   when `from` never held tokens — they do NOT clamp like OZ v0.5.1. Rule: before ANY
   `confidentialTransferFrom` where `from` might be unfunded (repay on an empty user, batcher `join`,
   operator pulls), pre-check `FHE.isInitialized`-style: read `confidentialBalanceOf(from)` and skip/
   revert-clean if the handle is zero-bytes32; wrap the pull in `try/catch` as backstop with a clean
   custom error. Ordinary deposits are unaffected. **Liquidation is unaffected by design** — our absorb
   path is internal accounting only (no token transfer from the user); state this in code comments.
2. **Locked constants (P1/P3/P9):** cUSDC rate 1 (1 unit = 1e-6 USDC... i.e. 6-dec base unit 1:1);
   cWETH rate 1e12 (1 conf unit = 1e-6 WETH = µWETH). Faucet recipe for the frontend "Get Test Tokens"
   tab: `underlying.mint(user, baseUnits ≤ 1e6·10^dec)` → `approve(wrapper)` → `wrap(user, amount)` —
   public, no cooldown, repeatable. Chainlink ETH/USD `0x694A…5306`, 8 decimals, staleness guard **2 h**
   (heartbeat ≈1 h).
3. **Timing/gas budgets (P5/P6/P8):** relayer publicDecrypt ≈ **3 s** (measured 2.84 s) — epoch and
   liquidation finalize can follow their trigger within seconds; UI can show a "decrypting…" spinner
   rather than a long-wait state. Reference costs: deposit-pull ≈ 575k gas / 748k HCU global / 369k
   depth; finalize ≈ 374k gas. Keep the §8 rule (never loop positions homomorphically); treat caps as
   unknown-but-large (deployed HCULimit v0.3.0 unreadable), re-measure heaviest txs before demo.
4. **Relayer keyless on Sepolia (P7)** — build keyless; keep the mainnet-proxy note in README only.
5. **Registry resolution (P2):** resolve wrappers at deploy via
   `getConfidentialTokenAddress(erc20) → (bool isValid, address)` and store; hard-require `isValid`.
6. Security hygiene: both probe wallets' private keys appeared in chat — **testnet-only forever**;
   never reuse for anything of value. Keep `probe/secrets.json` git-ignored (already done).

---

## B. Market 2 — the Confidential Vault stack (Zama's REAL primitives on Sepolia)

Zama's engineering post ("Private Deposits into Public DeFi") reveals their vault stack =
**OpenZeppelin `BatcherConfidential`** (a generic confidential batcher: join → quit → dispatch →
callback → claim, with `minBatchAge`) + a **share wrapper** (`ERC7984ERC20Wrapper` over the vault's
plaintext share token) + a thin vault route. We deploy the SAME stack on Sepolia:

**B.0 — FIRST TASK: read the source.** Check
`_repos/openzeppelin-confidential-contracts/contracts/finance/` for `BatcherConfidential.sol` in the
pinned v0.5.1 clone. If absent (blog links master), vendor the contract(s) from OZ master into
`contracts/vendor/` with a pin-note comment (commit hash + date) — do NOT hand-write a lookalike.
Adapt everything below to the ACTUAL API found in source (join/quit/dispatch/callback/claim names,
how it integrates the wrapper's two-step async unwrap, hook points). The blog's flow description is
spec-level only; the source is authoritative. Report the real API surface back in a short
`BATCHER-NOTES.md` before wiring.

**B.1 — MockYieldVault (the only mock, honestly labeled).** A minimal ERC-4626 over the mock USDC
underlying. Yield simulation: keeper periodically `underlying.mint(vault, drip)` (public mint = real
ERC-4626 accounting, simulated income). `convertToAssets` therefore rises over time — this is Market
2's plaintext share-price oracle (no Chainlink needed; USDC≈USD assumption documented). README line:
"stands in for Steakhouse Prime (mainnet-only); every other contract in this stack is the exact
production primitive."

**B.2 — Confidential share token.** Real `ERC7984ERC20Wrapper` over MockYieldVault's share ERC-20 →
`cSHARE` (our csteakcUSDC analogue).

**B.3 — Batcher pair.** Deposit batcher (in cUSDC → route: unwrap → `vault.deposit` → wrap shares →
per-batch public `exchangeRate` → encrypted claims) and withdrawal batcher (in cSHARE → route: unwrap
→ `vault.redeem` → wrap cUSDC back). Config `minBatchAge = 60s` for the demo; UI shows the
"Next batch is dispatched in ~mm:ss" counter with the note **"testnet: 60 s · mainnet vault: ~12 h"**.
Keeper triggers dispatch + submits the decryption callback (reuse the P6-validated finalize pattern).

**B.4 — Market 2 in GhostLendPool.** `collateralToken = cSHARE`, `debtToken = cUSDC`,
`priceSource = MockYieldVault.convertToAssets(1e6)` (USDC per share, 6-dec), `lltvBps = 9000`
(collateral is yield-accruing, no market-price risk on the mock — justify in README), same encrypted
accounting/clamp/health/liquidation engine as v1.0. Liquidation health uses the share price exactly
like Chainlink in Market 0 (plaintext coefficient).

**B.5 — Closed-form confidential leverage (`openLeveragedYield`) — the flagship demo.** No swap, no
loop iterations, fully encrypted, single tx:
- Inputs: `extDeposit` (euint64) + `extLev` (euint8, 1..4), proof bound to pool.
- Expansion WITHOUT encrypted mul: precompute `d2=2·dep, d3=3·dep, d4=4·dep` via scalar muls, then
  `target = select(eq(lev,2), d2, select(eq(lev,3), d3, select(eq(lev,4), d4, dep)))`.
- Accounting (all internal): `collateralShares += (target / sharePrice)` from the pool's **cSHARE
  treasury**; `debt += (target − dep)` against cUSDC market liquidity (clamped by treasury AND
  liquidity AND LLTV headroom via FHE.min chain, error flags as in §7).
- **Treasury model:** the pool holds a cSHARE inventory. User ops are instant/encrypted; the treasury
  is replenished by the keeper running the pool's net cUSDC through the deposit batcher each window
  ("batched rebalance" — the boundary is crossed only by the pool's NET, never by users). Seed the
  treasury at deploy by batching deployer funds. This is the netting story applied to leverage.
- Deleverage/close mirrors it in reverse (shares burned at sharePrice, debt repaid, remainder to user).
- Carry math shown in UI: `lev × vaultAPY − (lev−1) × borrowAPR`.

---

## C. GhostGate — netting extension (Zama's published v2 direction, implemented)

Goal: within one batch window, deposit intents (cUSDC) and withdrawal intents (cSHARE) net against
each other; **only the NET flow crosses the confidential/plaintext boundary.** Zama's blog names
exactly this ("internal netting", "single confidential gateway") as their next step — cite it in
README/video.

Design (adapt to real Batcher API per B.0; extend via inheritance/hooks if possible, else a
standalone `GhostGate` reusing the base's idioms — preserve the "audited base + our extension"
framing):
- Window accumulates two encrypted aggregates: `D` (cUSDC in) and `Wv` (withdrawal shares valued in
  cUSDC at the pinned rate: scalar mul by plaintext sharePrice pinned at window open).
- At dispatch compute `dir = FHE.ge(D, Wv)`; `net = FHE.select(dir, D−Wv, Wv−D)` (unsigned-safe).
  `makePubliclyDecryptable(dir)` + `(net)` — the ONLY reveals; individual intents stay encrypted.
- Callback: execute only the net leg on the public vault (deposit if dir, redeem if !dir). The matched
  portion settles internally at the pinned rate: withdrawers are paid from depositors' incoming cUSDC;
  depositors are credited shares from withdrawers' incoming cSHARE. Per-user claims computed encrypted
  exactly as the base does (rate × encrypted contribution).
- Replay/ordering/failure rules identical to §5/§6 of v1.0 (status enum, storage-rebuilt handles,
  try/catch route with full-refund cancel path, no deadlines).
- Rounding: pin rate once per window; round against the user by ≤1 unit; document.
- Threat-model README paragraph: anonymity set = independent participants per window; **N−1 attack**
  acknowledged (attacker fills the window to isolate a victim); mitigations = minBatchAge + activity
  thresholds (+ optional protocol-injected entropy) — mirror Zama's own honest wording.
- **Demo scene (build into the seed script):** 3 wallets in one window — 2 deposits + 1 withdrawal →
  Etherscan shows ONE net unwrap crossing the boundary; each wallet decrypts its own claim. This is
  the video's money shot.

---

## D. Lane B — Swap lane on the same gateway (design final; implement after C is green)

Same gateway pattern, second lane: window aggregates `A` (cUSDC→cWETH intents) and `Bv`
(cWETH→cUSDC intents valued in cUSDC via Chainlink pinned at window open). Net + direction revealed;
matched portion fills internally at Chainlink mid **+ 30 bps spread** (fee accrues to reserves —
prevents the zero-fee oracle-arb drain); only the net leg goes out: unwrap → **real Uniswap V3
Sepolia** swap with slippage bound (revert route if execution deviates > X% from Chainlink; cancel →
full encrypted refunds) → wrap back → claims at realized blended rate.

Prereq mini-probe (30 min, before implementing): verify current official Uniswap V3
factory/router/position-manager addresses on Sepolia; create the mockUSDC/mockWETH 0.3% pool if
absent; seed liquidity at the Chainlink price from minted funds (document: "venue = real Uniswap
contracts; liquidity seeded by us — Zama's mocks have no organic pool").

This lane replaces the old §9 "batched leverage engine" entirely; the guided manual loop stays as an
immediate fallback path in the UI (with the honest "this step is public" banner, Zama-app style).

---

## E. Updated build order (checkpoints; the ladder is a sequence, not a scope cut)

- **CP1** Core engine (Markets 0), probe amendments applied, mock tests + HCU assertions green.
- **CP2** Epoch + liquidation machines E2E (mock + one real-Sepolia run), Sepolia deploy, keeper bot.
- **CP3** Market 2 stack: MockYieldVault + share wrapper + Batcher pair (vanilla) + treasury +
  `openLeveragedYield` + batch-timer UX. B.0 source-reading FIRST.
- **CP4** GhostGate netting (C) + the 3-wallet demo scene + threat-model README.
- **CP5** Lane B swap lane (D) after its mini-probe.
- **CP6** Frontend polish (Zama design language, faucet tab, public-step banners, position decrypt),
  seed script, video, X thread. Dress-rehearse the FULL demo path on Sepolia before recording.

Non-goals unchanged (v1.0 §14). Naming: pool = GhostLend, gateway = GhostGate — final names may be
revisited at CP6, keep them as contract names for now.
