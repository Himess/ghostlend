# 00 — INDEX: Zama FHEVM documentation pack

Purpose: source-of-truth documentation for designing a **confidential lending + leverage protocol** on Ethereum Sepolia (Zama Developer Program, deadline 2026-07-07). Stack: Solidity + fhEVM (`FHE` library), ERC-7984 confidential tokens (official cUSDCMock/cWETHMock), OpenZeppelin confidential contracts, fhevm-hardhat-template, Zama frontend SDK, Chainlink ETH/USD feed.

Gathered 2026-07-03 from `docs.zama.org/protocol` (via `llms.txt` index + raw-markdown `.md` endpoints + GitBook `?ask=` query endpoint) and three cloned GitHub repos. **~140 doc pages + 21 `?ask=` responses** archived verbatim under `_raw/` (exact URL↔file mappings in the five `_raw/*-manifest.md` files).

## Conventions used throughout the pack

- Code blocks, signatures, and tables are **verbatim** from the raw dumps; every section cites its source URL or repo path.
- **UNCERTAIN:** = could not be fully resolved from docs; the doc is quoted and the ambiguity described.
- `?ask response` = answer from GitBook's ask endpoint (doc-grounded but generated; saved under `_raw/**/ask*` for audit).
- Archived doc channels are labeled: unversioned paths = CURRENT docs; `/v0.10/ /v0.11/ /v0.12/` = archived Solidity-guide versions; `/sdk/alpha/` = SDK prerelease channel.

## File map

| File | Contents |
|---|---|
| `01-fhe-core.md` | Encrypted types (incl. euint128/euint256 support matrix), full ops list + verbatim HCU cost tables & limits, ACL rules, encrypted inputs & proof packing, handles, FHE.select branching + encrypted-error idiom, casting/trivial encryption, randomness, `ZamaEthereumConfig` configuration |
| `02-decryption.md` | **#1 unknown, exhaustive**: current pull-model public decryption (makePubliclyDecryptable → publicDecrypt → checkSignatures) with verbatim signatures + complete working examples; user decryption (EIP-712 permit model, SDK v3) + legacy relayer-sdk flow; delegation; old→new migration table |
| `03-erc7984.md` | ERC-7984 (DRAFT) standard, full IERC7984/IERC7984Receiver verbatim, clamping semantics, operator flow (setOperator/isOperator + expiry), pool-pull deposit pattern, transfer callbacks, ERC-20 wrapper (wrap/unwrap/finalizeUnwrap, decimals/rate), wrappers registry |
| `04-tooling.md` | fhevm-hardhat-template structure + verbatim deps/config, mock mode + `hre.fhevm` test API + how public-decryption is tested locally, Sepolia deployment, frontend SDK v3 usage + legacy relayer-sdk (labeled) + v2→v3 migration, local dev (cleartext relayer) |
| `05-addresses.md` | All verbatim address tables: Sepolia host contracts, relayer URL, Gateway chains (testnet + mainnet), Wrappers Registry, every cTokenMock + underlying + mint instructions, Ethereum mainnet, chain IDs |
| `06-pitfalls.md` | Merged + deduplicated warnings/limits/anti-patterns from all passes, themed; opens with the top-10 architecture-critical items and closes with lending-design implications |
| `07-examples.md` | All 19 official examples IN FULL verbatim (decryption examples first, then OZ/token, auction, basics), each with a lending-relevance note. *(Added beyond the original 00–06 spec because examples had no other home.)* |
| `_fragments/` | Per-topic pitfalls + unresolved-questions source fragments (pre-merge originals) |
| `_raw/` | Verbatim raw markdown dumps of every fetched page + `?ask` responses + 5 manifests (URL↔file) + `llms-protocol.txt` (full docs index) |
| `../_repos/` | `fhevm-hardhat-template` @ ec84e1a (2026-05-04, template v0.4.1) · `openzeppelin-confidential-contracts` @ 0befb23 (2026-06-26, v0.5.1) · `relayer-sdk` @ d06f1e5 (0.5.0-rc.1) — depth-1 clones |

**Suggested reading order for architecture design:** 00 → 06 (top-10 + constraints first) → 01 (compute model) → 02 (decryption lifecycle) → 03 (token/operator semantics) → 05 (addresses) → 07 (patterns) → 04 (when implementing/testing).

## Exact versions found (2026-07-03)

