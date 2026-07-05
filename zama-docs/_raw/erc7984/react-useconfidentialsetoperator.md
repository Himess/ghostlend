> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialsetoperator.md).

# useConfidentialSetOperator

Approve an operator to act on your confidential tokens (e.g. a DEX or multisig).

## Import

```ts
import { useConfidentialSetOperator } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="ApproveOperator.tsx" %}

```tsx
import { useConfidentialSetOperator } from "@zama-fhe/react-sdk";

function ApproveOperator({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { mutateAsync: setOperator, isPending } = useConfidentialSetOperator(tokenAddress);

  const handleApprove = async () => {
    const { txHash } = await setOperator({ operator: "0xDEX" });
    console.log("Operator set:", txHash);
  };

  return (
    <button onClick={handleApprove} disabled={isPending}>
      {isPending ? "Setting operator..." : "Set Operator"}
    </button>
  );
}
```

{% endtab %}
{% endtabs %}

## Parameters

### address

`Address`

Address of the confidential token contract. Passed positionally as the first argument.

```ts
const { mutateAsync: setOperator } = useConfidentialSetOperator("0xToken");
```

## Mutation variables

### operator

`Address`

Address of the operator to approve.

```ts
await setOperator({
  operator: "0xDEX",
});
```

***

### until

`number | undefined`

Unix timestamp (seconds) when the approval expires. Defaults to 1 hour from now.

```ts
const oneDay = Math.floor(Date.now() / 1000) + 86_400;

await setOperator({
  operator: "0xDEX",
  until: oneDay,
});
```

## Return Type

`data` is `{ txHash: Hex; receipt: TransactionReceipt }` — the submitted transaction hash and its confirmed on-chain receipt.

## Related

* [`useConfidentialIsOperator`](/protocol/sdk/api-references/react/useconfidentialisoperator.md) — check if a spender is currently an operator
* [`useConfidentialTransferFrom`](/protocol/sdk/api-references/react/useconfidentialtransferfrom.md) — operator transfer using an existing approval
* [`Token.setOperator()`](/protocol/sdk/api-references/sdk/token.md#setoperator) — imperative equivalent on the SDK class


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialsetoperator.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
