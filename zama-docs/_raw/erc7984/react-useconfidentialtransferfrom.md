> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialtransferfrom.md).

# useConfidentialTransferFrom

Transfer confidential tokens on behalf of an owner who approved you as an operator. The sender must have been granted approval via [`useConfidentialSetOperator`](/protocol/sdk/api-references/react/useconfidentialsetoperator.md) before calling this hook. Automatically invalidates the [`useConfidentialBalance`](/protocol/sdk/api-references/react/useconfidentialbalance.md) cache on success.

## Import

```ts
import { useConfidentialTransferFrom } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="component.tsx" %}

```tsx
import { useConfidentialTransferFrom } from "@zama-fhe/react-sdk";

function OperatorTransfer({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { mutateAsync: transferFrom, isPending } = useConfidentialTransferFrom(tokenAddress);

  async function handleTransfer() {
    const { txHash, receipt } = await transferFrom({
      from: "0xOwner",
      to: "0xRecipient",
      amount: 500n,
    });
    console.log("Confirmed in block", receipt.blockNumber);
  }

  return (
    <button onClick={handleTransfer} disabled={isPending}>
      {isPending ? "Transferring..." : "Transfer"}
    </button>
  );
}
```

{% endtab %}

{% tab title="config.ts" %}

```ts
// config.ts
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { web } from "@zama-fhe/sdk/web";
import { sepolia } from "@zama-fhe/sdk/chains";
import type { FheChain } from "@zama-fhe/sdk/chains";
import { config as wagmiConfig } from "./wagmi";

const mySepolia = {
  ...sepolia,
  relayerUrl: "https://your-app.com/api/relayer/11155111",
} as const satisfies FheChain;

export const zamaConfig = createZamaConfig({
  chains: [mySepolia],
  wagmiConfig,
  relayers: { [mySepolia.id]: web() },
});

// In your app layout:
// <ZamaProvider config={zamaConfig}>
//   <App />
// </ZamaProvider>
```

{% endtab %}
{% endtabs %}

## Parameters

### address

`Address`

Contract address of the confidential token. Passed positionally as the first argument.

{% tabs %}
{% tab title="component.tsx" %}

```tsx
const { mutateAsync: transferFrom } = useConfidentialTransferFrom("0xToken");
```

{% endtab %}
{% endtabs %}

***

## Mutation variables

The function passed to `mutate` / `mutateAsync` accepts:

### from

`Address`

Owner address whose tokens are being transferred. The connected wallet must have operator approval from this address.

### to

`Address`

Recipient address.

### amount

`bigint`

Number of tokens to transfer (in the token's smallest unit). Encrypted before submission.

{% tabs %}
{% tab title="component.tsx" %}

```tsx
await transferFrom({
  from: "0xOwner",
  to: "0xRecipient",
  amount: 500n,
});
```

{% endtab %}
{% endtabs %}

## Return Type

The `data` property (after a successful mutation) is `{ txHash: Hex, receipt: TransactionReceipt }`.

* **`txHash`** -- Transaction hash submitted to the network.
* **`receipt`** -- Confirmed transaction receipt from the chain.

## Related

* [useConfidentialTransfer](/protocol/sdk/api-references/react/useconfidentialtransfer.md) -- direct transfer (no operator)
* [useConfidentialSetOperator](/protocol/sdk/api-references/react/useconfidentialsetoperator.md) -- grant operator approval
* [Operator Approvals guide](/protocol/sdk/guides/operator-approvals.md)
* [useConfidentialBalance](/protocol/sdk/api-references/react/useconfidentialbalance.md) -- auto-invalidated on success


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialtransferfrom.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
