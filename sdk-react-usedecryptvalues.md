> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md).

# useDecryptValues

Query hook for user decryption. **Disabled by default** — pass `enabled` to run it, and gate on a cached permit (via [`useHasPermit`](/protocol/sdk/api-references/react/usehaspermit.md)) to avoid an unexpected wallet prompt. Checks the persistent decrypt cache first and only hits the relayer for uncached entries.

{% hint style="info" %}
Renamed from `useUserDecrypt` to align with the Zama glossary (prerelease rename). If you were on the old name, update imports to `useDecryptValues`.
{% endhint %}

{% hint style="info" %}
**This is the recommended way to decrypt.** For token balances, prefer [`useConfidentialBalance`](/protocol/sdk/api-references/react/useconfidentialbalance.md) which handles decryption and caching automatically. Use `useDecryptValues` when your smart contract uses FHE types directly (e.g. a confidential voting contract, a sealed-bid auction, or any non-token contract).
{% endhint %}

## Import

```ts
import { useDecryptValues } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="component.tsx" %}

```tsx
import { useGrantPermit, useHasPermit, useDecryptValues } from "@zama-fhe/react-sdk";

const CONTRACT = "0xYourContract" as const;

function DecryptValue({ encryptedValue }: { encryptedValue: string }) {
  const { mutate: grantPermit, isPending: isGranting } = useGrantPermit();
  const { data: hasPermit } = useHasPermit({ contractAddresses: [CONTRACT] });
  const { data, isPending } = useDecryptValues(
    [{ encryptedValue, contractAddress: CONTRACT }],
    { enabled: !!hasPermit }, // gate: only decrypt once authorized
  );

  if (!hasPermit) {
    return (
      <button onClick={() => grantPermit([CONTRACT])} disabled={isGranting}>
        {isGranting ? "Signing..." : "Authorize"}
      </button>
    );
  }

  if (isPending) return <p>Decrypting...</p>;
  return <output>Value: {data?.[encryptedValue]?.toString()}</output>;
}
```

{% endtab %}
{% endtabs %}

## Parameters

### inputs (first argument)

`EncryptedInput[]`

Array of encrypted values to decrypt. Each entry pairs an encrypted value with the address of the contract that owns it. Only entries not yet in the SDK's persistent decrypt cache are sent for decryption — cached ones are returned immediately, even after a page reload.

```ts
import { type EncryptedInput } from "@zama-fhe/sdk";
```

| Field             | Type             | Description                                            |
| ----------------- | ---------------- | ------------------------------------------------------ |
| `encryptedValue`  | `EncryptedValue` | The encrypted value (hex string) to decrypt.           |
| `contractAddress` | `Address`        | Address of the contract that owns the encrypted value. |

Inputs from different contracts can be mixed in a single call — `useDecryptValues` automatically groups them by contract address and issues one decryption request per unique contract:

```tsx
const { data } = useDecryptValues(
  [
    { encryptedValue: "0xvalue1...", contractAddress: "0xContractA" },
    { encryptedValue: "0xvalue2...", contractAddress: "0xContractA" },
    { encryptedValue: "0xvalue3...", contractAddress: "0xContractB" },
  ],
  { enabled: true },
);

// data: { "0xvalue1...": 500n, "0xvalue2...": 200n, "0xvalue3...": 1000n }
```

{% hint style="warning" %}
**All contract addresses must be authorized first.** Call `useGrantPermit` with every contract address present in `inputs` before enabling the query. Use `useHasPermit({ contractAddresses })` to check coverage and pass `{ enabled: !!hasPermit }` as the second argument to prevent unexpected wallet prompts.
{% endhint %}

### options (second argument)

`{ enabled?: boolean } | undefined`

Pass `{ enabled: false }` as the second argument to disable the query.

## Return Type

Returns a standard `useQuery` result. `data` resolves to `Record<EncryptedValue, ClearValue>` — a map from each encrypted value to its decrypted plaintext value (`bigint`, `boolean`, or `string`).

When all requested inputs are already cached, `data` contains the cached values immediately (no relayer call). Freshly decrypted results are written through the SDK's internal CachingService — scoped by `(signer, contract, encryptedValue)` — so that subsequent renders return instantly, even after a page reload. The cache is cleared automatically on `permits.revokePermits()`, `permits.clear()`, or wallet lifecycle events (disconnect, account change, chain change).

## How It Works

`useDecryptValues` chains two internal queries:

1. **Signer address** — resolves the connected wallet address.
2. **Decrypt** — calls `sdk.decryption.decryptValues(inputs)` which checks the persistent cache, then hits the relayer for any uncached entries.

{% hint style="warning" %}
**`useDecryptValues` does not automatically gate on permits.** If permits are not cached when the query fires, the SDK will prompt the user's wallet for a signature. To avoid unexpected popups, gate the query yourself using [`useHasPermit`](/protocol/sdk/api-references/react/usehaspermit.md):

```tsx
const { data: hasPermit } = useHasPermit({ contractAddresses: ["0xContract"] });
const { data } = useDecryptValues([{ encryptedValue, contractAddress: "0xContract" }], {
  enabled: !!hasPermit,
});
```

This ensures the decrypt query only fires after `useGrantPermit` has been called.
{% endhint %}

## Permit caching

`useDecryptValues` relies on permits acquired via [`useGrantPermit`](/protocol/sdk/api-references/react/usegrantpermit.md):

* **First `grantPermit()` call** — generates a new transport key pair, creates EIP-712 typed data, and requests a wallet signature. The permits are then cached.
* **Subsequent queries** — reuse the cached permits if they are still valid (not expired).
* **Expiry** — the transport key pair expires after `transportKeyPairTTL` seconds (default: 2592000 = 30 days, configurable via SDK config). Permits expire after `permitTTL` days (default: 30). Once expired, call `grantPermit()` again to generate fresh permits.

This means users only see a wallet signature prompt once per TTL window, even if they decrypt multiple times.

## Related

* [`useGrantPermit`](/protocol/sdk/api-references/react/usegrantpermit.md) — pre-authorize contracts with one wallet signature (required before `useDecryptValues` fires)
* [`useHasPermit`](/protocol/sdk/api-references/react/usehaspermit.md) — check whether permits are cached and cover specific contracts
* [`useConfidentialBalance`](/protocol/sdk/api-references/react/useconfidentialbalance.md) — high-level hook that decrypts token balances with automatic caching
* [`useEncrypt`](/protocol/sdk/api-references/react/useencrypt.md) — reverse operation, encrypt a plaintext value for on-chain submission
* [Encrypt & Decrypt guide](/protocol/sdk/guides/encrypt-decrypt.md) — full walkthrough with end-to-end examples


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
