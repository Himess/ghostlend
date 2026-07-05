> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/addresses.md).

# Contract addresses

This directory contains all deployed contract addresses for the Zama protocol, organized by chain.

## Mainnet

* [Ethereum Mainnet](/protocol/protocol-apps/addresses/mainnet/ethereum.md)
* [Zama Gateway Mainnet](/protocol/protocol-apps/addresses/mainnet/gateway.md)
* [Binance Smart Chain Mainnet](/protocol/protocol-apps/addresses/mainnet/bsc.md)
* [HyperEVM Mainnet](/protocol/protocol-apps/addresses/mainnet/hyper_evm.md)
* [Solana Mainnet](/protocol/protocol-apps/addresses/mainnet/solana.md)

## Testnet

* [Sepolia Testnet](/protocol/protocol-apps/addresses/testnet/sepolia.md)
* [Zama Gateway Testnet](/protocol/protocol-apps/addresses/testnet/gateway.md)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/addresses.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
