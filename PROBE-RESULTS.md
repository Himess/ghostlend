# PROBE-RESULTS — Day-0 Sepolia probe run (GhostLend)

**When:** 2026-07-04 · **Chain:** Ethereum Sepolia (11155111) · **Signer:** `0xF505e2E71df58D7244189072008f25f6b6aaE5ae` (2.76 ETH, nonce 3024 at start)
**Goal:** resolve 9 open unknowns against LIVE Sepolia + KMS before writing any protocol contract. Every result below is from a **real on-chain call or tx** (no mocked/faked results). Grounded on `zama-docs/` (00–07).

**Bottom line: 9/9 probes ran; all core architecture assumptions hold, with two corrections** — (P4) the deployed mocks **revert `ERC7984ZeroBalance`** on a never-funded `from` (they do NOT clamp like the OZ v0.5.1 library), and (P8) the deployed `HCULimit` is **v0.3.0** (newer than any published source; exact caps unreadable, but measured headroom is large).

### Setup notes / deviations
- **`ARCHITECTURE.md` does not exist yet** (the architect step hasn't produced it). Probes were run against the spec in the task + `zama-docs/`; §-references below point at `zama-docs/06-pitfalls.md` and `03-erc7984.md`.
- **Wallet input was a private key, not an address** (`0x0beef6…dbc6`, 32 bytes). It was loaded as the Sepolia signer via `probe/secrets.json` (git-ignored) → derived address `0xF505…E5ae`. The template's MNEMONIC/INFURA convention was replaced with a private-key + public-RPC config in `hardhat.config.ts` (documented in-file).
- **RPC:** `https://ethereum-sepolia-rpc.publicnode.com` (no Infura key supplied; public node works for all calls).
- **ABIs:** Etherscan is key-gated (keyless `getabi` → "Missing/Invalid API Key"), so ABIs were built from the OZ repo (`IERC7984`, `ERC7984ERC20Wrapper`) + the raw Zama docs (deployed-wrapper `Wrap` event, registry tuple signature). FHE/plugin APIs were read from the installed `@fhevm/solidity@0.11.1` and `@fhevm/hardhat-plugin@0.4.2` sources.
- **P0 (pre-flight):** all 9 addresses verified as live contracts. Both cUSDC & cWETH wrappers are **EIP-1967 proxies sharing one implementation** `0x390aa02fb7eba565bfcfc43f67db7e4d05c1d0ee`; registry/ACL/HCU/KMS are proxies too; underlyings and the Chainlink feed are non-proxy contracts.

---

## P1 — Token decimals & rate constants — **PASS**

Read-only calls to both wrappers + underlyings.

| token | decimals | rate | underlying() | underlyingDec | confidentialTotalSupply |
|---|---|---|---|---|---|
| **cUSDC** `0x7c5B…3639` | **6** | **1** | `0x9b5C…DFfF` | **6** | returns bytes32 ✓ |
| **cWETH** `0x4620…3158` | **6** | **1000000000000** (1e12) | `0xff54…5f3F` | **18** | returns bytes32 ✓ |

**Assumption check:** cUSDC (udec 6 → wrapperDec 6 → rate 1) ✓; cWETH (udec 18 → wrapperDec 6 → **rate 1e12**, so 1 confidential base unit = 1e-6 WETH) ✓. **No correction needed.** Price math constants confirmed: cUSDC confidential units are 1:1 with USDC base units; cWETH confidential units are WETH/1e12 (i.e. µWETH).

## P2 — Registry validity — **PASS**

Registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`. Signature is a **tuple** (corrects the probe-spec's bare-address assumption): `getConfidentialTokenAddress(erc20) → (bool isValid, address confidentialToken)`.

| token | getConfidentialTokenAddress(underlying) | isConfidentialTokenValid(wrapper) |
|---|---|---|
| cUSDC | isValid=**true**, token=`0x7c5B…3639` (matches wrapper ✓) | **true** |
| cWETH | isValid=**true**, token=`0x4620…3158` (matches wrapper ✓) | **true** |

Both mocks are registered, valid, and the registry maps underlying→wrapper correctly. Safe to resolve wrappers via the registry at deploy time (still re-check `isValid` since entries can be revoked).

## P3 — Underlying mock mint semantics — **PASS**

Both underlyings behave identically (`mint(address,uint256)`, public/permissionless).

- **Signature:** `mint(address to, uint256 amount)` — no access control.
- **Units:** argument is **raw base units** (minted 123456 → balance 0→123456→246912 over two calls; delta == arg).
- **Per-call cap = 1,000,000 whole tokens** = `1e6 · 10^decimals` base units. staticCall map: `1e6·10^dec = OK`, `1e6·10^dec + 1 = REVERT`, `2e6·10^dec = REVERT`. Revert selector `0x3a91f045(attempted, cap)` (mock's mint-cap error; cap arg = `0xe8d4a51000`=1e12 for USDC, `0xd3c2…0000`=1e24 for WETH).
- **No cooldown / cumulative cap:** two separate mint txs in a row both succeeded → mint as many times as needed, ≤ 1M tokens each.

**Funding recipe (forced):** to fund a confidential balance = `underlying.mint(user, baseUnits)` (≤ 1e6·10^dec) → `underlying.approve(wrapper, baseUnits)` → `wrapper.wrap(user, baseUnits)`. No faucet; no Zama ETH faucet either (use a third-party Sepolia ETH faucet for gas).

## P4 — Fresh-account transfer behavior — **PASS (REVERTS, not clamp)** ⭐

Throwaway wallet **Y** `0x23F2969487eAF6a48227F63D9DDc5CDAC7Cda16C` (never held cUSDC), funded 0.08 ETH for gas.

- **Zero-balance `confidentialTransfer(main, enc(1), proof)`** → **REVERT**, selector `0x5ff91cdc` = **`ERC7984ZeroBalance(Y)`** (verified `keccak256("ERC7984ZeroBalance(address)")[:4] == 0x5ff91cdc`).
- **Funded retry** (Y minted+wrapped 0.1 USDC, then transferred 1 unit) → **SUCCESS**, gas 448,172.

**RESULT:** the deployed cUSDC wrapper **reverts on a never-funded `from`** — matching Zama's ConfidentialWrapper docs and **contradicting OZ v0.5.1** (which clamps to 0). **Resolves pack UNCERTAIN #14/#2.**

**Decision forced:** any flow moving tokens FROM a possibly-never-funded account (liquidation seize; a `confidentialTransferFrom` on a user who set an operator but holds nothing) MUST `try/catch` or pre-check `confidentialBalanceOf != 0`. Ordinary deposits are safe (depositor holds a balance). Do **not** rely on OZ clamp-to-0 on the real mock.

## P5 — Deposit primitive E2E — **PASS** ⭐⭐

`ProbeSink` deployed `0x401940f3994f8ac007fC2c8de2f2a0c0BD471c03` (token=cUSDC). Full path with the real mock:

1. **Fund:** wrap 500000 base USDC → `Wrap.roundedAmount = 500000` (rate 1 → zero rounding loss).
2. **`setOperator(sink, until=1783121458)`** → `OperatorSet.until` matches; `isOperator(main, sink) = true`.
3. **Operator pull:** encrypted input bound to (sink, main); `sink.pull(main, enc(1000), proof)` runs `FHE.fromExternal` → `FHE.allowTransient(amount, token)` → `token.confidentialTransferFrom(main, sink, amount)` → `FHE.add(_totalPulled, transferred)` → `allowThis` + `allow(main)`. **status 1, gas 575,133.**
4. **Read-back:** the sink's `_totalPulled` aggregate **user-decrypts to exactly 1000** (= deposit).
5. **Real-Sepolia HCU of the pull:** global **748,096**, depth **369,000**.

**Confirms (03-erc7984 §3.4 ACL claim on the real mock):** the pool-as-`to` **can consume the returned `transferred` handle** — add it into an encrypted aggregate, persist with `allowThis`, and re-authorize the user to decrypt. **The core deposit/accounting design is sound.** Pool pattern validated: user `setOperator(pool, until)` (pass explicit `until`; SDK default is only 1 h), user submits encrypted amount bound to the **pool**, pool converts + `allowTransient` to token + `confidentialTransferFrom` no-proof overload, account by the returned handle.

## P6 — Public decryption on REAL Sepolia + latency — **PASS** ⭐⭐

Same `ProbeSink`. Stored constant 12345 (`FHE.asEuint64` → `allowThis` → `makePubliclyDecryptable`), emitted handle.

- **`publicDecrypt([handle])` round-trip latency: 2,841 ms (~2.8 s)** — real relayer + KMS, keyless. Returned field is **`clearValues`** (not `values`); `abiEncodedClearValues = 0x…3039` (=12345); proof = 914 hex chars, **numSigners = 7**.
- **Tamper — flipped proof byte** → `finalize` staticCall **reverts** `ECDSAInvalidSignature()` (`0xf645eedf`).
- **Tamper — wrong cleartext** (encode 99999 + real proof) → **reverts** `KMSInvalidSigner(0x4f53…e902)` (`0x6475522d`) — the proof binds cleartext↔handle, so a bad cleartext yields an unregistered recovered signer.
- **Real finalize** (`FHE.checkSignatures(storageHandles, cleartexts, proof)`): the real KMS proof **verifies on-chain**; `finalizedValue = 12345`. **status 1, gas 374,315** ≈ the epoch/liquidation finalize cost.

**Confirms:** the pull-model decryption (`makePubliclyDecryptable` → off-chain `publicDecrypt` → self `finalize`+`checkSignatures`, handle list rebuilt from **storage**, replay-guarded) works end-to-end on live Sepolia; real proofs verify and tampered ones revert. Proof layout confirmed: `1 byte numSigners + 65·numSigners + extraData`.

## P7 — Relayer auth reality — **PASS (keyless works on Sepolia)**

Relayer `https://relayer.testnet.zama.org`. **Definitive evidence:** every relayer-backed op in P4/P5/P6 — `createEncryptedInput().encrypt()`, `publicDecrypt` (2.8 s), `userDecryptEuint` (EIP-712) — succeeded with **no `x-api-key` configured**. Raw unauthenticated GETs returned **HTTP 404** ("no Route matched" — Kong routing, the real endpoints are POST), **not 401/403** → no edge auth on testnet.

**Decision:** develop **keyless** on Sepolia today (resolves the 06-pitfalls §12 contradiction in favor of "testnet open"). Still build a backend proxy that injects `x-api-key` for mainnet (mainnet relayer requires a key); never ship a key client-side.

## P8 — HCU limits — **PARTIAL (measured, not fully confirmable)**

- **Documented/source caps** (`@fhevm/host-contracts@0.10.0`, internal `HCULimit.sol` v0.1.0): **20,000,000 global / 5,000,000 depth per tx**, no per-block cap. Both are `private constant`.
- **⚠️ Deployed HCULimit is `v0.3.0`** (`getVersion()` on `0xa109…0A22`) — newer than any published npm source (0.10.0 ships v0.1.0). Its caps are `private` and **unreadable** (6 candidate getters all revert). The v0.12+ changelog added a per-block cap, which v0.3.0 may enforce — so 20M/5M is the best-known figure but **not confirmed** against the deployed code.
- **Measured on live Sepolia** (`fhevm.computeTransactionHCU` works on real receipts): the deposit `pull` tx = **748,096 global / 369,000 depth** — ~3.7% / ~7.4% of the documented caps. **Ample headroom.**

**Decision:** size lending ops by keeping FHE-op count per tx small and **never looping over all positions**; a single-user deposit/borrow/repay is nowhere near any plausible cap. Treat exact caps as unknown-but-large; re-measure the heaviest tx (multi-op liquidation/epoch) before shipping.

## P9 — Chainlink ETH/USD feed — **PASS**

Feed `0x694AA1769357215DE4FAC081bf1f309aDC325306`: **description "ETH / USD"** ✓, **decimals 8** ✓, price **$1760.55**, `updatedAt` age **2,940 s (~49 min < 1 h)** ✓ (Sepolia ETH/USD heartbeat is ~1 h — near the edge is normal; guard staleness with a generous threshold, e.g. revert if age > 2 h). Correct feed; live and usable.

---

## DECISIONS FORCED (hand-back list for the architect)

1. **Deposit path is sound as designed** — operator pull + `confidentialTransferFrom` + account-by-returned-handle works on the real mock; pool-as-`to` can consume/aggregate the `transferred` handle and re-authorize user decryption. (P5)
2. **Fresh/empty accounts REVERT (`ERC7984ZeroBalance`), they do NOT clamp** — any transfer FROM a possibly-unfunded account (liquidation seize, operator-pull on an empty user) needs `try/catch`/pre-check. Normal deposits unaffected. Do not assume OZ v0.5.1 clamp semantics. (P4)
3. **cWETH rate = 1e12 confirmed** (wrapperDec 6, underlyingDec 18); cUSDC rate = 1. Confidential amounts are `euint64` base units at the wrapper's 6 decimals. Price math: value_usd = confUnits · 10^(-6) · price_per_token; for cWETH 1 confUnit = 1e-6 WETH. (P1)
4. **Both mocks registered & valid** in the registry; resolve via `getConfidentialTokenAddress(erc20) → (isValid, token)` and re-check `isValid`. (P2)
5. **Funding recipe:** `mint(user, baseUnits≤1e6·10^dec)` → `approve(wrapper)` → `wrap(user, baseUnits)`. mint is public, raw base units, 1M-tokens/call cap, no cooldown. (P3)
6. **Set operator with an explicit long `until`** (SDK default is 1 h); expiry is `uint48` seconds, inclusive. (P5)
7. **Public-decrypt / epoch / liquidation timing:** budget ~**3 s** relayer latency (measured 2.84 s), design async-with-no-hard-deadline; finalize costs ~**374k gas**; a deposit costs ~**575k gas**. Rebuild the handle list from storage, add your own replay guard (checkSignatures has none). (P6)
8. **Relayer is keyless on Sepolia today** — build without a key; add a mainnet proxy later. (P7)
9. **HCU:** documented 20M/5M per-tx; deployed HCULimit is v0.3.0 (caps unreadable, possibly a per-block cap). Measured deposit = 748k/369k → large headroom. Keep per-tx FHE-op counts small; never iterate all borrowers. (P8)
10. **Chainlink ETH/USD** `0x694A…5306` is correct/live (8 decimals, ~1 h heartbeat) — use a ≥2 h staleness guard. (P9)

---

## Appendix — environment, versions & audit trail

**Toolchain (installed):** hardhat 2.28.6 · `@fhevm/solidity` 0.11.1 · `@fhevm/hardhat-plugin` 0.4.2 · `@fhevm/host-contracts` 0.10.0 (HCULimit src v0.1.0; **deployed v0.3.0**) · `@fhevm/mock-utils` 0.4.2 · `@zama-fhe/relayer-sdk` 0.4.1 · ethers 6 · solc 0.8.27/cancun. Config idiom: contracts inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol`.

**Verified live contracts (P0):** cUSDC wrapper `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` · cUSDC underlying `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` · cWETH wrapper `0x46208622DA27d91db4f0393733C8BA082ed83158` · cWETH underlying `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` · shared wrapper impl `0x390aa02fb7eba565bfcfc43f67db7e4d05c1d0ee` · registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` · ACL `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` · HCULimit `0xa10998783c8CF88D886Bc30307e631D6686F0A22` (impl `0xcc7b81e598fcf5e2247f29de87c6c879d06581e2`) · KMSVerifier `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` · Chainlink ETH/USD `0x694AA1769357215DE4FAC081bf1f309aDC325306`.

**Throwaway wallet Y (P4):** `0x23F2969487eAF6a48227F63D9DDc5CDAC7Cda16C` — pk `0x63142bb4a666110f22ce61fe1d97ea74e0b23f2112f7691ce8cdf055887e4515` (testnet only).
**Deployed ProbeSink (P5/P6):** `0x401940f3994f8ac007fC2c8de2f2a0c0BD471c03` (an earlier abandoned deploy at `0xFCC95c380099D7A20dCbcB5200307Fc0926271D0`).

**Transaction hashes**
- P3 mint USDC `0x2806072c…dd3bb2`, `0xe0aba0a3…16af2b4`; mint WETH `0x0ad030f9…5280bf`, `0xa05c24ca…0da5ff`
- P4 fund-Y `0x1c80de0a…6550d8`; Y mint `0xff3a2ce6…09964`; Y approve `0xfefdf028…5979e19`; Y wrap `0x794c8865…cc087a`; funded transfer `0x4766b8cc…d4f398c`; zero-balance attempt → reverted `ERC7984ZeroBalance` (no tx mined)
- P5 wrap `0x829ea91a…6bafc5`; setOperator `0xba2a2506…3878fd7`; **pull `0xca1878c4…0fb5ca7` (gas 575,133)**
- P6 store `0x28cdb902…760aaf2`; **finalize `0xb9ef98a3…e895a119` (gas 374,315)**

**Files:** probe scripts in `probe/*.ts` (run `npx hardhat run probe/<x>.ts --network sepolia`); per-probe fragments + raw `state.json` in `probe/out/`; throwaway/RPC secrets in `probe/secrets.json` (git-ignored); `contracts/ProbeSink.sol`. **Stopped here per instructions — no protocol implementation.**
