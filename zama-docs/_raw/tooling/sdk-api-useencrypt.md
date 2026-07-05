> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/useencrypt.md).

# useEncrypt

Low-level mutation hook that encrypts plaintext values using the relayer's FHE engine. Returns encrypted values and an input proof for on-chain submission.

{% hint style="warning" %}
For **confidential ERC-20 tokens**, use [`useShield`](/protocol/sdk/api-references/react/useshield.md) or [`useConfidentialTransfer`](/protocol/sdk/api-references/react/useconfidentialtransfer.md) — they handle encryption automatically.

Use `useEncrypt` when your smart contract uses FHE types directly (e.g. a confidential voting contract, a sealed-bid auction, or any non-token contract that accepts encrypted parameters).
{% endhint %}

## Import

```ts
import { useEncrypt } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="component.tsx" %}

```tsx
import { useEncrypt } from "@zama-fhe/react-sdk";

function EncryptValue() {
  const { mutateAsync: encrypt, isPending } = useEncrypt();

  async function handleEncrypt() {
    const { encryptedValues, inputProof } = await encrypt({
      values: [{ value: 1000n, type: "euint64" }],
      contractAddress: "0xContract",
      userAddress: "0xUser",
    });
    // encryptedValues[0] is the encrypted value (0x hex), inputProof is the ZK proof — both contract-ready
  }

  return (
    <button onClick={handleEncrypt} disabled={isPending}>
      {isPending ? "Encrypting..." : "Encrypt"}
    </button>
  );
}
```

{% endtab %}
{% endtabs %}

## Parameters

`useEncrypt` takes no constructor parameters.

## Mutation variables

Passed to `mutate` / `mutateAsync` at call time.

```ts
import { type EncryptParams } from "@zama-fhe/sdk";
```

### values

`EncryptInput[]`

Array of typed inputs. Each entry specifies a plaintext value and its FHE type (`ebool`, `euint64`, `eaddress`, etc.).

### contractAddress

`Address`

Address of the contract that will consume the encrypted value.

### userAddress

`Address`

Address of the user performing the encryption.

## Return Type

```ts
import { type EncryptResult } from "@zama-fhe/sdk";
```

`data` resolves to `{ encryptedValues: EncryptedValue[], inputProof: Hex }` — `0x`-prefixed hex, ready to pass straight into a contract call.

* **`encryptedValues`** — one encrypted value per input.
* **`inputProof`** — the ZK input proof to submit alongside the encrypted values in a contract call.

## Supported FHE Types

| Type       | JS value type       | Range                 |
| ---------- | ------------------- | --------------------- |
| `ebool`    | `boolean \| bigint` | `true`/`false` or 0/1 |
| `euint8`   | `bigint`            | 0–255                 |
| `euint16`  | `bigint`            | 0–65535               |
| `euint32`  | `bigint`            | 0–2³²−1               |
| `euint64`  | `bigint`            | 0–2⁶⁴−1               |
| `euint128` | `bigint`            | 0–2¹²⁸−1              |
| `euint256` | `bigint`            | 0–2²⁵⁶−1              |
| `eaddress` | `` `0x${string}` `` | Ethereum address      |

## Related

* [`useShield`](/protocol/sdk/api-references/react/useshield.md) — high-level hook that encrypts and shields in one step
* [`useConfidentialTransfer`](/protocol/sdk/api-references/react/useconfidentialtransfer.md) — high-level hook that encrypts and transfers
* [`useDecryptValues`](/protocol/sdk/api-references/react/usedecryptvalues.md) — reverse operation, decrypt encrypted values back to plaintext
* [Encrypt & Decrypt guide](/protocol/sdk/guides/encrypt-decrypt.md) — full walkthrough with examples


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/useencrypt.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
