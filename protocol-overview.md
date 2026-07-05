> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol/overview.md).

# FHE on blockchain

This section explains in depth the Zama Confidential Blockchain Protocol (Zama Protocol) and demonstrates how it can bring encrypted computation to smart contracts using Fully Homomorphic Encryption (FHE).

FHEVM is the core technology that powers the Zama Protocol. It is composed of the following key components.

<figure><img src="/files/rJNBCnjo0V9zRpmLgL6q" alt=""><figcaption></figcaption></figure>

* [**FHEVM Solidity library**](/protocol/protocol/overview/library.md): Enables developers to write confidential smart contracts in plain Solidity using encrypted data types and operations.
* [**Host contracts**](/protocol/protocol/overview/hostchain.md) : Trusted on-chain contracts deployed on EVM-compatible blockchains. They manage access control and trigger off-chain encrypted computation.
* [**Coprocessors**](/protocol/protocol/overview/coprocessor.md) – Decentralized services that verify encrypted inputs, run FHE computations, and commit results.
* [**Gateway**](/protocol/protocol/overview/gateway.md) **–** The central orchestrator of the protocol. It validates encrypted inputs, manages access control lists (ACLs), bridges ciphertexts across chains, and coordinates coprocessors and the KMS.
* [**Key Management Service (KMS)**](/protocol/protocol/overview/kms.md) – A threshold MPC network that generates and rotates FHE keys, and handles secure, verifiable decryption.
* **Relayer** – A lightweight off-chain service that helps users interact with the Gateway by forwarding encryption or decryption requests.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol/overview.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
