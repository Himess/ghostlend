# GhostLend — confidential lending + leverage on Zama FHEVM (Sepolia)

Isolated-market lending where per-user balances are encrypted (`euint64`) and only aggregates / a single
liquidation bit are ever revealed. Built on FHEVM `@fhevm/solidity` 0.11.1 + OpenZeppelin
confidential-contracts 0.5.1 (ERC-7984), Chainlink ETH/USD, fhevm-hardhat-template.

**▶ Live demo: https://ghostlend.vercel.app** — connect a Sepolia wallet and decrypt your own positions.
All 7 contracts are Etherscan-verified; addresses in [`deployments/ADDRESSES.md`](./deployments/ADDRESSES.md).

## Three pillars
1. **Native confidential lending** — isolated markets (cWETH↔cUSDC) with encrypted supplied/collateral/debt;
   public rates & utilization per epoch, private positions, one-bit liquidation.
2. **Vault-collateralized credit + swap-free leverage** — Market 2 lends cUSDC against **csteakcUSDC**
   (a confidential ERC-4626 vault share), and `openLeveragedYield` loops it up to 4× in a single encrypted
   transaction. The leverage ratio itself is encrypted.
3. **Confidential cUSDC→cWETH borrow with zero leak** — the guided wizard composes Market 2 then Market 1
   to turn a vault position into ETH exposure with **no swap and no public leg** — every step is an encrypted
   pool op. Plus **GhostGate**, which nets vault deposits/withdrawals so only the net residual ever crosses
   to the public vault (dir + net the only reveals).

## Design decisions
- **Market 2 is same-asset by design (csteakcUSDC → cUSDC).** Collateral and debt are both USD-denominated,
  so there is **no cross-asset price risk** — which is exactly what lets it run at a high **90% LLTV** and
  makes a **swap-free leverage loop** solvent and born-healthy up to 4× (deposit → borrow → re-deposit,
  never touching a DEX). A cross-asset ETH need is *not* forced into Market 2; it is served cleanly by the
  **Market 1 composition** (the wizard: vault position → borrow cUSDC → borrow cWETH), keeping each market's
  risk isolated and each leg confidential. Same-asset leverage + composable cross-asset borrow beats one
  swap-dependent cross-asset leverage market on both privacy (no swap leak) and risk (no oracle-pair risk in
  the loop).
- **Pin-only GhostGate settlement** (see the GhostGate threat-model below): maximal privacy (only dir + net)
  without encrypted division, at the cost of an exact-rate drift guard. 

## Deployed (Sepolia) — full production set in [`deployments/ADDRESSES.md`](./deployments/ADDRESSES.md)
- **GhostLendPool** (M0/M1/M2) `0x1A887cb0dB1438e8f4597BBf4E8369e4C9146E14`
- **OracleAdapter** (Chainlink ETH/USD) `0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495`
- **GhostGate** `0xE90c95e8d3D82D3Ba5d309a3a9BE7575478dCaBC` · **MockYieldVault** `0x7B560a…65547` ·
  **csteakcUSDC** `0x099596…14aE` · DepositBatcher `0x0f425d…5567` · WithdrawBatcher `0x541979…c5D3`
- Markets: **M0** cWETH→cUSDC · **M1** cUSDC→cWETH (LLTV 80%) · **M2** csteakcUSDC→cUSDC (LLTV 90%, vault-priced)
- Externals: cUSDC `0x7c5BF4…3639`, cWETH `0x4620…3158`, feed `0x694A…5306`
- The legacy registry-on core pool `0x9631…2D64` (M0/M1 only) remains live for reference.

## Frontend
Live at **https://ghostlend.vercel.app**. A Next.js app (`frontend/`) ports the design shell (9 screens incl.
a Balances tab) wired to the live Sepolia contracts via `@zama-fhe/sdk` v3 + wagmi/viem. Run locally:
`cd frontend && npm install && npm run dev`.

## What is hidden vs public
- **Encrypted** (`euint64`, per user): supplied principal, collateral, debt, the per-op error flag.
- **Public**: interest indexes, rates, utilization *after* each epoch reveal, prices, LLTV, timestamps,
  and participant addresses (ERC-7984 `ConfidentialTransfer` exposes from/to — amounts stay encrypted).
- Liquidation reveals **one bit** (healthy/unhealthy) per poke — never the debt or collateral values.

## Limits (testnet)
- **Max position size = 1,000,000 whole tokens** (`MAX_AMOUNT = 1e12` base units). Every encrypted amount
  and position value is clamped to this so the on-chain math stays inside `euint64` (no euint128). Larger
  positions are not expected on testnet and would be math-capped.
- Interest index precision 1e6, max 4× growth. Faucet: `underlying.mint(you, ≤1e6 whole tokens)` →
  `approve(wrapper)` → `wrapper.wrap(you, amount)` (public, no cooldown).
- Relayer is keyless on Sepolia; a backend `x-api-key` proxy is required for mainnet only.

## Develop
```
npm install
npm test                      # mock FHEVM suites: 27 passing
npm run test:sepolia -- test/GhostLendSepolia.ts   # live smoke test
npx hardhat run scripts/deploy-core.ts --network sepolia
KEEPER_LOOP=1 npx hardhat run scripts/keeper.ts --network sepolia   # epoch + liquidation + GhostGate keeper (self-healing loop)
```

## Threat model & known limits (Market 2 / batchers)
- **Participation & timing are public.** The batcher's own source NOTE: *"The batcher could be used to
  maintain confidentiality of deposits — by default there are no confidentiality guarantees."* Deposit
  *amounts* are encrypted, but who deposits, when, and each dispatch/claim are visible on-chain. Anonymity
  is only across independent participants within a `minBatchAge` window.
