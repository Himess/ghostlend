# What ACL prerequisites must be satisfied before FHE.makePubliclyDecryptable can be called on a handle? Does the contract need FHE.allowThis first, can it be called on a handle the contract just computed in the same transaction, and does anything need FHE.allow to an oracle address?

## ACL prerequisites for `FHE.makePubliclyDecryptable`

Before you call `FHE.makePubliclyDecryptable(handle)`, these conditions must be true:

1. **The ciphertext handle is initialized**
   * In the public decryption tutorial, the contract only calls the public-decryption step after encrypted values are initialized (it gates the call with `FHE.isInitialized(...)`). See the [`Public Decryption`](/protocol/solidity-guides/smart-contract/oracle.md) workflow example.
2. **The&#x20;*****calling contract*****&#x20;already has ACL permission to access that handle**
   * `makePubliclyDecryptable` marks the handle “globally and permanently” publicly decryptable, but **the docs explicitly require ACL permission for the calling contract to access the handle in the first place** (see [`FHEVM API reference` → “Make publicly decryptable”](/protocol/solidity-guides/smart-contract/functions.md)).
   * Practically, this is typically satisfied by granting the handle to the current contract (e.g. via `FHE.allowThis(handle)`).

## Your specific questions

* **“Does the contract need `FHE.allowThis` first?”**
  * The requirement is **ACL access for the calling contract**. If your contract has not been granted access to that handle, you must grant it (commonly with `FHE.allowThis`), otherwise the precondition isn’t met.
* **“Can it be called on a handle the contract computed in the same transaction?”**
  * The docs don’t state that “same-transaction computation” automatically implies ACL permission. What matters is that the **calling contract has ACL permission** when you call `makePubliclyDecryptable`.
* **“Does anything need `FHE.allow` to an oracle address?”**
  * No. Once `makePubliclyDecryptable` is called, it authorizes **any entity** to request off-chain decryption via the relayer/KMS (no per-oracle `allow` is described in the public decryption docs).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Is ACL check required before public decrypt?](https://docs.zama.org/protocol?ask=Is%20ACL%20check%20required%20before%20public%20decrypt%3F&goal=Set%20up%20ACL%20permissions%20correctly%20for%20public%20decryption%20of%20computed%20aggregates)
- [What exact ACL call enables public decrypt?](https://docs.zama.org/protocol?ask=What%20exact%20ACL%20call%20enables%20public%20decrypt%3F&goal=Set%20up%20ACL%20permissions%20correctly%20for%20public%20decryption%20of%20computed%20aggregates)
- [How to test publicly decryptable state safely?](https://docs.zama.org/protocol?ask=How%20to%20test%20publicly%20decryptable%20state%20safely%3F&goal=Set%20up%20ACL%20permissions%20correctly%20for%20public%20decryption%20of%20computed%20aggregates)

# Sources:

- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [Coprocessor](https://docs.zama.org/protocol/protocol/overview/coprocessor.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md)
- [Event decoders](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/event-decoders.md)

