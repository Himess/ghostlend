> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md).

# Public Decryption

This document explains how to perform public decryption of FHEVM ciphertexts. Public decryption is required when you want everyone to see the value in a ciphertext, for example the result of private auction. Public decryption can be done with either the Relayer HTTP endpoint or calling the on-chain decryption oracle.

## HTTP Public Decrypt

Calling the public decryption endpoint of the Relayer can be done easily using the following code snippet.

```ts
// A list of ciphertexts handles to decrypt
const handles = [
  "0x830a61b343d2f3de67ec59cb18961fd086085c1c73ff0000000000aa36a70000",
  "0x98ee526413903d4613feedb9c8fa44fe3f4ed0dd00ff0000000000aa36a70400",
  "0xb837a645c9672e7588d49c5c43f4759a63447ea581ff0000000000aa36a70700",
];

// The list of decrypted values
// {
//  '0x830a61b343d2f3de67ec59cb18961fd086085c1c73ff0000000000aa36a70000': true,
//  '0x98ee526413903d4613feedb9c8fa44fe3f4ed0dd00ff0000000000aa36a70400': 242n,
//  '0xb837a645c9672e7588d49c5c43f4759a63447ea581ff0000000000aa36a70700': '0xfC4382C084fCA3f4fB07c3BCDA906C01797595a8'
// }
const values = instance.publicDecrypt(handles);
```

## Onchain Public Decrypt

For more details please refer to the on [onchain Oracle public decryption page](https://docs.zama.ai/protocol/solidity-guides/smart-contract/oracle).


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
