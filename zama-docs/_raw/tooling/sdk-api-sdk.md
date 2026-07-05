> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk.md).

# SDK reference

**Welcome to the SDK reference!**

API reference for the core `@zama-fhe/sdk` package. Each page documents a single class or utility with constructor options, methods, properties, and working code examples.

## Where to go next

🟨 Go to [**ZamaSDK**](/protocol/sdk/api-references/sdk/zamasdk.md) for the main entry point — creates tokens, manages sessions, and coordinates the relayer and signer.

🟨 Go to [**Token**](/protocol/sdk/api-references/sdk/token.md) for the base ERC-7984 confidential token operations — balance decryption, transfers, operator approvals.

🟨 Go to [**WrappedToken**](/protocol/sdk/api-references/sdk/wrappedtoken.md) for ERC-7984 ERC-20 wrapper operations — shield, unshield, allowance.

🟨 Go to [**RelayerWeb**](/protocol/sdk/api-references/sdk/relayerweb.md) for browser-side FHE encryption via Web Workers and WASM.

🟨 Go to [**RelayerNode**](/protocol/sdk/api-references/sdk/relayernode.md) for the `node()` transport factory and server-side FHE operations.

🟨 Go to [**Network presets**](/protocol/sdk/api-references/sdk/network-presets.md) for pre-configured contract addresses on Sepolia, Mainnet, and Hardhat.

🟨 Go to [**Errors**](/protocol/sdk/api-references/sdk/errors.md) for the full list of SDK error types and codes.

## Help center

Ask technical questions, discuss with the community, or report a bug.

* [Community forum](https://community.zama.org/c/zama-protocol/15)
* [Discord channel](https://discord.com/invite/zama)
* [Open an issue](https://github.com/zama-ai/sdk/issues) on the SDK repository


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
