# Open questions — ERC-7984 (after ?ask= queries, 2026-07-03)

Ask dumps live in `zama-docs/_raw/erc7984/ask-*.md`. Resolved items noted for completeness.

## Unresolved (verify before/while building)

1. **Which exact `@openzeppelin/confidential-contracts` version are the deployed Sepolia mock wrappers (cUSDCMock/cWETHMock) built on?** ?ask response (`ask-mocks-operator.md`): "I cannot find information about the exact version used to build the Sepolia mock wrappers in the docs available to me." Matters because v0.5.0 removed the `ERC7984ZeroBalance` revert that the deployed-wrapper docs still list. → Verify on Sepolia Etherscan (verified source of `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` / its implementation, since it is a UUPS proxy) or with a testnet probe tx from a fresh account.
2. **Does cUSDCMock revert `ERC7984ZeroBalance` when `from` never held tokens?** Deployed-wrapper docs say yes ("Accounts with a zero balance that have never held tokens cannot be the `from` address"); library v0.5.1 clamps to 0 instead. A lending pool's first-deposit path must tolerate BOTH (e.g., don't assume a probe transfer from a fresh user reverts or succeeds). Empirical check recommended.
3. **Operator scope for unshield:** SDK guide (`operator-approvals.md` §6) says transfer approval "does not automatically allow them to unshield" — but on-chain, wrapper `_unwrap` uses the same `isOperator(from, msg.sender)` check as transfers (repo `ERC7984ERC20Wrapper.sol`). Is the SDK describing an extra product-level approval, a different deployed-wrapper check, or just UX guidance? → If the pool must unwrap on users' behalf, test `unwrap(user, user, ...)` as operator on Sepolia.
4. **Deployed wrapper ACL details:** does the (upgradeable) ConfidentialWrapper's `confidentialTransferFrom` grant the same ACL set as OZ v0.5.1 (`FHE.allow` persistent to `from`/`to`, `allowTransient` to caller)? Docs describe transient-to-caller for the `AndCall` variants only. Our pool design (pool == `to`) is safe under v0.4+ semantics, but confirm the pool can `FHE.add` the returned handle in-tx on the REAL cUSDCMock.
5. **Underlying mock decimals / `rate()` values on Sepolia:** the addresses page doesn't state decimals of USDC/WETH mocks. Assume USDC mock = 6 (rate 1) and WETH mock = 18 (rate 10^12) like mainnet, but read `wrapper.decimals()` and `wrapper.rate()` on-chain before hardcoding conversions.
6. **Registry state on Sepolia:** confirm cUSDCMock/cWETHMock are registered AND `isValid == true` in the Sepolia registry `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` (registry docs warn wrappers can be revoked). One `getConfidentialTokenAddress(underlying)` call each.
7. **Programmatic `decryptionProof` for `finalizeUnwrap` / `discloseEncryptedAmount` from a backend (no browser):** the fetched pages defer to the SDK/relayer public-decryption flow ("must be publicly decrypted to get the `unwrapAmountCleartext` along its `decryptionProof`") without a contract-callable alternative. Covered by relayer-SDK docs (see decryption doc set in `zama-docs/_raw/decryption/` if present); confirm exact `publicDecrypt`/proof format for `FHE.checkSignatures` against `@fhevm/solidity 0.11.1`.
8. **Gas/HCU cost of `confidentialTransferFrom` + `FHE.add` accounting on Sepolia:** not stated in any fetched page; measure empirically (affects whether deposit+accounting fits comfortably in one tx).

## Resolved (for the record)

- **ERC-7984 status:** DRAFT — official EIP page citation block: "ERC-7984: Confidential Fungible Token [DRAFT]" (`_raw/erc7984/eip-7984-page.html`). Zama docs themselves don't state a status (`ask-erc7984-status.md`).
- **Clamping:** on-chain transfers never revert for insufficient balance; they transfer encrypted 0 (all-or-nothing). Returned handle = actual transferred amount (`ask-clamping.md` + repo `_update`/`FHESafeMath`).
- **ACL on returned handle:** transient for the operator-caller, persistent for `from`/`to`/token; pool must `FHE.allowThis` any derived stored handle (`ask-acl-returned-handle.md` + repo code).
- **Mocks support the operator flow:** cUSDCMock/cWETHMock are standard confidential wrappers with `setOperator` + `confidentialTransferFrom` (`ask-mocks-operator.md`).
- **Operator expiry type/semantics:** `uint48` unix seconds, inclusive (`block.timestamp <= until`), holder always own operator (repo `ERC7984.sol`).
