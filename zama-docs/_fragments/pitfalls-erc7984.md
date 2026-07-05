# Pitfalls — ERC-7984 / OZ confidential-contracts / Zama wrapper (fetched 2026-07-03)

One bullet per warning/limitation, each with its source. Repo = `_repos/openzeppelin-confidential-contracts` @ `0befb23` (v0.5.1). Docs = `zama-docs/_raw/erc7984/*`.

## Clamping / no-revert semantics (accounting correctness)

- Transfers with insufficient balance DO NOT revert: `_update` computes `transferred = FHE.select(success, amount, FHE.asEuint64(0))` — the tx succeeds and moves encrypted 0 (all-or-nothing; never partial). A pool MUST account with the returned `transferred` handle, never the requested amount. — repo `contracts/token/ERC7984/ERC7984.sol` `_update` + `contracts/utils/FHESafeMath.sol` `tryDecrease`.
- README (verbatim): "Developing contracts for confidentiality requires extreme care--many functions do not revert on failure as they would in normal contracts." — repo `README.md`.
- Since v0.5.0 the library also no longer reverts when the sender has an UNINITIALIZED balance (CHANGELOG verbatim: "Remove revert on transfer where the sender has an uninitialized balance"), BUT Zama's deployed ConfidentialWrapper (incl. Sepolia cToken mocks) still documents revert `ERC7984ZeroBalance(holder)`: "Accounts with a zero balance that have never held tokens cannot be the `from` address in confidential transfers" (and in unwrap requests). Handle BOTH behaviors. — repo `CHANGELOG.md` 0.5.0; docs `confidential-wrapper.md`.
- Zama's ERC7984 tutorial test still expects `ERC7984ZeroBalance` from the library — outdated vs v0.5.1; trust repo code. — docs `erc7984.md` test tab.
- Mint clamps too: `tryIncrease` on total-supply overflow makes mint succeed while minting 0 (base contract). Only the ERC-20 wrapper adds a hard revert `ERC7984TotalSupplyOverflow()` via `_checkConfidentialTotalSupply` (and that check "may revert even if the confidentialTotalSupply did not overflow" — inflatable by direct underlying transfers to the wrapper). — repo `ERC7984.sol`, `ERC7984ERC20Wrapper.sol`.
- Operators cannot pre-check success: "Operators do not have allowance to reencrypt/decrypt balance handles for other addresses. This means that operators cannot transfer full balances and can only know success after a transaction (by decrypting the transferred amount)." — repo `docs/modules/ROOT/pages/token.adoc`.

## Operator security / expiry

- "Setting an operator for any amount of time allows the operator to _**take all of your tokens**_. Carefully vet all potential operators before giving operator approval." (unlimited-amount approval; only time-bounded) — repo `docs/modules/ROOT/pages/token.adoc`.
- Expiry is a `uint48` unix-seconds timestamp, INCLUSIVE comparison: `isOperator` = `holder == spender || block.timestamp <= _operators[holder][spender]`. A pool pulling at exactly `until` still succeeds; a pull one second later reverts `ERC7984UnauthorizedSpender`. — repo `ERC7984.sol`.
- `isOperator(holder, holder)` is always true (self is operator). — repo `ERC7984.sol`.
- SDK `setOperator` defaults to only 1 hour of validity — pools relying on longer windows must pass an explicit `until`. — docs `sdk-token.md`, `operator-approvals.md`.
- SDK guide claims transfer approval and unshield approval are "a distinct concern ... approving an operator for transfers does not automatically allow them to unshield" — on-chain both use the same `isOperator`, so treat this as product-flow guidance and verify. — docs `operator-approvals.md` §6 (UNCERTAIN).
- `OperatorSet(holder, operator, until)` is a public event — reveals user→pool authorization graph and timing. — repo `IERC7984.sol`.

## ACL on transferred handles

