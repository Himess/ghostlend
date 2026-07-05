# GhostLend frontend — shared spec for screen-porting agents

You are porting ONE screen of a Next.js dApp from a design shell to a live-wired React component. The design
is the VISUAL SOURCE OF TRUTH — copy its layout, copy, colors, spacing EXACTLY. Do NOT redesign. Replace every
mock value with a real contract read/write per this spec.

## Where things are (repo root: C:\Users\USER\desktop\zama, frontend at ./frontend)
- Design shell: `_designbrief/GhostLend.dc.html` — read ONLY your screen's line range (given in your task).
  It uses `sc-if value="{{x}}"` (→ `{cond && (...)}`), `sc-for list="{{list}}" as="item"` (→ `{list.map(...)}`),
  and `{{binding}}` mustaches. The data model + every binding is in the `<script data-dc-script>` block
  (lines 1076-1547) — its `MOCK` object + `renderVals()` tell you what each binding means.
- Foundation already built (import and use, do NOT recreate):
  - `@/lib/css` → `css("display:flex;gap:14px")` returns a React style object. **Copy the design's exact inline
    `style="..."` strings verbatim into `css("...")`.** For dynamic styles build the string with template
    literals. SVGs: copy verbatim but camelCase attrs (`stroke-width`→`strokeWidth`, `stroke-linecap`→`strokeLinecap`, `fill-rule`→`fillRule`, `clip-rule`→`clipRule`).
  - `@/lib/format` → `compact(n)`, `fmtUnits6(bigint)`, `shortAddr(a)`, `mmss(sec)`, `pct(n)`, `DOTS`.
  - `@/lib/addresses` → `ADDR` (all contract addresses), `MARKETS` (id/coll/borrow/collAddr/borrowAddr/lltv/sub/oracle/vaultPriced/collLabel), `PERMIT_CONTRACTS`, `EXPLORER`, `CHAIN_ID`.
  - `@/lib/abis` → `poolAbi, oracleAbi, wrapperAbi, gateAbi, vaultAbi, depositBatcherAbi, withdrawBatcherAbi, erc20Abi` (all `as const`).
  - `@/lib/hooks` → `useMarketsLive()`, `useEthPrice()`, `useVaultStats()`, `useGhostGate()`, `usePositionHandles(marketId)`, `tokenUsdPerUnit(token,ethUsd,sharePrice6)`, `borrowAprPct(utilBps)`, `supplyApyPct(utilBps)`.
  - `@/lib/nav` → `useNav()` → `{ route, marketId, action, go(r), openMarket(id,action), backToMarkets(), setAction(a), wizardOpen, setWizardOpen(v) }`.
  - `@/components/Toast` → `useToast()` → `push(msg, kind?)`.
- Reference screen (COPY THIS STYLE/PATTERN): `components/screens/Dashboard.tsx`.
- Write your file to `components/screens/<Name>.tsx`, exporting `export function <Name>() {...}`. Start with `"use client";`.

## Colors (already in globals.css :root, use var(--x)): --bg --surface --surface-2 --panel --ink --ink-2 --ink-3 --line --line-2 --accent(#ffd208) --accent-soft --green --green-bg --amber --red --red-bg --display --mono.

## Wallet + wagmi
- `import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";`
- `const { address, isConnected } = useAccount();`
- If not connected, still render the screen; disable action buttons and route writes through a `useToast()` "Connect your wallet first" guard.

## Zama v3 React SDK hooks (`@zama-fhe/react-sdk`) — EXACT signatures
- `useEncrypt()` → mutation. `const { mutateAsync: encrypt } = useEncrypt();`
  `const enc = await encrypt({ values: [{ value: amount6 /* bigint, 6-dec base units */, type: "euint64" }], contractAddress: <the contract the input is for>, userAddress: address });`
  → `enc.encryptedValues[0]` is the `externalEuint64` handle (bytes32), `enc.inputProof` is the proof bytes.
- `useConfidentialSetOperator(tokenAddress)` → mutation vars `{ operator, until }`. `until` = unix seconds expiry.
  `const { mutateAsync: setOperator } = useConfidentialSetOperator(ADDR.cUSDC); await setOperator({ operator: ADDR.pool, until: Math.floor(Date.now()/1000) + 86400 });`
