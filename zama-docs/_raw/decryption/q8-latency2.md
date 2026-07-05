# How long does a public decryption take end to end on Sepolia testnet? Are there documented latency figures or block-count expectations for the relayer and KMS to produce a decryption result?

I can’t find any documented **end-to-end public decryption latency** numbers for **Sepolia**, and the docs also don’t list **block-count expectations** for when the **relayer** and **KMS** will produce a decryption result.

What *is* documented is the asynchronous workflow and where delays can occur:

## Public decryption flow (what you wait on)

1. **On-chain (setup):** your contract marks ciphertext handles as permanently publicly decryptable via `FHE.makePubliclyDecryptable`.\
   Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)
2. **Off-chain (decryption + proof):** your dapp calls the relayer SDK `publicDecrypt`, which requests decryption from the KMS and returns:
   * the cleartext values
   * ABI-encoded clear values
   * a `decryptionProof` signed by KMS Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)
3. **On-chain (verification + finalize):** you submit clear values + proof, and the contract verifies via `FHE.checkSignatures`.\
   Source: [Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)

## Where the relayer/KMS time is spent

The relayer/Gateway listens for on-chain decryption requests, then **waits for a `decyptionResponse` event** from the KMS’s internal blockchain.\
Source: [Decryption](/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/gateway/decryption.md)

And the KMS performs threshold decryption via MPC (example given: **9 out of 13** parties).\
Source: [KMS](/protocol/protocol/overview/kms.md)

If you need an SLA-like expectation for Sepolia, the docs don’t provide one—so you’ll need to measure empirically for your exact flow.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What affects Sepolia latency, in practice?](https://docs.zama.org/protocol?ask=What%20affects%20Sepolia%20latency%2C%20in%20practice%3F&goal=Set%20user%20expectations%20for%20epoch%20finalization%20latency%20in%20a%20lending%20dapp%20on%20Sepolia)
- [Any SLA guidance for Sepolia decryption?](https://docs.zama.org/protocol?ask=Any%20SLA%20guidance%20for%20Sepolia%20decryption%3F&goal=Set%20user%20expectations%20for%20epoch%20finalization%20latency%20in%20a%20lending%20dapp%20on%20Sepolia)
- [How to measure end-to-end decryption time?](https://docs.zama.org/protocol?ask=How%20to%20measure%20end-to-end%20decryption%20time%3F&goal=Set%20user%20expectations%20for%20epoch%20finalization%20latency%20in%20a%20lending%20dapp%20on%20Sepolia)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md)
- [KMS](https://docs.zama.org/protocol/protocol/overview/kms.md)
- [KMS](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/kms.md)
- [Decryption](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/gateway/decryption.md)
- [User decryption](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/user-decryption.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Relayer & Oracle](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md)
- [Security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Architecture](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/tkms/architecture.md)
- [Centralized](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/tkms/centralized.md)

