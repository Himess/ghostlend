> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/readme.md).

# Overview

Welcome to the Zama Protocol documentation for operators and developers.

This section provides comprehensive guides for participating in protocol governance, staking operations, and working with confidential token infrastructure.

## Where to go next

If you’re new to the Zama Protocol, start with the [Litepaper](https://docs.zama.org/protocol/zama-protocol-litepaper) to understand the foundations.

Otherwise:

🟨 Go to [**Apps**](/protocol/protocol-apps/apps.md) to explore all the official Zama Protocol web applications.

🟨 Go to [**$ZAMA Token**](/protocol/protocol-apps/zama-token.md) to learn about the protocol's utility token, its OFT architecture, and how to bridge it.

🟨 Go to [**Staking**](/protocol/protocol-apps/staking.md) to understand the two-tier staking system and how fees and rewards are distributed.

🟨 Go to [**Confidential wrapper**](/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md) to learn how to wrap standard ERC-20 tokens into confidential ERC-7984 tokens, and [**Registry**](/protocol/protocol-apps/confidential-tokens/wrapper-registry.md) to learn how to to register them onchain.

🟨 Go to [**Governance**](/protocol/protocol-apps/governance/governance.md) to learn how operators vote on proposals, manage upgrades, and participate in DAO decisions.

🟨 Go to [**Chains**](/protocol/protocol-apps/chains.md) to find block explorers, RPC endpoints, chain IDs, and LayerZero configurations.

🟨 Go to [**Addresses**](/protocol/protocol-apps/addresses.md) to find all deployed contract addresses for the Zama protocol.

## Help center

Ask technical questions and discuss with the community.

* [Community forum](https://community.zama.org/)
* [Discord channel](https://discord.com/invite/zama)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/readme.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
