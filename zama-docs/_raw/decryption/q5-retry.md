# What happens if a public decryption is never fulfilled, for example the relayer is down or publicDecrypt fails? Can the same handle be decrypted again later, does makePubliclyDecryptable expire, and is any retry or refund mechanism needed on-chain?

If the off-chain public decryption is never fulfilled (e.g., the relayer is down or `publicDecrypt` fails), **nothing in the on-chain authorization needs to “expire”** first.

## Handle decryption after a failure

* `FHE.makePubliclyDecryptable` marks the ciphertext handle as publicly decryptable **globally and permanently**. That permanently authorizes any entity to request its off-chain cleartext value later.\
  Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md) (“globally and permanently”)
* `publicDecrypt` is the off-chain step that returns the cleartext plus a `decryptionProof`.
* The on-chain step `FHE.checkSignatures(...)` **reverts** if the proof is invalid or doesn’t match the `(handlesList, abiEncodedCleartexts)` pair.\
  Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)

So **the same handle can be requested and decrypted again later**, as long as you still know the handle(s) and use the same handle order when verifying.

## Does `makePubliclyDecryptable` expire?

* No. The docs describe it as **globally and permanently** authorizing public decryption.\
  Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)

## On-chain retry / refund mechanism

* I cannot find information about any **on-chain retry or refund** mechanism specifically for “public decryption never fulfilled”.
* What’s documented is your contract-side finalization pattern: only set “finalized” after `FHE.checkSignatures` succeeds, and otherwise let the call revert.\
  Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md) (example uses `require(!_isFinalized, ...)` and calls `FHE.checkSignatures` before flipping state)

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Do handles ever expire on-chain?](https://docs.zama.org/protocol?ask=Do%20handles%20ever%20expire%20on-chain%3F&goal=Design%20failure%20handling%20for%20epoch%20decryption%20in%20a%20lending%20protocol)
- [Can I retry decryption after a failure?](https://docs.zama.org/protocol?ask=Can%20I%20retry%20decryption%20after%20a%20failure%3F&goal=Design%20failure%20handling%20for%20epoch%20decryption%20in%20a%20lending%20protocol)
- [What happens if the relayer is down for publicDecrypt?](https://docs.zama.org/protocol?ask=What%20happens%20if%20the%20relayer%20is%20down%20for%20publicDecrypt%3F&goal=Design%20failure%20handling%20for%20epoch%20decryption%20in%20a%20lending%20protocol)

# Sources:

- [RelayerCleartext](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/relayercleartext.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Local development](https://docs.zama.org/protocol/sdk/guides/local-development.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Relayer API keys](https://docs.zama.org/protocol/sdk/alpha/guides/relayer-api-keys.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [Security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Public Decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md)
- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/guides/delegated-decryption.md)
- [Delegated decryption](https://docs.zama.org/protocol/sdk/alpha/guides/delegated-decryption.md)
- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [Chains](https://docs.zama.org/protocol/protocol-apps/chains.md)
- [Tutorial](https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [useDelegateDecryption](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedelegatedecryption.md)
- [Delegations](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/delegation.md)
- [Permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md)
- [Permit model](https://docs.zama.org/protocol/sdk/alpha/concepts/permit-model.md)
- [Errors](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/errors.md)
- [Authentication](https://docs.zama.org/protocol/sdk/alpha/guides/authentication.md)
- [ZamaSDK](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)

