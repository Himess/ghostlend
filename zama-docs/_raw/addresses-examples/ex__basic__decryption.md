> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/examples/basic/decryption.md).

# Decryption

- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Public Decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/examples/basic/decryption.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
