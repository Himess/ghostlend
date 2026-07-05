> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/usegrantpermit.md).

# useGrantPermit

Mutation hook that signs an EIP-712 message authorizing decryption of confidential encrypted values for a list of contract addresses. This is **not token-specific** — any contract that uses FHE-encrypted values (confidential tokens, DeFi vaults, games, etc.) can be authorized in a single wallet signature.

Call this early (e.g. after wallet connect) so that [`useDecryptValues`](/protocol/sdk/api-references/react/usedecryptvalues.md) queries fire automatically without wallet popups. Automatically invalidates [`useHasPermit`](/protocol/sdk/api-references/react/usehaspermit.md) queries on success.

{% hint style="warning" %}
**Include all contracts you plan to decrypt.** `useDecryptValues` checks that stored permits cover every contract address in its `inputs` before firing the query. If any contract is missing, the query stays disabled.
{% endhint %}

## Import

```ts
import { useGrantPermit } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="AllowButton.tsx" %}

```tsx
import { useGrantPermit } from "@zama-fhe/react-sdk";

function AllowButton({ contracts }: { contracts: `0x${string}`[] }) {
  const { mutateAsync: grantPermit, isPending } = useGrantPermit();

  const handleAllow = async () => {
    await grantPermit(contracts);
    // All subsequent decrypt operations reuse the cached permits
  };

  return (
    <button onClick={handleAllow} disabled={isPending}>
      {isPending ? "Signing..." : "Authorize contracts"}
    </button>
  );
}
```

{% endtab %}

{% tab title="OnConnect.tsx" %}

```tsx
import { useGrantPermit } from "@zama-fhe/react-sdk";
import { useEffect } from "react";

function AuthOnConnect({ contracts }: { contracts: `0x${string}`[] }) {
  const { mutateAsync: grantPermit } = useGrantPermit();

  useEffect(() => {
    // Pre-authorize on wallet connect
    grantPermit(contracts);
  }, []);

  return null;
}
```

{% endtab %}
{% endtabs %}

## Parameters

`useGrantPermit` takes no configuration parameters.

## Mutation variables

### addresses

`Address[]`

Array of contract addresses to authorize decryption for in a single wallet signature. These can be any contracts that use FHE-encrypted values — not limited to tokens.

```tsx
// Authorize any contracts with encrypted state — tokens, auctions, governance, etc.
await grantPermit([confidentialTokenAddress, auctionAddress, governanceAddress]);
```

## Return Type

Returns a standard TanStack Query `UseMutationResult<void, Error, Address[]>`.

## Related

* [`useHasPermit`](/protocol/sdk/api-references/react/usehaspermit.md) -- check whether stored permits cover contracts
* [`useRevokePermits`](/protocol/sdk/api-references/react/userevokepermits.md) -- revoke permits for specific contracts
* [`useClearCredentials`](/protocol/sdk/api-references/react/useclearcredentials.md) -- wipe the transport key pair and all permits
* [Permit Model](/protocol/sdk/concepts/permit-model.md) -- permit lifecycle and TTL configuration


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/usegrantpermit.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
