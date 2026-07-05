> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/wrappersregistry.md).

# WrappersRegistry

High-level read interface for the on-chain `ConfidentialTokenWrappersRegistry` contract. Resolves the correct registry address for the current chain automatically.

## Import

```ts
import { WrappersRegistry, DefaultRegistryAddresses } from "@zama-fhe/sdk";
```

## Usage

### From ZamaSDK

The SDK exposes a shared registry instance via `sdk.registry`. This is the recommended way to access the registry — it shares the SDK's provider, chain registry addresses, and `registryTTL`, and maintains a single in-memory cache.

```ts
const pairs = await sdk.registry.listPairs({ page: 1 });
const result = await sdk.registry.getConfidentialToken(erc20Address);
```

You can also create a separate instance via `sdk.createWrappersRegistry()` (inherits `registryTTL` from the SDK):

```ts
const registry = sdk.createWrappersRegistry();
const pairs = await registry.getTokenPairs();
```

### Standalone

```ts
import { WrappersRegistry } from "@zama-fhe/sdk";

const registry = new WrappersRegistry({ provider });
const [isValid, cToken] = await registry.getConfidentialTokenAddress(tokenAddress);
```

### Custom chains

Override registry addresses for Hardhat or custom deployments:

```ts
// Via ZamaSDK
const registry = sdk.createWrappersRegistry({ [31337]: "0xYourHardhatRegistry" });

// Via constructor
const registry = new WrappersRegistry({
  provider,
  registryAddresses: { [31337]: "0xYourHardhatRegistry" },
});
```

## Constructor

### provider

`GenericProvider`

Provider for read-only contract calls. Any `GenericProvider` implementation works (e.g. the one created by `createConfig` or a custom implementation).

### registryAddresses

`Record<number, Address> | undefined`

Per-chain registry address overrides, merged on top of `DefaultRegistryAddresses`. Mainnet and Sepolia are configured by default — pass this only for custom or local chains.

### registryTTL

`number | undefined`

How long cached registry results remain valid, in seconds. Default: `86400` (24 hours).

```ts
const registry = new WrappersRegistry({
  provider,
  registryTTL: 3600, // 1 hour
});
```

## Methods

### getRegistryAddress

`() => Promise<Address>`

Resolves the registry contract address for the current chain. Throws `ConfigurationError` if no address is configured.

```ts
const registryAddr = await registry.getRegistryAddress();
```

### listPairs

`(options?: ListPairsOptions) => Promise<PaginatedResult<TokenWrapperPair | TokenWrapperPairWithMetadata>>`

List token wrapper pairs with page-based pagination. Pass `metadata: true` to enrich each pair with on-chain name, symbol, decimals, and totalSupply.

```ts
// Basic pagination
const page1 = await registry.listPairs({ page: 1, pageSize: 20 });
console.log(`${page1.total} pairs, showing page ${page1.page}`);

// With on-chain metadata
const enriched = await registry.listPairs({ metadata: true, pageSize: 10 });
for (const pair of enriched.items) {
  console.log(pair.underlying.symbol, "→", pair.confidential.symbol);
}
```

#### ListPairsOptions

| Option     | Type      | Default | Description                                          |
| ---------- | --------- | ------- | ---------------------------------------------------- |
| `page`     | `number`  | `1`     | Page number (1-indexed)                              |
| `pageSize` | `number`  | `100`   | Items per page                                       |
| `metadata` | `boolean` | `false` | Fetch on-chain metadata for both tokens in each pair |

### getConfidentialToken

`(tokenAddress: Address) => Promise<{ confidentialTokenAddress: Address; isValid: boolean } | null>`

Look up the confidential token for a given plain ERC-20. Returns `null` if no pair is registered. Negative lookups are cached for 5 minutes.

```ts
const result = await registry.getConfidentialToken(usdcAddress);
if (result) {
  console.log(result.confidentialTokenAddress, result.isValid);
}
```

### getUnderlyingToken

`(confidentialTokenAddress: Address) => Promise<{ tokenAddress: Address; isValid: boolean } | null>`

Reverse lookup — find the plain ERC-20 for a confidential token. Returns `null` if no pair is registered.

