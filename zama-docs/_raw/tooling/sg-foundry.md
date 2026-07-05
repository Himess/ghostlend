> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md).

# Foundry

This section will guide you through writing and testing FHEVM smart contracts in Solidity using [Foundry](https://book.getfoundry.sh/).

### The forge-fhevm testing library

To write FHEVM smart contracts in Foundry, the recommended approach is to use [forge-fhevm](https://github.com/zama-ai/forge-fhevm) — a Foundry-native testing library for FHEVM confidential smart contracts.

Unlike a mock-only setup, `forge-fhevm` deploys the **real** FHEVM host contracts (`FHEVMExecutor`, `ACL`, `InputVerifier`, `KMSVerifier`) inside Foundry's test environment, with mock signer keys. Your tests exercise the same code paths as production while plaintext values are tracked locally so you can `assertEq` on them.

It gives you, out of the box:

* Encryption helpers for every FHE type (`encryptBool`, `encryptUint8` … `encryptUint256`, `encryptAddress`)
* Three decryption modes: low-level `decrypt()`, `publicDecrypt()`, and `userDecrypt()`
* EIP-712 proof helpers (`signUserDecrypt`, `buildDecryptionProof`)
* A ready-to-use `FhevmTest` base contract with all infrastructure deployed in `setUp()`

{% hint style="info" %}
The only deviation from mainnet is the use of mock private keys for the input signer and KMS signer, enabling deterministic EIP-712 proof generation in tests.
{% endhint %}

### The FHEVM Foundry template

The fastest way to start is the [FHEVM Foundry Template](https://github.com/zama-ai/fhevm-foundry-template) — a ready-to-clone Foundry project preconfigured with `forge-fhevm`, an example `FHECounter` contract, deployment scripts for local Anvil and Sepolia, and tests demonstrating the full encrypt → execute → decrypt flow.

### Where to go next

🟨 Go to [**Setup Foundry**](/protocol/solidity-guides/getting-started/setup-1.md) to create a Foundry project from the template.

🟨 Go to [**Write FHEVM tests in Foundry**](/protocol/solidity-guides/development-guide/foundry/write_test.md) for details on writing tests with `forge-fhevm`.

🟨 Go to [**Deploy FHEVM contracts with Foundry**](/protocol/solidity-guides/development-guide/foundry/deploy.md) to learn how to deploy to a local Anvil node or to Sepolia.

🟨 Go to [**forge-fhevm API reference**](/protocol/solidity-guides/development-guide/foundry/api.md) for the full list of `FhevmTest` helpers.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