- The operator/caller of `confidentialTransferFrom` gets only `FHE.allowTransient(transferred, msg.sender)` — usable ONLY in the same transaction. Persistent access exists only for `from`, `to`, and the token contract (`FHE.allow`/`allowThis` inside `_update`). A pool receiving deposits is `to`, so it can use `transferred` in-tx; any derived handle it stores (e.g. updated deposit balance) needs `FHE.allowThis(...)` (+ `FHE.allow(..., user)` for user decryption). — repo `ERC7984.sol`; docs ask dump `ask-acl-returned-handle.md`.
- The euint64 (no-proof) overloads require the CALLER to be ACL-allowed on the amount handle (`FHE.isAllowed(amount, msg.sender)`), and the TOKEN must also be allowed to use it — a calling contract must `FHE.allowTransient(amount, address(token))` before `confidentialTransferFrom(user, pool, amount)`. Forgetting either reverts (`ERC7984UnauthorizedUseOfEncryptedAmount`) or fails ACL checks. — repo `ERC7984.sol` + `SwapERC7984ToERC7984.sol` / `SwapERC7984ToERC20.sol` pattern.
- Input proofs bind to (contract, user): encrypt with `createEncryptedInput(poolAddress, userAddress)` when the POOL calls `FHE.fromExternal`, or `createEncryptedInput(tokenAddress, userAddress)` when calling the token's externalEuint64 overload directly. Wrong binding = proof verification failure. — docs `erc7984.md` test code; Zama SDK encrypt-decrypt guide.

## Callback (transfer-and-call) hazards

- Refund is BEST-EFFORT: "A receiver that transfers, burns, or otherwise reduces its balance during the hook can still return false, in which case the refund transfers zero tokens. The sender's tokens end up with the recipient rather than being refunded." — repo `ERC7984.sol` `_transferAndCall` natspec; also docs `confidential-wrapper.md`.
- "Refunds are subject to the same validation flow as a normal transfer--they may fail ... In these cases, the tokens do not return to the sender." — repo `ERC7984.sol`.
- "Do not manually refund the transfer AND return false, as this can lead to double refunds." — repo `IERC7984Receiver.sol`.
- Balances are updated BEFORE the receiver callback runs (external call mid-flow) — classic reentrancy surface; repo ships `ERC7984ReentrantMock` for testing. The returned net `transferred` is transient-only for `msg.sender` and "generally intended to be processed only in the same transaction". — repo `ERC7984.sol`, `contracts/mocks/token/ERC7984/ERC7984ReentrantMock.sol`.
- Receiver contract must return an `ebool` the TOKEN can read ("The calling contract (token) must be granted ACL allowance to read the confidential return value") — grant e.g. `FHE.allowTransient(result, msg.sender)` inside `onConfidentialTransferReceived`. — repo `IERC7984Receiver.sol`.
- Contract recipients that don't implement `IERC7984Receiver` make `...AndCall` revert (`ERC7984InvalidReceiver`); plain transfers to them succeed and can strand funds (no code check on plain transfer). — repo `ERC7984Utils.sol`.

## Wrapper rounding / decimals / supply bound

