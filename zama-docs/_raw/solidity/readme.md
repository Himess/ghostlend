> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/readme.md).

# Overview

**Welcome to Solidity Guides!**

This section will guide you through writing confidential smart contracts in Solidity using the FHEVM library. With Fully Homomorphic Encryption(FHE), your contracts can operate directly on encrypted data without ever decrypting it onchain.

## Where to go next

If you’re new to the Zama Protocol, start with the [Litepaper](https://docs.zama.ai/protocol/zama-protocol-litepaper) or the [Protocol Overview](https://docs.zama.ai/protocol) to understand the foundations.

Otherwise:

🟨 Go to [**What is FHEVM**](/protocol/solidity-guides/getting-started/overview.md) to learn about the core concepts and features.

🟨 Go to [**Quick Start Tutorial**](/protocol/solidity-guides/getting-started/quick-start-tutorial.md) to build and test your first confidential smart contract.

🟨 Go to [**Smart Contract Guides**](/protocol/solidity-guides/smart-contract/configure.md) for details on encrypted types, supported operations, inputs, ACL, and decryption flows.

🟨 Go to [**Development Guides**](/protocol/solidity-guides/development-guide/hardhat.md) to set up your local environment with Hardhat or Foundry and deploy FHEVM contracts.

## Help center

Ask technical questions and discuss with the community.

* [Community forum](https://community.zama.ai/c/fhevm/15)
* [Discord channel](https://discord.com/invite/zama)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/readme.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
