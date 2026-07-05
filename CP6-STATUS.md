# CP6 — Frontend integration — Status Report

**Date:** 2026-07-05 · **Checkpoint:** CP6 (frontend) · **Result:** full production deploy + consolidated
addresses + live keeper; the 8-screen design shell ported to a Next.js app wired to the live Sepolia
contracts via `@zama-fhe/sdk` v3; units bug fixed; guided cUSDC→cWETH wizard added; README design note added.
_(Live click-through + screenshot shot-list: section 6.)_

## 1. Production deploy + ADDRESSES.md + keeper (task #1)
- **Full stack redeployed to Sepolia** (`scripts/deploy-all.ts`, `npm run deploy:all`): the core pool had
  only M0/M1 and markets are constructor-only, so a fresh pool with **M0/M1/M2** was deployed plus the whole
  Market 2 stack + GhostGate, reusing the live cUSDC/cWETH wrappers + Chainlink oracle.
  - GhostLendPool `0x854E0b51e5b7F13386fFea353CF6275C4EE16B47` (3 markets)
  - GhostGate `0xE90c95e8d3D82D3Ba5d309a3a9BE7575478dCaBC` · MockYieldVault `0x7B560a…65547` ·
    csteakcUSDC `0x099596…14aE` · DepositBatcher `0x0f425d…5567` · WithdrawBatcher `0x541979…c5D3`
- **`deployments/ADDRESSES.md`** consolidates every production contract (Etherscan links + constructor args)
  + `deployments/sepolia.json` (machine-readable) + `deployments/verify-pool.js` (complex-args module).
- **Keeper running** (`npm run keeper`, `KEEPER_LOOP=1`) against the final deploy for the whole session —
  drives epochs, liquidation pokes, and GhostGate windows on a 45s loop. `scripts/drip-yield.ts` supplies
  demo vault yield between windows (keeper discipline: never drip while a GhostGate window is open).
