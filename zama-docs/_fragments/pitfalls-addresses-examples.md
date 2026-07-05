# Pitfalls & warnings — addresses + examples pass (2026-07-03)

One bullet per finding, with source URL.

## ACL / decryption

- Forgetting `FHE.allowThis(handle)` (contract permission) breaks user decryption even when `FHE.allow(handle, user)` was called — BOTH grants are required on every updated handle; the docs ship a deliberately-wrong `initializeUint32Wrong` variant proving it. — https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md
- Result handles from FHE ops get only EPHEMERAL contract permission that dies at function exit; persist with `FHE.allowThis`/`FHE.allow` before returning. — https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md
- Public decryption is a two-step verify flow: `FHE.makePubliclyDecryptable` on-chain → relayer `publicDecrypt` off-chain → `FHE.checkSignatures(cts, abiEncodedClearValues, decryptionProof)` on-chain; forged proofs/cleartexts/cross-request results revert with `KMSInvalidSigner`. — https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md
- With multiple decrypted values, the `bytes32[] cts` handle order MUST match the ABI-encoding order of the clear values or `FHE.checkSignatures` reverts (demonstrated with a wrong-order test). — https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md
- `FHE.requestDecryption` and `FHE.setDecryptionOracle` are DEPRECATED since FHEVM v0.9 and "must be removed" — use the relayer-based decryption flow shown in current examples; older tutorials using the oracle-callback style are stale. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md
- (v0.8 note, still relevant to ports) The oracle callback signature was changed to `callbackExample(uint256 requestID, bytes cleartexts, bytes decryptionProof)` per ERC-7995. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md

## Encrypted inputs

- Encrypted inputs are cryptographically bound to a (contractAddress, userAddress) pair — sending the tx from a different signer than the one the input was encrypted for fails input verification (classic pitfall, shown in the failing test). — https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md
- Since v0.12, `FHE.fromExternal` returns a trivial-encrypt of `0` for uninitialized handles instead of reverting. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md

## Confidential tokens / wrapper (cUSDCMock, cWETHMock, ...)

- `confidentialTransferFrom` does NOT revert on insufficient balance — it silently transfers 0; always measure `balanceBefore`/`balanceAfter` and compute `sentBalance = FHE.sub(after, before)` (BlindAuction does this). — https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md
- Never gate logic with reverts on encrypted conditions (leaks information); use `FHE.select` branching instead. — https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md
- Confidential wrappers are capped at **6 decimals** (`_maxDecimals()`), balances are euint64, and max total supply is `type(uint64).max`; wrapping rounds DOWN to the nearest `rate()` multiple and refunds the excess; amounts below `rate()` wrap to 0 tokens (tx still succeeds). — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- Accounts with a zero balance that never held tokens cannot be the `from` in confidential transfers or unwrap requests (`ERC7984ZeroBalance`). — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- Unwrap is a two-step async process (`unwrap` burns immediately; underlying is only sent on `finalizeUnwrap` after public decryption) — funds are in limbo between the steps. — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- `confidentialTransferAndCall` refund on callback-`false` is BEST-EFFORT only — a malicious receiver can drain its balance in the callback and still return false, leaving the sender unrefunded; the returned `transferred` ciphertext carries only a TRANSIENT allowance for `msg.sender`. — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- The official wrapper's unwrap mapping assumes ciphertext handles are unique — the docs explicitly warn this is "NOT true in the general case"; don't blindly copy the handle-keyed-mapping pattern (the SwapERC7984ToERC20 example uses the same pattern). — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- Non-standard underlying tokens are UNSUPPORTED by the wrapper: fee-on-transfer, deflationary, rebasing (up/down), multiple-entry-point, ERC-777 hook tokens (undercollateralization/reentrancy risks); pausable/blocklist tokens (USDC!) can freeze wrap/unwrap. — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md
- Always check the registry `isValid` flag — a non-zero wrapper address may have been REVOKED; revocation is permanent and the token can never be re-registered with a new wrapper. — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry.md
- Sepolia mock caveats: underlying mock `mint(address,uint256)` is public but limited to **1,000,000 tokens per call**; the ZAMA (Mock) underlying is NOT the real Sepolia ZAMA token; non-mocked `ctGBP` has RESTRICTED minting. — https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md
- Wrapping Zama operator-staking shares forfeits staking rewards while shielded (rewards accrue to the wrapper contract). — https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md

## HCU / performance

- v0.12 introduced the `HCULimit` contract with per-block, per-transaction, AND per-transaction-depth Homomorphic Compute Unit limits (Sepolia: `HCU_LIMIT_CONTRACT = 0xa10998783c8CF88D886Bc30307e631D6686F0A22`) — heavy FHE loops (e.g., iterating all borrowers) can exceed per-tx HCU caps. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md
- Encrypted type width drives FHE cost — "choose wisely your number representation"; euint64 is recommended for token balances (don't default to euint256). — https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md

## Environment / versioning

- ALL official example test suites throw unless running in the FHEVM Hardhat mock (`if (!hre.fhevm.isMock) throw new Error("This hardhat test suite cannot run on Sepolia Testnet")`) — Sepolia testing needs separate deploy scripts/tasks, not these tests. — https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md (same guard in all example .ts files)
- Version skew: Testnet runs FHEVM v0.13 while Mainnet runs v0.11 — code relying on v0.12/v0.13 features (HCU limits, `FHE.sum`/`FHE.isIn`, all-contracts delegation sentinel `0xffff...ffff`, `FHE.isPublicDecryptionResultValid`) works on Sepolia but NOT yet on mainnet. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md
- v0.12 breaking changes when upgrading older code: MultichainACL contracts deleted; new handle format (`FHE_comp` domain separator + prev blockhash/timestamp); `isUserDecryptionReady` signature changed; `ECDSA.sol` → `FhevmECDSA.sol` import rename; ACL error `ExpirationDateBeforeOneHour` → `ExpirationDateInThePast`. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md
- SDK churn: current examples import `@zama-fhe/relayer-sdk` (and `@fhevm/hardhat-plugin` / `@fhevm/mock-utils`), but v0.13 announces a NEW `@fhevm/sdk` npm package as "a major refactor of the relayer SDK" — check which package the current template pins before copying imports. — https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md
- Current examples inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` (auto-resolves addresses via `block.chainid` for BOTH mainnet and Sepolia); older docs/templates use `SepoliaConfig` — don't mix. — https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md
- Relayer auth: Sepolia relayer (`https://relayer.testnet.zama.org`) is open/no API key; the Zama-hosted MAINNET relayer requires an API key. (?ask response) — https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md?ask=...
- Example-code quirks to not copy blindly: `EncryptMultipleValues.ts` starts with a stray `//TODO;` line; `HeadsOrTails`/`HighestDieRoll` event-parsing helpers are marked "not production-ready"; FHECounter "omits overflow/underflow checks". — https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-multiple-values.md
