> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/gateway.md).

# Zama Gateway

## Token

| Name     | Address                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Zama OFT | [`0xcE762c7FDaac795D31a266B9247F8958c159c6d4`](https://explorer.mainnet.zama.org/address/0xcE762c7FDaac795D31a266B9247F8958c159c6d4) |

## Governance

| Name                     | Address                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Governance OApp Receiver | [`0x10795261A06285D3718674a9Cf98Ea66F7C6A0c6`](https://explorer.mainnet.zama.org/address/0x10795261A06285D3718674a9Cf98Ea66F7C6A0c6) |
| Admin Module             | [`0x57f866b5E7Fb82Fb812Ed3D3C79cdB35E9e91518`](https://explorer.mainnet.zama.org/address/0x57f866b5E7Fb82Fb812Ed3D3C79cdB35E9e91518) |
| Gateway multisig         | [`0x5f0F86BcEad6976711C9B131bCa5D30E767fe2bE`](https://explorer.mainnet.zama.org/address/0x5f0F86BcEad6976711C9B131bCa5D30E767fe2bE) |

## Pausing

| Name       | Address                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pauser Set | [`0x571ecb596fCc5c840DA35CbeCA175580db50ac1b`](https://explorer.mainnet.zama.org/address/0x571ecb596fCc5c840DA35CbeCA175580db50ac1b) |

## Fees

| Name               | Address                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| FeesSenderToBurner | [`0xd9c00DbE2d5e3f64950a1258DABBC3e75697022A`](https://explorer.mainnet.zama.org/address/0xd9c00DbE2d5e3f64950a1258DABBC3e75697022A) |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/gateway.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
