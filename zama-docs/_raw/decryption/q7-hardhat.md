# How is public decryption simulated in Hardhat mock mode? Does hre.fhevm.publicDecrypt produce a valid decryption proof that FHE.checkSignatures accepts in the mock environment, and is there an awaitDecryptionOracle helper? How is userDecrypt simulated?

## Public decryption in Hardhat mock mode

In **mock** mode (`hre.fhevm.isMock`), you still follow the real 3-step public-decryption flow:

1. **On-chain:** mark ciphertext handles publicly decryptable with `FHE.makePubliclyDecryptable`.
2. **Off-chain (simulated in tests):** call `hre.fhevm.publicDecrypt(handles)` to get:
   * ordered `clearValues`
   * `abiEncodedClearValues`
   * `decryptionProof`
3. **On-chain verification:** pass `(handlesList, abiEncodedClearValues, decryptionProof)` into a contract that calls `FHE.checkSignatures`.

The `HeadsOrTails` Hardhat example runs this end-to-end under `hre.fhevm.isMock`, and `contract.recordAndVerifyWinner(...)` calls `FHE.checkSignatures` successfully using the proof returned by `fhevm.publicDecrypt`. It also has negative tests proving invalid/forged proofs revert. See:

* [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)
* [Public Decrypt single value (HeadsOrTails.ts)](/protocol/examples/basic/decryption/heads-or-tails.md)

### `awaitDecryptionOracle` helper

I cannot find any `awaitDecryptionOracle` helper mentioned in the docs.

## User decryption simulation

User decryption is done with the Hardhat plugin helpers on the test side:

* **Single value:** `hre.fhevm.userDecryptEuint(FhevmType.euint32, encryptedHandle, contractAddress, userSigner)` returns the clear value.\
  See \[User decrypt single value]\(/spaces/X08b6UDQsduF6eJZjCJy/pages/ DyKiuoCy31ySVKzDTlGd).
* **Multiple values:** generate a keypair, build an EIP-712 payload, sign it, then call `hre.fhevm.userDecrypt([...], privateKey, publicKey, signature, ...)` to get decrypted results.\
  See [User decrypt multiple values](/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Does mock mode produce real proofs?](https://docs.zama.org/protocol?ask=Does%20mock%20mode%20produce%20real%20proofs%3F&goal=Write%20Hardhat%20tests%20for%20a%20lending%20protocol%20that%20finalizes%20epochs%20with%20FHE.checkSignatures)
- [How to mock publicDecrypt results?](https://docs.zama.org/protocol?ask=How%20to%20mock%20publicDecrypt%20results%3F&goal=Write%20Hardhat%20tests%20for%20a%20lending%20protocol%20that%20finalizes%20epochs%20with%20FHE.checkSignatures)
- [Can I test multiple handles in one call?](https://docs.zama.org/protocol?ask=Can%20I%20test%20multiple%20handles%20in%20one%20call%3F&goal=Write%20Hardhat%20tests%20for%20a%20lending%20protocol%20that%20finalizes%20epochs%20with%20FHE.checkSignatures)

# Sources:

- [Write FHEVM tests in Hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Hardhat plugin](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md)
- [Write FHEVM-enabled Hardhat Tasks](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md)
- [Deploy contracts and run tests](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)