```ts
const result = await registry.getUnderlyingToken(cUsdcAddress);
if (result) {
  console.log(result.tokenAddress, result.isValid);
}
```

### refresh

`() => void`

Force-invalidate the in-memory cache. The next call to any read method will fetch fresh data from the chain.

```ts
registry.refresh();
```

### getTokenPairs

`() => Promise<readonly TokenWrapperPair[]>`

Fetch all token wrapper pairs from the registry.

```ts
const pairs = await registry.getTokenPairs();
for (const pair of pairs) {
  console.log(pair.tokenAddress, "→", pair.confidentialTokenAddress, pair.isValid);
}
```

### getTokenPairsLength

`() => Promise<bigint>`

Get the total number of registered token wrapper pairs.

```ts
const count = await registry.getTokenPairsLength();
```

### getTokenPairsSlice

`(fromIndex: bigint, toIndex: bigint) => Promise<readonly TokenWrapperPair[]>`

Fetch a range of pairs for pagination. `fromIndex` is inclusive, `toIndex` is exclusive.

```ts
const page = await registry.getTokenPairsSlice(0n, 10n);
```

### getTokenPair

`(index: bigint) => Promise<TokenWrapperPair>`

Fetch a single pair by index.

```ts
const pair = await registry.getTokenPair(0n);
```

### getConfidentialTokenAddress

`(tokenAddress: Address) => Promise<readonly [boolean, Address]>`

Look up the confidential token for a given plain ERC-20. Returns `[isValid, confidentialTokenAddress]`.

The three possible states:

* `[true, nonZeroAddress]` -- registered and valid
* `[false, nonZeroAddress]` -- registered but revoked (address is the former confidential token)
* `[false, zeroAddress]` -- not registered

```ts
const [isValid, cToken] = await registry.getConfidentialTokenAddress("0xUSDC");
if (isValid) {
  const token = sdk.createToken(cToken);
}
```

### getTokenAddress

`(confidentialTokenAddress: Address) => Promise<readonly [boolean, Address]>`

Reverse lookup — find the plain ERC-20 for a confidential token. Returns `[isValid, tokenAddress]`.

The three possible states mirror `getConfidentialTokenAddress`:

* `[true, nonZeroAddress]` -- registered and valid
* `[false, nonZeroAddress]` -- registered but revoked
* `[false, zeroAddress]` -- not registered

```ts
const [isValid, plainToken] = await registry.getTokenAddress("0xcUSDC");
```

### isConfidentialTokenValid

`(confidentialTokenAddress: Address) => Promise<boolean>`

Check whether a confidential token is registered and valid.

```ts
if (await registry.isConfidentialTokenValid("0xcUSDC")) {
  // Token is a known valid wrapper
}
```

## DefaultRegistryAddresses

`Record<number, Address>`

Exported map of built-in registry addresses for known chains. Includes Mainnet (`1`), Sepolia (`11155111`), and Hoodi (`560048`). Addresses are EIP-55 checksummed.

```ts
import { DefaultRegistryAddresses } from "@zama-fhe/sdk";

console.log(DefaultRegistryAddresses[1]); // "0xeb5015fF021DB115aCe010f23F55C2591059bBA0"
```

## Related

* [ZamaSDK](/protocol/sdk/api-references/sdk/zamasdk.md) — `sdk.registry` shared instance and `createWrappersRegistry()` factory
* [useListPairs](/protocol/sdk/api-references/react/uselistpairs.md) — React hook for paginated pair listing
* [useConfidentialTokenAddress](/protocol/sdk/api-references/react/useconfidentialtokenaddress.md) — React hook for forward lookup
* [useTokenAddress](/protocol/sdk/api-references/react/usetokenaddress.md) — React hook for reverse lookup
* [useIsConfidentialTokenValid](/protocol/sdk/api-references/react/useisconfidentialtokenvalid.md) — React hook for validity check
* [Contract Builders](/protocol/sdk/api-references/sdk/contract-builders.md) — low-level registry builders
* [Network Presets](/protocol/sdk/api-references/sdk/network-presets.md) — built-in chain configurations


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/wrappersregistry.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