| Package / component | Version | Evidence |
|---|---|---|
| `@fhevm/solidity` | **0.11.1** (npm latest, 2026-02-19) | `npm view`; template pins `^0.11.1`; OZ peer-dep pins **exactly 0.11.1** |
| `@fhevm/hardhat-plugin` | **0.4.2** | `npm view`; template `^0.4.2` |
| `@fhevm/mock-utils` | 0.4.2 | `npm view` |
| `@zama-fhe/relayer-sdk` (legacy) | **0.4.4** npm latest — **NOT npm-deprecated**, docs label it "legacy"; repo `main` = 0.5.0-rc.1 (async HTTP API migration) | `npm view`; `_repos/relayer-sdk`; template pins `^0.4.1` |
| `@zama-fhe/sdk` (current frontend SDK) | **3.2.0** (dist-tag latest; alpha 3.3.0-alpha.8) | `npm view` |
| `@zama-fhe/react-sdk` | 3.2.0 | `npm view` |
| `@openzeppelin/confidential-contracts` | **0.5.1** (repo == npm) | repo `package.json`; `npm view` |
| `@openzeppelin/contracts` (peer) | ^5.6.1 | OZ `package.json` |
| Hardhat toolchain (template) | hardhat `^2.28.6` (NOT v3), hardhat-deploy `^0.11.45`, ethers `^6.16.0`, chai `^4.5.0`, solc **0.8.27 / cancun** | `_repos/fhevm-hardhat-template/package.json`, `hardhat.config.ts` |
| Zama Protocol — Sepolia testnet | **FHEVM v0.13** (Jun 2026) | changelog |
| Zama Protocol — Ethereum mainnet | **FHEVM v0.11** (Feb 2026) | changelog |
| ERC-7984 | **DRAFT** ERC | eips.ethereum.org citation; OZ natspec "Draft interface" |

⚠️ Protocol version numbers (v0.11/v0.13) and npm package versions (0.11.1) are **different numbering schemes**; the docs never map them. Testnet(v0.13)-only features — HCULimit contract, `FHE.isPublicDecryptionResultValid`, all-contracts delegation sentinel — do **not** exist on mainnet (v0.11).

## Headline corrections vs. common (stale) assumptions

1. **`FHE.requestDecryption` + oracle push-callback: REMOVED** (deprecated FHEVM v0.9). Public decryption is now pull-style: `FHE.makePubliclyDecryptable` → off-chain `publicDecrypt` → self-written permissionless finalize function calling `FHE.checkSignatures(bytes32[] handlesList, bytes abiEncodedCleartexts, bytes decryptionProof)`. No request IDs, no fees, no `FHE.allow(oracle)`. → `02-decryption.md`
2. **`SepoliaConfig`: REMOVED** (v0.9). Contracts inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` (resolves per `block.chainid`, works on Sepolia AND mainnet). → `01-fhe-core.md` §10
3. **Frontend SDK generation change:** current default is `@zama-fhe/sdk` v3 (`ZamaSDK`, permits, React hooks); `@zama-fhe/relayer-sdk` (`initSDK`/`createInstance`/`userDecrypt`) is legacy-but-alive and still what the Hardhat template + official examples import. The docs explicitly warn that AI assistants confuse the two. → `04-tooling.md`
4. **`awaitDecryptionOracle` does not exist** in the current Hardhat plugin — mock decryption tests call `hre.fhevm.publicDecrypt` and submit the returned proof to your finalize function. → `04-tooling.md` §2.5
5. **ERC-7984 never reverts on insufficient balance** — transfers clamp to encrypted 0; account with the returned handle. Deployed Zama wrappers may still throw `ERC7984ZeroBalance` for never-funded senders (library removed it in v0.5.0) — handle both. → `03-erc7984.md`, `06-pitfalls.md` §9
6. **Confidential token amounts are euint64 @ ≤6 decimals** (wrapper-enforced); euint256 has no arithmetic; `FHE.div/rem` take plaintext divisors only. → `01-fhe-core.md`, `03-erc7984.md`

## QUESTIONS WE COULD NOT RESOLVE (explicit, merged from all passes)

Per-topic detail + resolution paths in `_fragments/questions-*.md`. Grouped; ➜ = recommended resolution.

**Protocol limits & performance**
1. Sepolia's actual HCU caps — docs give 20M global / 5M sequential-depth "for the current devnet" only; v0.12 per-block cap value unknown. ➜ read `HCULimit` contract `0xa10998783c8CF88D886Bc30307e631D6686F0A22` on-chain.
2. Public-decryption **latency on Sepolia** — no SLA/figure anywhere (only "2–5 s" for user-decrypt reads). ➜ measure; design async-no-deadline.
3. Max handles per `publicDecrypt` / relayer payload cap — undocumented. ➜ probe batch sizes; keep epoch batches chunkable.
4. Relayer **rate limits** — unpublished (only 429/`RelayerRequestFailedError` semantics). ➜ backoff + retry design.
5. **Does the Sepolia relayer need an API key?** Docs contradict (auth guide: yes for every request; addresses `?ask` + API-key page + plugin README: mainnet-only). ➜ try keyless against `https://relayer.testnet.zama.org`; build a backend proxy regardless.
6. KMS signer threshold value on Sepolia — not stated.
7. Gas cost + "signature caching" semantics of `FHE.checkSignatures` — undocumented. ➜ measure finalize-tx gas with realistic epoch batches.
8. Current input-proof packing ceilings — only archived v0.10 defaults known (255 handles / 2048-bit CRS). ➜ keep inputs small; test.