- **Etherscan verification:** `npm run verify:all` (`scripts/verify-all.ts`) verifies all 7 contracts in one
  shot — **pending an `ETHERSCAN_API_KEY`** (the one input I can't self-provide). Commands are ready in
  ADDRESSES.md. <!-- VERIFY_RESULT -->

## 2. Frontend port (task #2)
Next.js 16 (App Router) + wagmi 2 + viem 2 + `@tanstack/react-query` 5 + **`@zama-fhe/sdk` v3** +
`@zama-fhe/react-sdk` v3, in `frontend/` (Next 16 — see deviation #1). The design's `MOCK` block (the single source of placeholder data)
was replaced with real contract reads/writes; layout/copy/colors are carried verbatim via a `css()` helper
that parses the design's exact inline-style strings.

**Traps honored (all):**
- Provider order `WagmiProvider → QueryClientProvider → ZamaProvider` (QueryClientProvider ABOVE ZamaProvider).
- **viem sepolia alias collision** — wagmi/viem `sepolia` and `@zama-fhe/sdk/chains` `sepolia` imported under
  distinct aliases; the Zama config uses the FheChain preset, wagmi uses viem's.
- Client-only render (mounted gate; every screen `"use client"`).
- **ONE `grantPermit`** over `[pool, cUSDC, cWETH, csteakcUSDC, gate, depositBatcher, withdrawBatcher]` — one
  EIP-712 signature, reused by every decrypt.
- **Decrypt strictly on-click** — My Position's Decrypt → `useGrantPermit` (once) → `useDecryptValues`; the
  ~3s spinner is the real relayer/KMS latency (copy kept: "KMS decrypting… ~3s").
- **setOperator with explicit expiry** — the 2-step Approve-operator (1h/24h/7d) → Confirm flow on every pool op.
- **Faucet mint recipe (P3)** — mint underlying (public) → approve → shield (wrap).
- **Batch countdown** from `dispatchableIn()` on the batchers/gate.
- **Public-step banner ONLY on boundary crossings** — the Faucet underlying mint (explicit amber "PUBLIC STEP")
  and the vault batch dispatch; confidential ops carry the lock badge instead.

**Screens (8) + shell:** Sidebar/nav, Dashboard, Markets (list + detail + 5-action panel), My Position,
Leverage, Vault·Earn, GhostGate, Faucet, Status. Encryption/writes use `useEncrypt` (→ `externalEuint64` +
proof) + `useConfidentialSetOperator` + wagmi `useWriteContract`; balances via `useConfidentialBalance`;
reads via wagmi `useReadContract(s)` over the real ABIs. `openLeveragedYield` correctly encrypts BOTH the
deposit (euint64) and the leverage (euint8, ratio confidential) under one proof.

## 3. Market-detail units fix (task #3)
The mock computed a nonsensical Debt/Collateral ratio (48000%/0%) because it multiplied raw token amounts
across markets with mismatched token prices. Fixed in `Markets.tsx` + `lib/hooks.ts`: **both legs are valued
in USD** via `tokenUsdPerUnit()` — cUSDC = $1, cWETH = live Chainlink ETH/USD (`oracle.priceE8`), csteakcUSDC
= vault share price — so `dcAfter = debtUsd / collUsd` is a sane percentage compared against the market's LLTV
mark. Health = `dcAfter < LLTV`.

## 4. Guided cUSDC→cWETH wizard (task #4)
`components/Wizard.tsx` — a 2-step modal: **Market 2** (deposit csteakcUSDC → borrow cUSDC) then **Market 1**
(deposit that cUSDC → borrow cWETH). Every step is an encrypted pool op (setOperator + encrypt + depositCollateral
+ borrow); **no swap, no public leg** — each step is labelled "Encrypted · no public swap leg". Surfaced from
the Vault ("Get ETH exposure against your vault position →"); also surfaced from the cWETH/cUSDC market.

## 5. README design decisions (task #5)
Added the **three-pillar** summary (native lending / vault-collateralized credit + swap-free leverage /
confidential cUSDC→cWETH borrow with zero leak) and the **why Market 2 is same-asset** note (USD-denominated
both legs ⇒ no cross-asset price risk ⇒ 90% LLTV ⇒ swap-free leverage loop; cross-asset ETH need served by the
Market 1 composition). Plus the GhostGate pin-only note.

## 6. Live click-through + screenshot shot-list (task #6)
The app was run (`cd frontend && npm run dev`) and clicked through in-browser against the **live Sepolia**
deploy. Every screen renders the design shell faithfully and reads real on-chain data:

| Screen | Verified live | Notes |
|---|---|---|
| **Dashboard** | ✅ | 3 live markets · **GhostGate window #63 · Pending** (read from the live gate — the keeper had driven 63 windows) · epoch counter · vault total |
| **Markets** | ✅ | all 3 markets (cWETH/cUSDC 80%, cUSDC/cWETH 80%, csteakcUSDC/cUSDC 90%); Borrow APR **2.00%** = the IRM base rate at 0% utilization (real `marketInfo` read + IRM curve) |
| **GhostGate** | ✅ | two-lane 2.5M vs 0.5M + 80% callout; **Recent windows #52/#51/#50 read from the live gate**; current-window pin/countdown/status live |
| **Faucet** | ✅ | the amber **PUBLIC STEP** banner is present on the mint (boundary-crossing) step; mint → shield flow |
| **Leverage** | ✅ | slider 3.0×; preview position 30k / debt 20k / **D-C 66.7%** born-healthy vs 90% LLTV; carry math (Net carry +4.2% APY) |
| **Vault · Earn** | ✅ | batch banner + lifecycle chips + BatcherConfidential lock badge; wizard entry button |
| **Wizard (task #4)** | ✅ | modal "Deposit cUSDC → borrow cWETH" — STEP 1 Market 2 (csteakcUSDC→cUSDC) + STEP 2 Market 1 (cUSDC→cWETH), **"Encrypted · no public swap leg"** |
| **My Position / Status** | ✅ render | render + wired (decrypt-on-click / keeper-ops viz) |

**Wallet-signed writes** (supply/borrow/leverage/shield/vault-deposit/wizard, and decrypt) require a funded
MetaMask in the browser; they are wired per the SDK (`useEncrypt` + `useConfidentialSetOperator` + wagmi
`useWriteContract`, and `useGrantPermit`+`useDecryptValues`) and type-check, but cannot be exercised headlessly
in the automation harness. The live READ path (all rates, GhostGate windows, vault, positions handles) is
confirmed working in-browser.

### Screenshot shot-list for the video
1. **Dashboard** — "3 live markets · GhostGate Pending · keeper live" (opens on the confidentiality pitch).
2. **Faucet** — mint 1,000 USDC (point at the amber **PUBLIC STEP** banner), then Shield → cUSDC (now private).
3. **Markets → cUSDC/cWETH detail → Borrow** — type collateral + borrow; show the **Debt/Collateral % vs LLTV**
   bar computing a *sane* ratio (the units fix); Approve operator (expiry) → Confirm.
4. **My Position → Decrypt** — the ~3s **KMS decrypting…** spinner, then values blur-in (only you can decrypt).
5. **Leverage** — drag the slider 1×→4×, watch position/debt/**D-C%** + **Net carry** update; "ratio encrypted".
6. **Vault** — Confirm confidential deposit; show the batch countdown + Open→Dispatched→Finalized lifecycle.
7. **GhostGate** — press **Play netting**: the three intents merge into one **0.5M net**, the **80%** stat animates;
   then the live **Current window** + **Recent windows** table.
8. **Wizard** — from Vault, "Get ETH exposure against your vault position" → the 2-step **no-swap** cUSDC→cWETH flow.
9. **Status** — the keeper heartbeat + per-market epoch pipeline + wrapper-capacity bars.

## 7. Deviations flagged (none silent)
1. **Next.js 15 → 16 bump (required to render).** On this Windows + Chrome environment, Next **15.1.6** SSR'd
   correctly (HTTP 200) but **failed to hydrate on the client** with `invariant expected layout router to be
   mounted` — reproduced with a *trivial* server page (no providers, no app code), so it was a Next runtime
   bug, not a defect in the port (proven by isolation). Clearing `.next`, service-worker/cache, and provider
   changes did not help; **upgrading to `next@16.2.10` fixed it** and the full app renders. React stays 19.0.0.
2. **Fresh production pool redeploy.** Markets are constructor-only, so serving Market 2 in the UI required a
   new pool (M0/M1/M2) — documented in ADDRESSES.md; the legacy M0/M1 core pool stays live for reference.
3. **Registry validation OFF** on the production pool (csteakcUSDC isn't registry-registered) — see ADDRESSES.md.
4. **Zama react-sdk wagmi adapter bypassed.** `@zama-fhe/react-sdk/wagmi` imports `useConnection` (a wagmi v3
   hook) that wagmi v2 doesn't export. Rather than force the whole app + 8 screens onto wagmi v3, the Zama
   config is built via the **viem adapter** (`@zama-fhe/sdk/viem` `createConfig`) fed by wagmi's public/wallet
   clients — the trap-mandated provider order (`Wagmi → QueryClient → Zama`) is preserved.
5. **Etherscan verification pending an API key** (the one input I can't self-provide) — `npm run verify:all`
   is ready; see §1.
6. **Illustrative-but-labelled data**: the GhostGate demo lane numbers (2.5M/0.5M/80%), the Status keeper-log
   feed, and Market-detail Activity rows are illustrative (commented in code) — they mirror the real CP4
   Sepolia result / would stream from event logs in a full production build. Every *encrypted* value shows the
   lock/dots, never a fake plaintext.
7. **Keeper epoch advancement is best-effort** — the public RPC rejects deep `getLogs` (archive), so recovering
   a stalled pending-epoch's snapshot handles is limited to a recent block window; GhostGate + liquidation
   driving are unaffected, and the keeper runs live throughout.

## CP6 = ready for review. The app is built, type-checks, and runs live on Sepolia; verification + the video
recording remain (both need inputs only you can provide: the Etherscan key and a funded MetaMask session).