- **Claim outputs round down** — small deposits can round to 0 if the exchange rate is < 1:1; `toToken`
  dust accrues in the batcher over time (documented base behavior, by design).
- **Wrapper capacity.** ERC-7984 supply is bounded by `type(uint64).max`. If a wrapper fills, batches can
  brick (the batcher can't wrap). The keeper warns when either wrapper's inferred utilization exceeds 50%.
- **Leverage negative carry.** Leveraged-yield positions are born healthy (LLTV 90%, lev ≤ 4 ⇒ debt/coll
  ≤ 75%); liquidation risk arises only over time if borrow APR outruns vault APY (net carry
  `lev·APY − (lev−1)·APR` turns negative). Surfaced in the UI carry view (`leverageCarry`).

## Threat model & known limits (GhostGate netting gateway)
GhostGate nets deposit intents (cUSDC) against withdrawal intents (cSHARE) within a `minBatchAge` window and
reveals **only two handles per window** — `dir` (which side is larger) and `net` (the absolute imbalance).
The gross aggregates `D`/`W` and every per-user intent stay encrypted forever (enforced by construction and
asserted by the reveal-surface test). Only the *net* flow ever crosses the confidential↔plaintext boundary.
- **Pin-only settlement.** Every claim on both sides settles at the share price **pinned at window open**
  (`claim = intent × pin`, plaintext scalar, zero division). The matched portion never touches the vault; the
  residual `net` is routed once (`vault.deposit`/`withdraw`) so the gate holds the right token mix. Per-user
  round-down dust accrues to the gate.
- **Why pin-only (an FHE limitation, not a shortcut).** A per-user *blended* rate (matched-at-pin + net-at-
  realized-route) would require dividing each intent by the encrypted total `D`/`W`. FHE has **no
  euint/euint division** — the divisor must be plaintext — so the only ways to do it are (a) reveal the
  winning side's total as a third handle, or (b) encrypted division. We **reject (a)**: `dir + net + one
  side's total ⇒ both aggregates are derivable`, which destroys the netting privacy that is the whole point.
  (b) does not exist in the library. Pin-only is therefore the maximally-private settlement that is also
  division-free and solvent.
- **Drift guard (in-code, mandatory).** Before routing, the gate requires the **realized** vault rate to
  equal the pin **exactly**; on any mismatch the batch **cancels with full encrypted refunds** (via `quit`).
  For this vault the price only moves on a keeper drip, so exact equality is the correct test.
- **Keeper discipline (operational invariant).** The keeper MUST order operations `drip → open window →
  dispatch → (only then) drip again` — **never drip yield while a GhostGate window is live.** A mid-window
  drip trips the drift guard and cancels the batch (safe, but wastes a round). The keeper drives GhostGate
  and the vanilla batchers on the same vault and is the single writer of vault yield, so it enforces this by
  construction.
- **Real-world vaults / roadmap.** Pin-only is *exact* only for a vault whose rate is piecewise-constant
  between keeper actions. A production vault whose share price moves every block would cancel constantly under
  exact-equality. The privacy-preserving path forward is **coarse-bucket splits** (reveal the split only at a
  low-cardinality granularity, e.g. round `net` to buckets) rather than revealing totals or awaiting
  euint/euint division — noted as future work, out of scope for this checkpoint.

## Known issues & audit disclosure
A full read-only audit was run over this repo (contracts, frontend, scripts, config). The core protocol is
sound — mock test suite green (27/27), frontend type-clean, on-chain addresses consistent across frontend /
deployments / keeper, and FHE ACL hygiene correct (every stored handle `allowThis` + `allow(user)`, outgoing
transfers `allowTransient`, epoch/gate finalizers rebuild handles from storage with replay guards +
`checkSignatures`). The issues below are **identified and documented, not hidden.** None affects the current
seeded Sepolia deployment; they matter for future redeploys and specific edge cases, and fixes are planned
post-submission.

- **Epoch-brick on a zero-aggregate market (fix needs a redeploy).** `closeEpoch` has no on-chain guard
  against snapshotting an uninitialized/zero aggregate handle; the KMS `publicDecrypt` rejects a zero handle,
  which would freeze the epoch machine. **Mitigated operationally** in the live deployment: every market is
  seeded *before* its first `closeEpoch`, and the keeper only drives seeded markets — so it cannot occur here.
  Planned fix: seed the aggregates to a non-zero baseline in the constructor, or gate `closeEpoch` on a
  plaintext activity counter and require non-null handles before revealing.
- **Liquidation stale-snapshot edge case.** `finalizeLiquidation` seizes against the debt snapshot taken at
  `poke` time without re-checking current health, and there is no one-poke-per-position lock — so a borrower
  who cures within the poke TTL, or a double-poke, could be over-seized. Planned fix: a single active poke per
  `(market, user)` + recompute health/seize from the *current* position at finalize.
- **`deleverage` cash accounting.** On repayments grown by accrued interest, `availCash` can be credited more
  than `rebalanceQueue` is debited, so the "`availCash ≤ physical balance`" invariant can drift (the excess is
  share-backed, not cash-backed). Planned fix: credit `availCash` only by the queue-covered portion.

These sit alongside the **boundary leaks already documented above** — participation/timing are public, the
wrap/unwrap and net-routing steps cross the confidential↔public boundary, and batch anonymity is only *N−1*
within a window — which are inherent to confidential lending on a public chain, not defects.

Design of record: `ARCHITECTURE.md` (v1.0 + amendment notes) + `ADDENDUM.md` (v1.1) + `BATCHER-NOTES.md`
+ the `zama-docs/` pack. See `CP2-STATUS.md` / `CP3-STATUS.md` / `CP4-STATUS.md`.
