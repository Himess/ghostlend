> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md).

# Write FHEVM tests in Hardhat

In this section, you'll find everything you need to set up a new [Hardhat](https://hardhat.org) project and start developing FHEVM smart contracts from scratch using the [FHEVM Hardhat Plugin](https://www.npmjs.com/package/@fhevm/hardhat-plugin)

### Enabling the FHEVM Hardhat Plugin in your Hardhat project

Like any Hardhat plugin, the [FHEVM Hardhat Plugin](https://www.npmjs.com/package/@fhevm/hardhat-plugin) must be enabled by adding the following `import` statement to your `hardhat.config.ts` file:

```typescript
import "@fhevm/hardhat-plugin";
```

{% hint style="warning" %}
Without this import, the Hardhat FHEVM API will **not** be available in your Hardhat runtime environment (HRE).
{% endhint %}

### Accessing the Hardhat FHEVM API

The plugin extends the standard [Hardhat Runtime Environment](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment) (or `hre` in short) with the new `fhevm` Hardhat module.

You can access it in either of the following ways:

```typescript
import { fhevm } from "hardhat";
```

or

```typescript
import * as hre from "hardhat";

// Then access: hre.fhevm
```

### Encrypting Values Using the Hardhat FHEVM API

Suppose the FHEVM smart contract you want to test has a function called `foo` that takes an encrypted `uint32` value as input. The Solidity function `foo` should be declared as follows:

```solidity
function foo(externalEuint32 value, bytes calldata inputProof);
```

Where:

* `externalEuint32 value` : is a `bytes32` representing the encrypted `uint32`
* `bytes calldata inputProof` : is a `bytes` array representing the zero-knowledge proof of knowledge that validates the encryption

To compute these arguments in TypeScript, you need:

* The **address of the target smart contract**
* The **signer’s address** (i.e., the account sending the transaction)

{% stepper %}
{% step %}
**Create a new encrypted input**

```ts
// use the `fhevm` API module from the Hardhat Runtime Environment
const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
```

{% endstep %}

{% step %}
**Add the value you want to encrypt.**

```ts
input.add32(12345);
```

{% endstep %}

{% step %}
**Perform local encryption.**

```ts
const encryptedInputs = await input.encrypt();
```

{% endstep %}

{% step %}
**Call the Solidity function**

```ts
const externalUint32Value = encryptedInputs.handles[0];
const inputProof = encryptedInputs.inputProof;

const tx = await input.foo(externalUint32Value, inputProof);
await tx.wait();
```

{% endstep %}
{% endstepper %}

#### Encryption examples

* [Basic encryption examples](https://docs.zama.ai/protocol/examples/basic/encryption)
* [FHECounter](https://docs.zama.ai/protocol/examples#an-fhe-counter)

### Decrypting values using the Hardhat FHEVM API

Suppose user **Alice** wants to decrypt a `euint32` value that is stored in a smart contract exposing the following Solidity `view` function:

```solidity
function getEncryptedUint32Value() public view returns (euint32) { returns _encryptedUint32Value; }
```

{% hint style="warning" %}
For simplicity, we assume that both Alice’s account and the target smart contract already have the necessary FHE permissions to decrypt this value. For a detailed explanation of how FHE permissions work, see the [`initializeUint32()`](https://docs.zama.ai/protocol/examples/basic/decryption/fhe-decrypt-single-value#tab-decryptsinglevalue.sol) function in [DecryptSingleValue.sol](https://docs.zama.ai/protocol/examples/basic/decryption/fhe-decrypt-single-value#tab-decryptsinglevalue.sol).
{% endhint %}

{% stepper %}
{% step %}
**Retrieve the encrypted value (a `bytes32` handle) from the smart contract:**

```ts
const encryptedUint32Value = await contract.getEncryptedUint32Value();
```

{% endstep %}

{% step %}
**Perform the decryption using the FHEVM API:**

```ts
const clearUint32Value = await fhevm.userDecryptEuint(
  FhevmType.euint32, // Encrypted type (must match the Solidity type)
  encryptedUint32Value, // bytes32 handle Alice wants to decrypt
  contractAddress, // Target contract address
  signers.alice, // Alice’s wallet
);
```

{% hint style="warning" %}
If either the target smart contract or the user does **NOT** have FHE permissions, then the decryption call will fail!
{% endhint %}
{% endstep %}
{% endstepper %}

#### Supported Decryption Types

Use the appropriate function for each encrypted data type:

| Type       | Function                         |
| ---------- | -------------------------------- |
| `euintXXX` | `fhevm.userDecryptEuint(...)`    |
| `ebool`    | `fhevm.userDecryptEbool(...)`    |
| `eaddress` | `fhevm.userDecryptEaddress(...)` |

#### Decryption examples

* [Basic decryption examples](https://docs.zama.ai/protocol/examples/basic/decryption)
* [FHECounter](https://docs.zama.ai/protocol/examples#an-fhe-counter)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
