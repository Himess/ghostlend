> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/relayercleartext.md).

# RelayerCleartext

Development relayer that operates in cleartext mode. Values are stored as plaintext on-chain via the CleartextFHEVMExecutor contract. Implements the same `RelayerSDK` interface as `RelayerWeb` and `RelayerNode`.

## Import

```ts
import { RelayerCleartext } from "@zama-fhe/sdk/cleartext";
```

{% hint style="info" %}
For most applications, prefer the `cleartext()` transport factory with `createConfig` instead of constructing `RelayerCleartext` directly. See [Network Presets](/protocol/sdk/api-references/sdk/network-presets.md) for examples.
{% endhint %}

## Usage

{% tabs %}
{% tab title="Recommended (cleartext transport)" %}

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { cleartext } from "@zama-fhe/sdk";
import { hardhat } from "@zama-fhe/sdk/chains";

const config = createConfig({
  chains: [hardhat],
  publicClient,
  walletClient,
  relayers: {
    [hardhat.id]: cleartext(),
  },
});
```

{% endtab %}

{% tab title="Direct construction" %}

```ts
import { RelayerCleartext } from "@zama-fhe/sdk/cleartext";
import { hardhat } from "@zama-fhe/sdk/chains";

const relayer = new RelayerCleartext(hardhat);
```

{% endtab %}
{% endtabs %}

## Constructor

```ts
import { RelayerCleartext } from "@zama-fhe/sdk/cleartext";

const relayer = new RelayerCleartext(chain);
```

Takes a single `FheChain` object directly. Mainnet (1) and Sepolia (11155111) chain IDs are blocked — cleartext mode is for development only.

The `FheChain` fields relevant to cleartext mode are:

| Field                                       | Type                        | Description                                                |
| ------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `id`                                        | `number`                    | Chain ID (must not be 1 or 11155111)                       |
| `network`                                   | `EIP1193Provider \| string` | RPC URL or provider for reading on-chain state             |
| `gatewayChainId`                            | `number`                    | Gateway chain ID for EIP-712 domain construction           |
| `aclContractAddress`                        | `Address`                   | ACL contract for permission checks                         |
| `executorAddress`                           | `Address`                   | CleartextFHEVMExecutor contract storing plaintext values   |
| `verifyingContractAddressDecryption`        | `Address`                   | EIP-712 verifying contract for decrypt operations          |
| `verifyingContractAddressInputVerification` | `Address`                   | EIP-712 verifying contract for encrypt operations          |
| `kmsSignerPrivateKey`                       | `Hex \| undefined`          | KMS signer private key (falls back to built-in mock key)   |
| `inputSignerPrivateKey`                     | `Hex \| undefined`          | Input signer private key (falls back to built-in mock key) |

Built-in chain presets (`hardhat`, `hoodi`) already include all required fields:

```ts
import { hardhat, hoodi } from "@zama-fhe/sdk/chains";

const relayer = new RelayerCleartext(hardhat);
```

## Methods

The cleartext relayer implements the full `RelayerSDK` interface:

| Method                                  | Description                                                         |
| --------------------------------------- | ------------------------------------------------------------------- |
| `generateTransportKeyPair()`            | Returns a random mock transport key pair.                           |
| `encrypt(params)`                       | Computes mock ciphertext handles and signs an input proof.          |
| `userDecrypt(params)`                   | Reads plaintext from TFHEExecutor after ACL checks.                 |
| `publicDecrypt(encryptedValues)`        | Reads plaintext for encrypted values allowed for public decryption. |
| `delegatedUserDecrypt(params)`          | Reads plaintext via delegated authorization.                        |
| `createEIP712(...)`                     | Returns a user-decrypt EIP-712 typed data object.                   |
| `createDelegatedUserDecryptEIP712(...)` | Returns a delegated-decrypt EIP-712 typed data object.              |
| `fetchFheEncryptionKeyBytes()`          | Returns a mock FHE encryption key.                                  |
| `getPublicParams(bits)`                 | Returns mock public parameters.                                     |
| `terminate()`                           | No-op — no resources to release.                                    |

{% hint style="info" %}
`requestZKProofVerification` throws a `ConfigurationError` — ZK proofs are not supported in cleartext mode.
{% endhint %}

## Related

* [Local Development guide](/protocol/sdk/guides/local-development.md) — when and how to use cleartext mode
* [RelayerWeb](/protocol/sdk/api-references/sdk/relayerweb.md) — browser relayer with real FHE
* [RelayerNode](/protocol/sdk/api-references/sdk/relayernode.md) — Node.js relayer with real FHE
* [Network Presets](/protocol/sdk/api-references/sdk/network-presets.md) — production network configs


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/relayercleartext.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
