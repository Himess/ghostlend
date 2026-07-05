> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/debug_decrypt.md).

# Debugging with debug.decrypt\[XX]

This guide explains how to use the `debug.decrypt[XX]` functions for debugging encrypted data in mocked environments during development with FHEVM.

{% hint style="warning" %}
The `debug.decrypt[XX]` functions should not be used in production as they rely on private keys.
{% endhint %}

## Overview

The `debug.decrypt[XX]` functions allow you to decrypt encrypted handles into plaintext values. This feature is useful for debugging encrypted operations such as transfers, balance checks, and other computations involving FHE-encrypted data.

### Key points

* **Environment**: The `debug.decrypt[XX]` functions work **only in mocked environments** (e.g., `hardhat` network).
* **Production limitation**: In production, decryption is performed asynchronously via the relayer and requires an authorized onchain request.
* **Encrypted types**: The `debug.decrypt[XX]` functions supports various encrypted types, including integers, and booleans.
* **Bypass ACL authorization**: The `debug.decrypt[XX]` functions allow decryption without ACL authorization, useful for verifying encrypted operations during development and testing.

## Supported functions

### Integer decryption

Decrypts encrypted integers of different bit-widths (`euint8`, `euint16`, ..., `euint256`).

| Function Name | Returns  | Encrypted Type |
| ------------- | -------- | -------------- |
| `decrypt8`    | `bigint` | `euint8`       |
| `decrypt16`   | `bigint` | `euint16`      |
| `decrypt32`   | `bigint` | `euint32`      |
| `decrypt64`   | `bigint` | `euint64`      |
| `decrypt128`  | `bigint` | `euint128`     |
| `decrypt256`  | `bigint` | `euint256`     |

### Boolean decryption

Decrypts encrypted booleans (`ebool`).

| Function Name | Returns   | Encrypted Type |
| ------------- | --------- | -------------- |
| `decryptBool` | `boolean` | `ebool`        |

### Address decryption

Decrypts encrypted addresses.

| Function Name    | Returns  | Encrypted Type |
| ---------------- | -------- | -------------- |
| `decryptAddress` | `string` | `eaddress`     |

## Function usage

### Example: decrypting encrypted values

```typescript
import { debug } from "../utils";

// Decrypt a 64-bit encrypted integer
const handle64: bigint = await this.erc20.balanceOf(this.signers.alice);
const plaintextValue: bigint = await debug.decrypt64(handle64);
console.log("Decrypted Balance:", plaintextValue);
```

{% hint style="info" %}
To utilize the debug functions, import the [utils.ts](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/test/utils.ts) file.
{% endhint %}

For a more complete example, refer to the [ConfidentialERC20 test file](https://github.com/zama-ai/fhevm-hardhat-template/blob/f9505a67db31c988f49b6f4210df47ca3ce97841/test/confidentialERC20/ConfidentialERC20.ts#L181-L205).

## **How it works**

### Verifying types

Each decryption function includes a **type verification step** to ensure the provided handle matches the expected encrypted type. If the type is mismatched, an error is thrown.

```typescript
function verifyType(handle: bigint, expectedType: number) {
  const typeCt = handle >> 8n;
  if (Number(typeCt % 256n) !== expectedType) {
    throw "Wrong encrypted type for the handle";
  }
}
```

### Environment checks

{% hint style="danger" %}
The functions only work in the `hardhat` network. Attempting to use them in a production environment will result in an error.
{% endhint %}

```typescript
if (network.name !== "hardhat") {
  throw Error("This function can only be called in mocked mode");
}
```

## **Best practices**

* **Use only for debugging**: These functions require access to private keys and are meant exclusively for local testing and debugging.
* **Production decryption**: For production, always use the asynchronous relayer-based decryption.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/debug_decrypt.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