**Versioning**
9. Which `@fhevm/solidity` npm version implements which protocol-vX features (e.g., is `FHE.isPublicDecryptionResultValid` — a v0.12 protocol feature — in npm 0.11.1?). ➜ check the package CHANGELOG/source when scaffolding.
10. `FHE.sum` / `FHE.isIn` — in the v0.13 changelog, absent from the API reference (roadmap "ETA -"). ➜ do NOT use.
11. Signed encrypted ints (`eintX`) — mentioned once in an `?ask` response, absent from the types table/HCU tables. ➜ assume nonexistent.
12. Changelog's "`@fhevm/sdk`" vs npm's `@zama-fhe/sdk` — same thing or a future rename? ➜ pin `@zama-fhe/sdk@3.2.0` (exists today).
13. relayer-sdk 0.5.0 async-API migration impact on 0.4.x apps. ➜ pin `^0.4.4`.

**Deployed Sepolia mocks (behavior may differ from OZ v0.5.1 — UUPS proxies)**
14. Which library version cUSDCMock/cWETHMock actually run; does `ERC7984ZeroBalance` revert apply to fresh accounts? ➜ probe from a fresh account; tolerate both in the first-deposit path.
15. Operator scope for `unwrap` (SDK guide says transfer-operator ≠ unshield right; on-chain code uses the same `isOperator`). ➜ test unwrap-as-operator on Sepolia.
16. Deployed wrapper's ACL on the `confidentialTransferFrom` returned handle (same as OZ v0.5.1?). ➜ verify the pool can `FHE.add` the returned handle in-tx against the real cUSDCMock.
17. Mock decimals/`rate()` (assume USDC 6 → rate 1; WETH 18 → rate 10^12) and `mint` cap semantics (1,000,000 whole tokens vs base units; cooldowns?). ➜ read on-chain; probe.
18. Registry `isValid` status of the mocks. ➜ one `getConfidentialTokenAddress`/validity call each against `0x2f0750Bbb0A246059d80e94c454586a7F27a128e`.

**Misc**
19. Mainnet gaps: relayer URL, InputVerifier/DecryptionOracle addresses not published on fetched pages (mainnet keys via Google-form application). ➜ SDK network presets / Zama support when going mainnet — irrelevant for the Sepolia submission.
20. SDK v3 `cleartext()` relayer against the hardhat-plugin mock node (needs `CleartextFHEVMExecutor`) — compatibility untested. ➜ experiment, or just use `hre.fhevm` mock helpers for local tests.
21. Exact v3 permit EIP-712 struct internals (SDK abstracts them; matters only for smart-contract wallets — `skipBalanceCheck: true` exists).
22. `hre.fhevm.publicDecrypt` against real Sepolia (`--network sepolia`) — assumed to work like the mock API, untested; budget generous timeouts.
23. `decryptionProof` byte layout (KMS signature framing) — opaque; treat as bytes produced by the SDK.
24. Sepolia ETH for gas: no Zama faucet — use third-party faucets.
25. `makePubliclyDecryptable` return type discrepancy (oracle.md: void; functions.md: `returns (T)`). ➜ check `@fhevm/solidity` source; examples ignore any return.
26. The Sepolia `DECRYPTION_ADDRESS` (`0x5D8BD…7478`) exists in the address table, but current contracts never reference it directly under the post-v0.9 flow — informational only.

*(Resolved-during-gathering items — e.g. ERC-7984 draft status, clamping semantics, operator expiry semantics, mock mint availability — are recorded in the per-topic `questions-*.md` files under "Resolved" and incorporated into 01–07.)*