- euint64 bound: max total supply = `type(uint64).max` (~1.84e19 base units). With 6 decimals that is ~1.8e13 whole tokens; wrapper caps decimals at `_maxDecimals() = 6` precisely because of this. 18-decimal underlyings get `rate = 10^12`: amounts below 10^-6 of a token are unrepresentable. — repo `ERC7984ERC20Wrapper.sol`; docs `confidential-wrapper.md` ("Maximum number of decimals ... currently set to 6 decimals only", "maximum total supply ... `type(uint64).max`").
- Wrap rounds DOWN to the nearest multiple of `rate()`; excess is refunded (ERC-1363 path) or simply not pulled (`wrap()` path). "If the amount is less than the rate, the wrapping will succeed but the recipient will receive 0 confidential tokens." Beware dust: wrapping 1.5e12 wei of an 18-dec token yields 1 unit, leaving 0.5e12 behind. — repo `wrap()`/`onTransferReceived()`; docs `confidential-wrapper.md`.
- Unwrap is a TWO-STEP async flow: `unwrap` burns immediately and moves NO underlying; underlying is paid only on `finalizeUnwrap(unwrapRequestId, cleartext, decryptionProof)` after public decryption. UX/contracts must persist `unwrapRequestId` (SDK `resumeUnshield` exists for interrupted flows). — repo `ERC7984ERC20Wrapper.sol`; docs `confidential-wrapper.md`, `sdk-wrappedtoken.md`.
- `finalizeUnwrap` publicly reveals the unwrapped CLEARTEXT amount (event `UnwrapFinalized(..., uint64 cleartextAmount)`); unwrap privacy is only pre-finalization. — repo `IERC7984ERC20Wrapper.sol`.
- Unwrap request id IS the burned-amount ciphertext handle; code WARNING: "Directly using the cipher-text as the unwrap request id assumes that cipher-texts are unique--this holds here but is not always true. Be cautious when assuming cipher-text uniqueness." Same caveat applies to any pool that keys mappings by returned handles (e.g. `SwapERC7984ToERC20._receivers[amountTransferred]`). — repo `ERC7984ERC20Wrapper.sol` `_unwrap`; docs `confidential-wrapper.md` "Ciphertext uniqueness assumption".
- Unwrap from an insufficient balance burns 0 and creates a request that finalizes to a 0 payout (clamping propagates into unwrap). — repo `_unwrap` → `_burn` → `_update`.
- Non-standard underlying tokens are NOT supported by the wrapper: fee-on-transfer/deflationary (undercollateralization), rebasing-up (yield accrues to wrapper, not holders — "Shielded ... staking shares do not earn rewards"), rebasing-down (undercollateralization), multiple-entry-point tokens (double-wrap), ERC-777 hooks (reentrancy), pausable/blocklist underlyings can freeze wrap/unwrap (USDC/USDT), flash-mintable can distort `inferredTotalSupply()`. — repo `ERC7984ERC20Wrapper.sol` natspec; docs `confidential-wrapper.md` "Non-standard token types" table.
- `inferredTotalSupply()` "can be inflated by directly sending underlying tokens to the wrapper contract" and lags `confidentialTotalSupply` between unwrap and finalize — don't use it for strict solvency checks. — repo `ERC7984ERC20Wrapper.sol`.
- `wrap()` return handle is only `FHE.allowTransient(..., msg.sender)` — same-tx use only. — repo `ERC7984ERC20Wrapper.sol`.

## Deployment / integration

- Every FHE contract must inherit a coprocessor config (`ZamaEthereumConfig` for Ethereum mainnet AND Sepolia) or all FHE ops fail. — repo `README.md`; docs `erc7984.md`.
- Base `ERC7984.decimals()` is hard-coded 6; the wrapper overrides to min(underlying, 6). UI amounts for cUSDC (6) map 1:1, cWETH (18→6) divide by 10^12. — repo `ERC7984.sol`, `ERC7984ERC20Wrapper.sol`.
- Zama's deployed wrappers/registry are UUPS UPGRADEABLE and DAO-owned — behavior (e.g. ZeroBalance revert) can change under your protocol; registry entries can be REVOKED ("Always verify the `isValid` flag"). — docs `confidential-wrapper.md`, `wrapper-registry.md`.
- Library stability: "the code is not formally audited and not covered by the bug bounty program on Immunefi. Similarly, the code has no backward compatibility guarantees." (while README says npm installs "the latest audited release" and `audits/` holds six per-release PDFs incl. `2026-06-v0.5.pdf`) — repo `docs/modules/ROOT/pages/index.adoc` vs `README.md`.
- ERC-7984 itself is still a DRAFT ERC (eips.ethereum.org citation: "[DRAFT]") — interface may change; pin library version 0.5.1. — `_raw/erc7984/eip-7984-page.html`.
- Peer dep is an EXACT pin `@fhevm/solidity: 0.11.1` — mismatched fhevm-solidity versions in the host project can break compilation/handles. — `npm view @openzeppelin/confidential-contracts peerDependencies`.
- Privacy leaks by design: `Wrap.roundedAmount` (cleartext wrap size on deployed wrapper), `UnwrapFinalized.cleartextAmount`, `AmountDisclosed.amount`, public `from`/`to` on every `ConfidentialTransfer`, and `_transferAndCall` emitting sent+refund as two events. — repo `IERC7984*.sol`; docs `sdk-event-decoders.md`, `confidential-wrapper.md`.
