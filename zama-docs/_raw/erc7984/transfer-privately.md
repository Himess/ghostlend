> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/guides/transfer-privately.md).

# Transfer privately

Confidential transfers encrypt the amount before it reaches the chain -- no one can see how much was sent. The SDK handles FHE encryption internally via `token.confidentialTransfer()`. In React, use the `useConfidentialTransfer` and `useConfidentialTransferFrom` hooks.

## Steps

### 1. Create a token instance

Start from a configured SDK instance (see [Configuration](/protocol/sdk/guides/configuration.md)) and create a token pointing at your encrypted ERC-20 contract:

{% tabs %}
{% tab title="Core SDK" %}

```ts
const token = sdk.createToken("0xEncryptedERC20Address");
```

{% endtab %}

{% tab title="React" %}

```tsx
import { useToken } from "@zama-fhe/react-sdk";

const token = useToken("0xEncryptedERC20Address");
```

{% endtab %}
{% endtabs %}

### 2. Send a confidential transfer

Pass the recipient address and the plaintext amount. The SDK encrypts the amount using FHE before submitting the transaction.

By default, the SDK validates the confidential balance before submitting. If stored permits exist, it decrypts silently. If the balance is insufficient, it throws `InsufficientConfidentialBalanceError` before any transaction is sent. Pass `skipBalanceCheck: true` to bypass (e.g. for smart wallets that cannot produce EIP-712 signatures).

{% tabs %}
{% tab title="Core SDK" %}

```ts
const { txHash } = await token.confidentialTransfer("0xRecipientAddress", 500n);
console.log("Transfer tx:", txHash);
```

{% endtab %}

{% tab title="React" %}

```tsx
import { useConfidentialTransfer } from "@zama-fhe/react-sdk";

const { mutateAsync: transfer, isPending } = useConfidentialTransfer({
  address: "0xEncryptedERC20Address",
});

const { txHash } = await transfer({
  to: "0xRecipientAddress",
  amount: 500n,
});
```

{% endtab %}
{% endtabs %}

The user sees a single wallet prompt. The encrypted amount is included in the transaction calldata -- it is unreadable to anyone without the FHE decryption key.

### 3. Send as an operator (transferFrom)

If an owner has approved you as an operator (via `token.setOperator()`), you can transfer on their behalf using `confidentialTransferFrom`:

{% tabs %}
{% tab title="Core SDK" %}

```ts
const { txHash } = await token.confidentialTransferFrom(
  "0xOwnerAddress",
  "0xRecipientAddress",
  500n,
);
```

{% endtab %}

{% tab title="React" %}

```tsx
import { useConfidentialTransferFrom } from "@zama-fhe/react-sdk";

const { mutateAsync: transferFrom } = useConfidentialTransferFrom("0xEncryptedERC20Address");

await transferFrom({
  from: "0xOwnerAddress",
  to: "0xRecipientAddress",
  amount: 500n,
});
```

{% endtab %}
{% endtabs %}

The operator must have been approved beforehand. Check approval status with `token.isOperator("0xHolder", "0xOperator")` or the `useConfidentialIsOperator` hook.

### 4. Handle the transaction result

Both the core SDK and React hooks resolve to a `TransactionResult` with the transaction `txHash` and its mined `receipt`. Use them to confirm the transaction or update your UI:

{% tabs %}
{% tab title="Core SDK" %}

```ts
const { txHash } = await token.confidentialTransfer("0xRecipient", 500n);

// Wait for on-chain confirmation
const receipt = await sdk.provider.waitForTransactionReceipt(txHash);
console.log("Confirmed in block:", receipt.blockNumber);

// Optionally check updated balance
const [address] = await walletClient.getAddresses();
const balance = await token.balanceOf(address);
console.log("New balance:", balance);
```

{% endtab %}

{% tab title="React" %}

```tsx
const {
  mutateAsync: transfer,
  isPending, // true while the transaction is in flight
  isSuccess, // true after the mutation completes
  error, // populated if the transfer fails
} = useConfidentialTransfer({
  address: "0xEncryptedERC20Address",
});

// Balance caches are invalidated automatically on success.
// The useConfidentialBalance hook picks up the updated balance
// on its next poll cycle — no manual refresh needed.
```

{% endtab %}
{% endtabs %}

### 5. (React) Use the transfer hook in a component

Here is a complete component that wires up the transfer with loading and error states:

```tsx
import { useConfidentialBalance, useConfidentialTransfer } from "@zama-fhe/react-sdk";
import { useAccount } from "wagmi";
import { matchZamaError } from "@zama-fhe/sdk";

const TOKEN = "0xEncryptedERC20Address";

function TransferForm() {
  const { address } = useAccount();
  const { data: balance } = useConfidentialBalance({ address: TOKEN, account: address });
  const {
    mutateAsync: transfer,
    isPending,
    error,
  } = useConfidentialTransfer({
    address: TOKEN,
  });

  const handleTransfer = async () => {
    await transfer({ to: "0xRecipient", amount: 100n });
  };

  const errorMessage = error
    ? matchZamaError(error, {
        SIGNING_REJECTED: () => "Transaction cancelled.",
        ENCRYPTION_FAILED: () => "Encryption failed — please retry.",
        TRANSACTION_REVERTED: () => "Transfer reverted — check your balance.",
        _: () => "Something went wrong.",
      })
    : null;

  return (
    <div>
      <p>Balance: {balance?.toString() ?? "Loading..."}</p>
      <button disabled={isPending} onClick={handleTransfer}>
        {isPending ? "Sending..." : "Send 100 tokens"}
      </button>
      {errorMessage && <p className="error">{errorMessage}</p>}
    </div>
  );
}
```

The `matchZamaError` helper maps SDK error codes to user-friendly messages. See the [Error Handling guide](/protocol/sdk/guides/handle-errors.md) for the full list of error types.

## Next steps

* [Shield Tokens](/protocol/sdk/guides/shield-tokens.md) — convert public ERC-20 tokens into confidential form
* [Token.confidentialTransfer reference](/protocol/sdk/api-references/sdk/token.md#confidentialtransfer) — full API signature
* [useConfidentialTransfer reference](/protocol/sdk/api-references/react/useconfidentialtransfer.md) — React hook details
* [useConfidentialTransferFrom reference](/protocol/sdk/api-references/react/useconfidentialtransferfrom.md) — operator transfer hook


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/guides/transfer-privately.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
