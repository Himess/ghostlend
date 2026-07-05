> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md).

# Relayer & Oracle

This document explains the service interface of the Zama Protocol - Relayer & Oracle.

## What is the Oracle?

The Oracle is an off-chain service that acts on behalf of smart contracts to retrieve decrypted values from the FHEVM protocol.

While the FHEVM protocol’s core components handle encryption, computation, and key management, Oracles and Relayers provide the necessary connectivity between users, smart contracts, and the off-chain infrastructure. They act as lightweight services that interface with the Gateway, enabling smooth interaction with encrypted values—without requiring users or contracts to handle complex integration logic.

These components are not part of the trusted base of the protocol; their actions are fully verifiable, and their misbehavior does not compromise confidentiality or correctness.

## Responsibilities of the Oracle

* Listen for on-chain decryption requests from contracts.
* Forward decryption requests to the Gateway on behalf of the contract.
* Wait for the KMS to produce signed plaintexts via the Gateway.
* Call back the contract on the host chain, passing the decrypted result.

Since the decrypted values are signed by the KMS, the receiving smart contract can verify the result, removing any needto trust the oracle itself.

## Security model of the Oracle

* Oracles are **untrusted**: they can only delay a request, not falsify it.
* All results are signed and verifiable on-chain.

If one oracle fails to respond, another can take over.

Goal: Enable contracts to access decrypted values asynchronously and securely, without embedding decryption logic.

## What is the Relayer?

The Relayer is a user-facing service that simplifies interaction with the Gateway, particularly for encryption and decryption operations that need to happen off-chain.

## Responsibilities of the Relayer

* Send encrypted inputs from the user to the Gateway for registration.
* Initiate user-side decryption requests, including EIP-712 authentication.
* Collect the response from the KMS, re-encrypted under the user’s public key.
* Deliver the ciphertext back to the user, who decrypts it locally in their browser/app.

This allows users to interact with encrypted smart contracts without having to run their own Gateway interface,\
validator, or FHE tooling.

## Security model of the Relayer

* Relayers are stateless and **untrusted**.
* All data flows are signed and auditable by the user.
* Users can always run their own relayer or interact with the Gateway directly if needed.

Goal: Make it easy for users to submit encrypted inputs and retrieve private decrypted results without managing infrastructure.

## How they fit in

* Smart contracts use the Oracle to receive plaintext results of encrypted computations via callbacks.
* Users rely on the Relayer to push encrypted values into the system and fetch personal decrypted results, all backed by EIP-712 signatures and FHE key re-encryption.

Together, Oracles and Relayers help bridge the gap between encrypted execution and application usability—without compromising security or decentralization.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
