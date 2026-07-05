> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/gateway.md).

# Zama Gateway

## Token

| Name     | Address                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Zama OFT | [`0xcE762c7FDaac795D31a266B9247F8958c159c6d4`](https://explorer.testnet.zama.org/address/0xcE762c7FDaac795D31a266B9247F8958c159c6d4) |

## Governance

| Name                     | Address                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Governance OApp Receiver | [`0x998E9484Aa2a9Ae5B0C8a93B4bD2ea2a5C1B6fF0`](https://explorer.testnet.zama.org/address/0x998E9484Aa2a9Ae5B0C8a93B4bD2ea2a5C1B6fF0) |
| Admin Module             | [`0x53dB449A96d0319DD1f90102dA116Bb9aB0483bB`](https://explorer.testnet.zama.org/address/0x53dB449A96d0319DD1f90102dA116Bb9aB0483bB) |
| Gateway Testnet multisig | [`0x3241b3A4036a356c5D7e36a432Da2B8e5739D9c9`](https://explorer.testnet.zama.org/address/0x3241b3A4036a356c5D7e36a432Da2B8e5739D9c9) |

## Pausing

| Name       | Address                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pauser Set | [`0x057dC9855536470A6D8C21d075bA17EA062A5dE7`](https://explorer.testnet.zama.org/address/0x057dC9855536470A6D8C21d075bA17EA062A5dE7) |

## Fees

| Name               | Address                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| FeesSenderToBurner | [`0x826106E9428460449d35F724F7098d0a67369AE2`](https://explorer.testnet.zama.org/address/0x826106E9428460449d35F724F7098d0a67369AE2) |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/addresses/testnet/gateway.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
