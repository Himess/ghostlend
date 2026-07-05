> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/chains.md).

# Chains

This page lists the chains involved in the Zama protocol, their block explorers, RPC endpoints, chain IDs, and LayerZero configurations.

## Mainnet

### Block explorers

* Ethereum: <https://etherscan.io/>
* Gateway: <https://explorer.mainnet.zama.org/>
* BSC: <https://bscscan.com/>
* HyperEVM: <https://hyperevmscan.io/>
* Solana: <https://solscan.io/>

### RPC endpoints

* Gateway: <https://rpc.mainnet.zama.org>

### EVM chains - Chain IDs

Not to be confused with Endpoint IDs (see section below).

| Name       | Chain ID |
| ---------- | -------- |
| `Ethereum` | 1        |
| `Gateway`  | 261131   |
| `BSC`      | 56       |
| `HyperEVM` | 999      |

**Note:** These are only for EVM chains, Solana does not have a chain ID (but has a LayerZero endpoint ID).

### LayerZero

#### Endpoint IDs

Those are LayerZero specific and should not be confused with Chain IDs (see section above).

| Name       | Endpoint ID (eid) |
| ---------- | ----------------- |
| `Ethereum` | 30101             |
| `Gateway`  | 30397             |
| `BSC`      | 30102             |
| `SOL`      | 30168             |
| `HyperEVM` | 30367             |

## Testnet

### Block explorers

* Ethereum Sepolia: <https://sepolia.etherscan.io>
* Gateway Testnet: <https://explorer.testnet.zama.org/>
* Polygon Amoy: <https://amoy.polygonscan.com/>

### RPC endpoints

* Gateway Testnet: <https://rpc.testnet.zama.org>

### EVM chains - Chain IDs

| Name               | Chain ID |
| ------------------ | -------- |
| `Ethereum Sepolia` | 11155111 |
| `Gateway Testnet`  | 10901    |
| `BSC Testnet`      | 97       |
| `Polygon Amoy`     | 80002    |

### LayerZero

#### Endpoint IDs

| Name               | Endpoint ID (eid) |
| ------------------ | ----------------- |
| `Ethereum Sepolia` | 40161             |
| `Gateway Testnet`  | 40424             |
| `BSC Testnet`      | 40102             |
| `Polygon Amoy`     | 40267             |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/chains.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
