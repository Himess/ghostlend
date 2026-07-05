> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md).

# Contract addresses

### Ethereum mainnet

| Contract/Service          | Address                                    |
| ------------------------- | ------------------------------------------ |
| ACL\_CONTRACT             | 0xcA2E8f1F656CD25C01F05d0b243Ab1ecd4a8ffb6 |
| FHEVM\_EXECUTOR\_CONTRACT | 0xD82385dADa1ae3E969447f20A3164F6213100e75 |
| KMS\_VERIFIER\_CONTRACT   | 0x77627828a55156b04Ac0DC0eb30467f1a552BB03 |

### Sepolia testnet

| Contract/Service             | Address/Value                              |
| ---------------------------- | ------------------------------------------ |
| ACL\_CONTRACT                | 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D |
| FHEVM\_EXECUTOR\_CONTRACT    | 0x92C920834Ec8941d2C77D188936E1f7A6f49c127 |
| KMS\_VERIFIER\_CONTRACT      | 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A |
| HCU\_LIMIT\_CONTRACT         | 0xa10998783c8CF88D886Bc30307e631D6686F0A22 |
| INPUT\_VERIFIER\_CONTRACT    | 0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0 |
| DECRYPTION\_ADDRESS          | 0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478 |
| INPUT\_VERIFICATION\_ADDRESS | 0x483b9dE06E4E4C7D35CCf5837A1668487406D955 |
| RELAYER\_URL                 | `https://relayer.testnet.zama.org`         |
| GATEWAY\_CHAIN\_ID           | 10901                                      |

{% hint style="info" %}
You do not need to configure these addresses manually. Inheriting from `ZamaEthereumConfig` automatically resolves the correct addresses based on the current `block.chainid`.
{% endhint %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
