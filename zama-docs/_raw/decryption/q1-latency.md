# What is the typical latency of a public decryption on Sepolia, from calling the SDK publicDecrypt function to receiving the cleartext and decryption proof?

I cannot find any docs value for the **typical latency** of `publicDecrypt` on **Sepolia** (from calling the SDK until you receive both **cleartext** and the **decryption proof**).

What the docs *do* specify is the end-to-end flow:

* On-chain you mark the handle as publicly decryptable with `FHE.makePubliclyDecryptable`.
* Off-chain, the SDK’s `publicDecrypt` submits the ciphertext handles to the **Zama Relayer / KMS**.
* The Relayer returns:
  * the **cleartext**,
  * its **ABI-encoded** form,
  * and a **decryption proof** (signatures + metadata) that you later verify on-chain with `FHE.checkSignatures`.\
    ([Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md))

Because there are no documented timing guarantees, the only reliable way to get a “typical” number for your setup is to measure it around the SDK call shown in the tutorial:

```ts
const t0 = Date.now();
const results = await instance.publicDecrypt([efoo, ebar]);
const t1 = Date.now();
console.log("publicDecrypt ms:", t1 - t0);
```

This will capture the full off-chain round-trip needed to obtain cleartext + the proof.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [How long is typical relayer latency?](https://docs.zama.org/protocol?ask=How%20long%20is%20typical%20relayer%20latency%3F&goal=Design%20a%20confidential%20lending%20protocol%20on%20Sepolia%20that%20relies%20on%20async%20public%20decryption)
- [What affects Sepolia latency variance?](https://docs.zama.org/protocol?ask=What%20affects%20Sepolia%20latency%20variance%3F&goal=Design%20a%20confidential%20lending%20protocol%20on%20Sepolia%20that%20relies%20on%20async%20public%20decryption)
- [Can I measure end-to-end latency easily?](https://docs.zama.org/protocol?ask=Can%20I%20measure%20end-to-end%20latency%20easily%3F&goal=Design%20a%20confidential%20lending%20protocol%20on%20Sepolia%20that%20relies%20on%20async%20public%20decryption)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Public Decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md)
- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [RelayerCleartext](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/relayercleartext.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)

