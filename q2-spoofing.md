# Can any address submit the cleartext and decryption proof to the contract function that calls FHE.checkSignatures, and what prevents an attacker from submitting spoofed cleartext values?

Yes. When the contract marks a ciphertext handle as **publicly decryptable** via `FHE.makePubliclyDecryptable`, **any entity** can request the off-chain cleartext from the relayer, and **any caller address** can submit `cleartext` + `decryptionProof` to the contract function that runs `FHE.checkSignatures` (there’s no “msg.sender must be the decryptor” requirement in the verification step). See [**Public Decryption**](/protocol/solidity-guides/smart-contract/oracle.md).

What prevents spoofing is the on-chain cryptographic verification:

* `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` **reverts** if `decryptionProof` is invalid or doesn’t verify for the provided cleartext/ciphertext (handle) inputs. It checks signature validity, that enough KMS signers signed, and rejects proofs from non-registered KMS signers.\
  See [**FHEVM API reference → checkSignatures**](/protocol/solidity-guides/smart-contract/functions.md).
* The proof is also **order-bound**: the `handlesList` order must match the order used when generating the proof off-chain, and the `i`-th cleartext in `abiEncodedCleartexts` must correspond to the `i`-th handle.

So an attacker can call the callback, but they can’t fabricate a matching `decryptionProof` for arbitrary cleartext values.

One caveat: `checkSignatures` itself does **not** provide replay protection—your callback must implement its own “already finalized” / state guard.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What stops replay of the proof on-chain?](https://docs.zama.org/protocol?ask=What%20stops%20replay%20of%20the%20proof%20on-chain%3F&goal=Secure%20the%20decryption%20callback%20of%20a%20lending%20protocol)
- [How is handle order enforced in proofs?](https://docs.zama.org/protocol?ask=How%20is%20handle%20order%20enforced%20in%20proofs%3F&goal=Secure%20the%20decryption%20callback%20of%20a%20lending%20protocol)
- [Who can trigger the checkSignatures callback?](https://docs.zama.org/protocol?ask=Who%20can%20trigger%20the%20checkSignatures%20callback%3F&goal=Secure%20the%20decryption%20callback%20of%20a%20lending%20protocol)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt.md)
- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Security model](https://docs.zama.org/protocol/sdk/alpha/concepts/security-model.md)
- [RelayerCleartext](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/relayercleartext.md)

