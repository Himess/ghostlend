> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/guides/check-balances.md).

# Check balances

Confidential balances are stored on-chain as encrypted values. To display a human-readable number, the SDK decrypts them using FHE permits tied to the user's wallet. This guide walks through reading balances, understanding the caching layer, and working with multiple tokens.

## Steps

### 1. Read your own balance

Call `balanceOf()` on a [`Token`](/protocol/sdk/api-references/sdk/token.md) instance. The SDK fetches the encrypted value from the chain, decrypts it, and returns a `bigint`.

{% tabs %}
{% tab title="SDK" %}

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { ZamaSDK } from "@zama-fhe/sdk";
import { web } from "@zama-fhe/sdk/web";
import { sepolia } from "@zama-fhe/sdk/chains";

const config = createConfig({
  chains: [sepolia],
  publicClient,
  walletClient,
  storage,
  relayers: { [sepolia.id]: web() },
});
const sdk = new ZamaSDK(config);
const token = sdk.createToken("0xEncryptedERC20");

const [address] = await walletClient.getAddresses();
const balance = await token.balanceOf(address);
console.log(`Confidential balance: ${balance}`);
```

{% endtab %}
{% endtabs %}

### 2. Understand the first-time wallet signature

The first `balanceOf(address)` call for a token prompts the user's wallet for an EIP-712 signature. This creates FHE decrypt permits that are cached in your storage backend. Subsequent reads are silent -- no wallet popup.

{% hint style="info" %}
**In React apps, don't trigger this signature on render.** Gate `useConfidentialBalance` behind `useHasPermit` and let the user click an explicit "Decrypt" button. See [Avoid blind-sign wallet popups](/protocol/sdk/guides/encrypt-decrypt.md#gating-useconfidentialbalance) for the full pattern.
{% endhint %}

If the user rejects the signature, the SDK throws a `SigningRejectedError`. See [Handle Errors](/protocol/sdk/guides/handle-errors.md) for recovery patterns.

You can pre-authorize multiple tokens with a single signature using `sdk.permits.grantPermit()`:

{% tabs %}
{% tab title="SDK" %}

```ts
await sdk.permits.grantPermit(["0xTokenA", "0xTokenB"]);

const tokenA = sdk.createToken("0xTokenA");
const tokenB = sdk.createToken("0xTokenB");
// All subsequent balanceOf() calls are silent
```

{% endtab %}
{% endtabs %}

### 3. Balance caching

Decrypted balances are automatically cached in your storage backend (IndexedDB, async local storage, etc.). This means:

* **No spinner on page reload** -- if a balance was previously decrypted, it is returned instantly from cache instead of re-running the 2-5 second FHE decryption.
* **Automatic invalidation** -- the cache key includes the on-chain encrypted value, so when a transfer, shield, or unshield changes the balance, the old cache entry is naturally bypassed.
* **Best-effort** -- cache reads and writes never throw. If storage is unavailable, the SDK falls back to a fresh decryption silently.

The cache is keyed by `token address + owner address + encrypted value`.

### 4. Work with raw encrypted values

Sometimes you need the encrypted value itself, for example to check whether a balance exists before attempting decryption.

{% tabs %}
{% tab title="SDK" %}

```ts
import { isEncryptedValueZero } from "@zama-fhe/sdk";

const encryptedValue = await token.confidentialBalanceOf(userAddress);

// Check if the encrypted value is zero (account has never shielded)
if (isEncryptedValueZero(encryptedValue)) {
  console.log("No confidential balance yet");
}

// Decrypt an encrypted value you already have
const result = await sdk.decryption.decryptValues([
  { encryptedValue, contractAddress: token.address },
]);
const value = result[encryptedValue] as bigint;

// Decrypt multiple encrypted values at once (must include the contract address per entry)
const decrypted = await sdk.decryption.decryptValues(
  [value1, value2, value3].map((v) => ({ encryptedValue: v, contractAddress: token.address })),
);
```

{% endtab %}
{% endtabs %}

### 5. Distinguish "no balance" from "zero balance"

These are different situations that your UI should handle separately:

* **`NoCiphertextError`** -- the account has never shielded tokens. There is no encrypted balance to decrypt. Show something like "No confidential balance" in your UI.
* **Balance of `0n`** -- the account has shielded before but currently holds zero. Show "Balance: 0".

{% tabs %}
{% tab title="SDK" %}

```ts
import { NoCiphertextError } from "@zama-fhe/sdk";

