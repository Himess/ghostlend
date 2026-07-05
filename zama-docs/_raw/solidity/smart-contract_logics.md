> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics.md).

# Logics

This section covers how to implement conditional logic and control flow when working with encrypted values in FHEVM.

Since encrypted values cannot be directly evaluated at runtime, standard Solidity control flow (`if`, `else`, `for` with encrypted conditions) does not work with FHE ciphertexts. Instead, FHEVM provides specialized functions and patterns to handle these cases securely.

## Topics

* [**Branching**](/protocol/solidity-guides/smart-contract/logics/conditions.md) — How to use `FHE.select` for conditional logic on encrypted values, and how to transition from encrypted conditions to non-encrypted business logic via public decryption.
* [**Dealing with branches and conditions**](/protocol/solidity-guides/smart-contract/logics/loop.md) — Patterns for handling loops and indexed access when the condition or index is encrypted.
* [**Error handling**](/protocol/solidity-guides/smart-contract/logics/error_handling.md) — How to handle errors in FHE computations, where standard `require` and `revert` cannot operate on encrypted values.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/smart-contract/logics.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