- `useConfidentialBalance({ address: token, account })` → `{ data: bigint }` (decrypted; needs a permit — may be undefined until granted). Gate on isConnected.
- `useGrantPermit()` → `{ mutateAsync: grantPermit }`; `await grantPermit(PERMIT_CONTRACTS)`.
- `useHasPermit({ contractAddresses })` → `{ data: boolean }`.
- `useDecryptValues(inputs, { enabled })` → `{ data: Record<handle, bigint|boolean>, isPending }`. inputs = `[{ encryptedValue: handle, contractAddress }]`.
- `useShield({ address: wrapper })` → mutation vars `{ amount: bigint }` (wraps underlying → confidential; handles approve).
- `useApproveUnderlying(wrapperAddr)` → mutation vars `{ amount? }`.

## The two write patterns
### A) Pool op (supply/withdrawSupply/depositCollateral/borrow/repay/withdrawCollateral) — 2 step
Design shows: step 1 "Approve operator" (with expiry select 1h/24h/7d), step 2 "Confirm". Implement:
1. Operator approval: `useConfidentialSetOperator(<tokenBeingMoved>)`. The token the POOL pulls is the COLLATERAL
   for deposit/supply, the DEBT token for repay. (borrow/withdraw send TO the user → the op still needs operator set
   on the market's tokens; for the demo, set operator on the collateral token before borrow.) operator = ADDR.pool.
2. Confirm: `const enc = await encrypt({ values:[{value:amt6,type:"euint64"}], contractAddress: ADDR.pool, userAddress: address });`
   then `writeContract({ address: ADDR.pool, abi: poolAbi, functionName: <op>, args: [marketId, enc.encryptedValues[0], enc.inputProof] });`
   ops: supply/withdrawSupply/depositCollateral/borrow/repay/withdrawCollateral all take `(uint8 marketId, externalEuint64, bytes)`.
On success `useToast().push("<Verb> submitted · clamped to your encrypted maximum")`. amt6 = parse the input string × 1e6 (BigInt).

### B) Wrapper transferAndCall (Vault batchers + GhostGate) — deposit intent
`const enc = await encrypt({ values:[{value:amt6,type:"euint64"}], contractAddress: <wrapper cUSDC/cSHARE>, userAddress: address });`
`writeContract({ address: <wrapper>, abi: wrapperAbi, functionName: "confidentialTransferAndCall", args: [<batcherOrGate>, enc.encryptedValues[0], enc.inputProof, "0x"] });`
(cUSDC→DepositBatcher or GhostGate for a deposit intent; cSHARE→WithdrawBatcher or GhostGate for a withdraw intent.)

## Decrypt pattern (strictly on-click, My Position)
On the Decrypt button click: if `!hasPermit` → `await grantPermit(PERMIT_CONTRACTS)` (one EIP-712 sig, covers all).
Then enable `useDecryptValues([{encryptedValue: handle, contractAddress: ADDR.pool}, ...], {enabled:true})`.
The ~3s spinner while `isPending` is REAL KMS latency — show it (design has a "KMS decrypting… ~3s" state).
Handles come from `usePositionHandles(marketId)` (collateral, scaledDebt, scaledSupply as bytes32). Show `••••••` until decrypted; on reveal show the bigint via `fmtUnits6`.

## Traps to honor (per screen where relevant)
- Client-only: every screen file starts with `"use client";`.
- Amounts are 6-dec base units on-chain: string "1000" → 1000n × 1_000_000n.
- Public-step banner: show a small amber "PUBLIC STEP" banner ONLY on boundary-crossing steps — the Faucet
  underlying mint, and the Vault batch dispatch. Nowhere else (confidential ops get the lock badge instead).
- Batch countdown: use `useGhostGate().dispatchableIn` (seconds) → `mmss()`; label "next batch in ~mm:ss".
- Never claim a confidential value is public. Every encrypted amount shows the lock badge / dots until decrypted.

## Output
Write ONLY your screen component file. Match Dashboard.tsx's import style and css() usage. Keep the exact design
copy/text. Return a one-line summary of what you wired.
