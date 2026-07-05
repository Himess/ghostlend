> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react.md).

# React reference

**Welcome to the React reference!**

API reference for the `@zama-fhe/react-sdk` package. Each page documents a single hook or component with parameters, return values, and working code examples. All hooks are built on TanStack Query with automatic cache invalidation and cached decryption.

## Where to go next

🟨 Go to [**ZamaProvider**](/protocol/sdk/api-references/react/zamaprovider.md) for the required context provider that wires up the relayer, signer, and storage.

🟨 Go to [**useConfidentialBalance**](/protocol/sdk/api-references/react/useconfidentialbalance.md) to decrypt and display a single token's balance.

🟨 Go to [**useShield**](/protocol/sdk/api-references/react/useshield.md) to convert public ERC-20 tokens into confidential form.

🟨 Go to [**useConfidentialTransfer**](/protocol/sdk/api-references/react/useconfidentialtransfer.md) to send encrypted amounts on-chain.

🟨 Go to [**useUnshield**](/protocol/sdk/api-references/react/useunshield.md) to withdraw confidential tokens back to public ERC-20.

🟨 Go to [**Query keys**](/protocol/sdk/api-references/react/query-keys.md) for manual cache invalidation and custom query composition.

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
GET https://docs.zama.org/protocol/sdk/api-references/react.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