try {
  const [address] = await walletClient.getAddresses();
  const balance = await token.balanceOf(address);
  showBalance(balance); // could be 0n
} catch (error) {
  if (error instanceof NoCiphertextError) {
    showEmptyState("Shield tokens to get started");
  }
}
```

{% endtab %}
{% endtabs %}

### 6. Batch decrypt across multiple tokens

When your app manages a portfolio of confidential tokens, use batch operations to minimize wallet prompts and parallelize decryption.

{% tabs %}
{% tab title="SDK" %}

```ts
import { Token } from "@zama-fhe/sdk";

// One wallet signature covers all tokens
await sdk.permits.grantPermit(addresses);

const tokens = addresses.map((a) => sdk.createToken(a));

// Decrypt all balances in parallel
const { results, errors } = await Token.batchBalancesOf(tokens, userAddress);

// `results` is Map<Address, bigint> for tokens that decrypted successfully,
// `errors` is Map<Address, ZamaError> for tokens that failed — partial failure
// never rejects the whole batch.
for (const [address, balance] of results) {
  console.log(address, balance);
}
```

{% endtab %}
{% endtabs %}

### 7. Read token metadata

Before displaying balances, you typically want the token's name, symbol, and decimals. Use the `useMetadata` hook:

```tsx
import { useMetadata } from "@zama-fhe/react-sdk";

const { data: meta } = useMetadata("0xToken");

// meta.name, meta.symbol, meta.decimals
```

See [useMetadata reference](/protocol/sdk/api-references/react/usemetadata.md) for full options.

### 8. Use the balance hooks in React

The React SDK provides hooks that handle polling, caching, and React Query integration out of the box.

{% tabs %}
{% tab title="Single token" %}

```tsx
import { useConfidentialBalance } from "@zama-fhe/react-sdk";
import { useAccount } from "wagmi";

const { address } = useAccount();
const {
  data: balance,
  isLoading,
  error,
} = useConfidentialBalance(
  {
    address: "0xToken",
    account: address,
  },
  { refetchInterval: 5_000 },
);
```

{% endtab %}

{% tab title="Multiple tokens" %}

```tsx
import { useConfidentialBalances } from "@zama-fhe/react-sdk";
import { useAccount } from "wagmi";

const { address } = useAccount();
const { data } = useConfidentialBalances({
  addresses: ["0xTokenA", "0xTokenB", "0xTokenC"],
  account: address,
});

const tokenABalance = data?.results.get("0xTokenA");
```

{% endtab %}
{% endtabs %}

`useConfidentialBalance` calls `token.balanceOf(owner)` which reads the on-chain encrypted value and decrypts via the SDK. Cached clear values are served instantly — the relayer is only hit when the encrypted value changes. Pass `refetchInterval` to poll for updates. Clear values are persisted in storage, so page reloads show the balance instantly.

### 9. Force a manual refresh

Mutations automatically invalidate balance caches, but if you need manual control (for example, after an external contract interaction), use `zamaQueryKeys`:

{% tabs %}
{% tab title="React" %}

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { zamaQueryKeys } from "@zama-fhe/sdk/query";

const queryClient = useQueryClient();

// Invalidate all balance queries
queryClient.invalidateQueries({
  queryKey: zamaQueryKeys.confidentialBalance.all,
});

// Invalidate one token
queryClient.invalidateQueries({
  queryKey: zamaQueryKeys.confidentialBalance.token("0xToken"),
});
```

{% endtab %}
{% endtabs %}

## Next steps

* See [Avoid blind-sign wallet popups](/protocol/sdk/guides/encrypt-decrypt.md#gating-useconfidentialbalance) to gate balance queries behind explicit user action.
* See [Token Operations](/protocol/sdk/api-references/sdk/token.md) for the full `Token` API.
* See [Hooks](/protocol/sdk/api-references/react/query-keys.md) for `useConfidentialBalance`, `useConfidentialBalances`, and query key details.
* To handle `NoCiphertextError` and other failures, see [Handle Errors](/protocol/sdk/guides/handle-errors.md).


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/guides/check-balances.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
