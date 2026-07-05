# In mock mode how do I test the asynchronous public decryption flow with FHE.checkSignatures? Does fhevm.publicDecrypt return a decryptionProof that works in a local hardhat mock test? Is awaitDecryptionOracle still available?

## Testing public decryption (mock mode) with `FHE.checkSignatures`

Use the same 3-step flow:

1. **On-chain:** mark ciphertext handles as publicly decryptable with `FHE.makePubliclyDecryptable`.
2. **Off-chain (simulated in tests):** call `fhevm.publicDecrypt([handle1, handle2, ...])`.
3. **On-chain:** submit clear values + the returned proof to your callback that calls `FHE.checkSignatures`.

The docs’ Hardhat mock test example (`hre.fhevm.isMock`) does exactly this: it calls `const publicDecryptResults = await fhevm.publicDecrypt([encryptedBool]);`, then forwards:

* `publicDecryptResults.abiEncodedClearValues`
* `publicDecryptResults.decryptionProof`

to a contract function that runs `FHE.checkSignatures(...)`, and the test asserts success/failure based on the proof. See:

* [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)
* [Public Decrypt single value](/protocol/examples/basic/decryption/heads-or-tails.md)

### Does `fhevm.publicDecrypt` return a `decryptionProof` that works locally?

**Yes.** In the mock Hardhat test, `publicDecryptResults.decryptionProof` is accepted by `FHE.checkSignatures` on-chain and causes the transaction to revert if the proof is invalid.

### Important ordering detail

`FHE.checkSignatures` requires the **handles order** to match the **proof/ABI-encoded clear values order**. A proof computed for `[A, B]` won’t verify for `[B, A]`. ([Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md))

## `awaitDecryptionOracle`

I cannot find information about `awaitDecryptionOracle` in the docs available here.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What if proof fails in mock mode?](https://docs.zama.org/protocol?ask=What%20if%20proof%20fails%20in%20mock%20mode%3F&goal=Test%20a%20confidential%20lending%20protocol%20liquidation%20callback%20locally)
- [How to reorder proofs for multiple handles?](https://docs.zama.org/protocol?ask=How%20to%20reorder%20proofs%20for%20multiple%20handles%3F&goal=Test%20a%20confidential%20lending%20protocol%20liquidation%20callback%20locally)
- [Can I test replay protection with mock proof?](https://docs.zama.org/protocol?ask=Can%20I%20test%20replay%20protection%20with%20mock%20proof%3F&goal=Test%20a%20confidential%20lending%20protocol%20liquidation%20callback%20locally)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [How to Transform Your Smart Contract into a FHEVM Smart Contract?](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md)
- [Public Decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md)
- [Deploy contracts and run tests](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md)
- [Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md)
- [RelayerCleartext](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/relayercleartext.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)

