> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md).

# Casting and trivial encryption

This documentation covers the `asEbool`, `asEuintXX`, and `asEaddress` operations provided by the FHE library for working with encrypted data in the FHEVM. These operations are essential for converting between plaintext and encrypted types, as well as handling encrypted inputs.

The operations can be categorized into two main use cases:

1. **Trivial encryption**: Converting plaintext values to encrypted types
2. **Type casting**: Converting between different encrypted types

## 1. Trivial encryption

Trivial encryption simply put is a plain text in a format of a ciphertext.

### Overview

Trivial encryption is the process of converting plaintext values into encrypted types (ciphertexts) compatible with FHE operators. Although the data is in ciphertext format, it remains publicly visible on-chain, making it useful for operations between public and private values.

This type of casting involves converting plaintext (unencrypted) values into their encrypted equivalents, such as:

* `bool` → `ebool`
* `uint` → `euintXX`
* `address` → `eaddress`

{% hint style="info" %}
When doing trivial encryption, the data is made compatible with FHE operations but remains publicly visible on-chain unless explicitly encrypted.
{% endhint %}

#### **Example**

```solidity
euint64 value64 = FHE.asEuint64(7262);  // Trivial encrypt a uint64
ebool valueBool = FHE.asEbool(true);   // Trivial encrypt a boolean
```

## 2. Casting between encrypted types

This type of casting is used to reinterpret or convert one encrypted type into another. For example:

* `euint32` → `euint64`

Casting between encrypted types is often required when working with operations that demand specific sizes or precisions.

> **Important**: When casting between encrypted types:
>
> * Casting from smaller types to larger types (e.g. `euint32` → `euint64`) preserves all information
> * Casting from larger types to smaller types (e.g. `euint64` → `euint32`) will truncate and lose information

The table below summarizes the available casting functions:

| From type | To type  | Function        |
| --------- | -------- | --------------- |
| `euintX`  | `euintX` | `FHE.asEuintXX` |
| `ebool`   | `euintX` | `FHE.asEuintXX` |
| `euintX`  | `ebool`  | `FHE.asEbool`   |

{% hint style="info" %}
Casting between encrypted types is efficient and often necessary when handling data with differing precision requirements.
{% endhint %}

### **Workflow for encrypted types**

```solidity
// Casting between encrypted types
euint32 value32 = FHE.asEuint32(value64); // Cast to euint32
ebool valueBool = FHE.asEbool(value32);   // Cast to ebool
```

## Overall operation summary

| Casting Type             | Function            | Input Type        | Output Type |
| ------------------------ | ------------------- | ----------------- | ----------- |
| Trivial encryption       | `FHE.asEuintXX(x)`  | `uintX`           | `euintX`    |
|                          | `FHE.asEbool(x)`    | `bool`            | `ebool`     |
|                          | `FHE.asEaddress(x)` | `address`         | `eaddress`  |
| Conversion between types | `FHE.asEuintXX(x)`  | `euintXX`/`ebool` | `euintYY`   |
|                          | `FHE.asEbool(x)`    | `euintXX`         | `ebool`     |


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
