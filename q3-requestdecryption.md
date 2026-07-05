# Does FHE.requestDecryption with an on-chain oracle callback still exist in the current FHEVM version, or has it been fully replaced by FHE.makePubliclyDecryptable plus off-chain publicDecrypt plus FHE.checkSignatures? What happened to the DecryptionOracle contract and the requestDecryption request id?

## Short answer

In the current FHEVM developer flow, the **on-chain oracle callback model via `FHE.requestDecryption` is deprecated**. Starting from **FHEVM v0.9**, the methods **`FHE.requestDecryption` and `FHE.setDecryptionOracle` are deprecated and must be removed**, and you should migrate to the **public decryption flow** instead:

* `FHE.makePubliclyDecryptable` (on-chain)
* `publicDecrypt` (off-chain via the Zama relayer/KMS)
* `FHE.checkSignatures` (on-chain verification)

See:

* [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)
* [Zama Protocol Change Log — FHEVM v0.9 breaking changes](/protocol/changelog/zama-protocol-change-log.md)

## What replaced it

The docs describe an asynchronous 3-step **public decryption** process:

1. **On-chain:** call `FHE.makePubliclyDecryptable(handle)` to permanently mark the ciphertext handle as publicly decryptable.
2. **Off-chain:** call `publicDecrypt(handles)` to get:
   * clear values
   * an `decryptionProof`
3. **On-chain:** call `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` to verify authenticity.

## What happened to `DecryptionOracle` and the `requestDecryption` request id?

The old oracle/callback API centered around `FHE.setDecryptionOracle` and a callback signature that included a `requestID` (from earlier versions). In **v0.9+, those entry points are deprecated and must be removed**, so the **`DecryptionOracle`/`requestID` mechanism is no longer the supported workflow**.

In the current flow, contracts don’t use a `requestDecryption` id; they instead rely on the **KMS-bound `decryptionProof`** verified by `FHE.checkSignatures`.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What changed for on-chain decryption flow?](https://docs.zama.org/protocol?ask=What%20changed%20for%20on-chain%20decryption%20flow%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20oracle%20callback%20model)
- [How to migrate old DecryptionOracle usage?](https://docs.zama.org/protocol?ask=How%20to%20migrate%20old%20DecryptionOracle%20usage%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20oracle%20callback%20model)
- [Where to find example of checkSignatures usage?](https://docs.zama.org/protocol?ask=Where%20to%20find%20example%20of%20checkSignatures%20usage%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20oracle%20callback%20model)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Chains](https://docs.zama.org/protocol/protocol-apps/chains.md)
- [Network presets](https://docs.zama.org/protocol/sdk/api-references/sdk/network-presets.md)
- [Node.js backend](https://docs.zama.org/protocol/sdk/guides/node-js-backend.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Configuration](https://docs.zama.org/protocol/sdk/alpha/guides/configuration.md)
- [Zama Protocol Change Log](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- [ZamaSDK](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [Gateway](https://docs.zama.org/protocol/protocol/overview/gateway.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [useFinalizeUnwrap](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usefinalizeunwrap.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [useDelegateDecryption](https://docs.zama.org/protocol/sdk/api-references/react/usedelegatedecryption.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/alpha/guides/delegated-decryption.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/guides/delegated-decryption.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)

