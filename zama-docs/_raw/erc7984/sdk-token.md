> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/token.md).

# Token

`Token` is the high-level ERC-20-style interface for an ERC-7984 confidential token. It hides FHE complexity (encryption, decryption, EIP-712 signing) behind familiar methods.

For ERC-7984 ERC-20 wrappers (shield / unshield / allowance), use [`WrappedToken`](/protocol/sdk/api-references/sdk/wrappedtoken.md) instead — it extends `Token` with wrapper-specific operations.

## Import

Created via [`sdk.createToken()`](/protocol/sdk/api-references/sdk/zamasdk.md):

```ts
import { ZamaSDK } from "@zama-fhe/sdk";

const sdk = new ZamaSDK(config); // config from createConfig()
const token = sdk.createToken("0xConfidentialToken");

const balance = await token.balanceOf(ownerAddress);
await token.confidentialTransfer("0xRecipient", 500n);
```

For shield / unshield, create a `WrappedToken` via `sdk.createWrappedToken("0xWrapper")` — see [`WrappedToken`](/protocol/sdk/api-references/sdk/wrappedtoken.md).

## Methods

### balanceOf

`(owner: Address) => Promise<bigint>`

Returns the decrypted confidential balance. The first call prompts a wallet signature to create FHE permits; subsequent calls use cached permits silently. Decrypted values are cached in storage automatically.

```ts
const balance = await token.balanceOf("0xOwnerAddress");
```

### confidentialBalanceOf

`(owner: Address) => Promise<EncryptedValue>`

Returns the raw encrypted value without decrypting. Use with `isEncryptedValueZero()` or pass to `sdk.decryption.decryptValues()` for decryption.

```ts
const encryptedValue = await token.confidentialBalanceOf("0xOwnerAddress");
```

### decryptBalanceAs

`({ delegatorAddress, accountAddress? }) => Promise<bigint>`

Decrypt a delegator's balance using delegated credentials. The connected wallet must hold an active delegation from `delegatorAddress` covering this token's contract.

```ts
const balance = await token.decryptBalanceAs({ delegatorAddress: "0xDelegator" });
```

### confidentialTransfer

`(to: Address, amount: bigint, options?: TransferOptions) => Promise<TransactionResult>`

Transfers encrypted tokens. The amount is encrypted before hitting the chain.

By default, the SDK validates the confidential balance before submitting. If credentials are cached, it auto-decrypts silently. Set `skipBalanceCheck: true` to bypass (e.g. for smart wallets that cannot produce EIP-712 signatures).

| Option                | Type               | Default | Description                          |
| --------------------- | ------------------ | ------- | ------------------------------------ |
| `skipBalanceCheck`    | `boolean`          | `false` | Skip balance validation              |
| `onEncryptComplete`   | `() => void`       | —       | Fired after FHE encryption completes |
| `onTransferSubmitted` | `(txHash) => void` | —       | Fired after transfer tx submitted    |

```ts
await token.confidentialTransfer("0xRecipient", 500n);

// Smart wallet (skip balance check)
await token.confidentialTransfer("0xRecipient", 500n, { skipBalanceCheck: true });
```

**Throws:**

* `InsufficientConfidentialBalanceError` — if the confidential balance is less than `amount` (exposes `requested`, `available`, `token`)
* `BalanceCheckUnavailableError` — if balance validation is required but decryption is not possible (no stored permits). Call `sdk.permits.grantPermit([token.address])` first or use `skipBalanceCheck: true`

### confidentialTransferFrom

`(from: Address, to: Address, amount: bigint, callbacks?: TransferCallbacks) => Promise<TransactionResult>`

Operator transfer on behalf of an address that has approved you.

```ts
await token.confidentialTransferFrom("0xFrom", "0xTo", 500n);
```

### setOperator

`(operator: Address, until?: number) => Promise<{ txHash: Hex; receipt: TransactionReceipt }>`

Approves another address to operate on your confidential tokens (e.g. a DEX or multisig). Default duration: 1 hour.

```ts
// Approve for 1 hour (default)
await token.setOperator("0xOperator");

// Approve until a specific timestamp
await token.setOperator("0xOperator", futureTimestamp);
```

### isOperator

`(holder: Address, spender: Address) => Promise<boolean>`

Checks whether a spender is currently an approved operator for a given holder.

```ts
const approved = await token.isOperator("0xHolder", "0xSpender");
```

### name / symbol / decimals

ERC-20-style metadata reads. Each returns a `Promise` of the value.

```ts
const name = await token.name();
const symbol = await token.symbol();
const decimals = await token.decimals();
```

### isConfidential / isWrapper

ERC-165 introspection.

```ts
const isErc7984 = await token.isConfidential();
const isWrapper = await token.isWrapper();
```

### Token.batchBalancesOf *(static)*

`(tokens: Token[], owner: Address) => Promise<BatchBalancesResult>`

Decrypts multiple balances in one batch.

### Token.batchDecryptBalancesAs *(static)*

`(tokens: Token[], options: BatchDecryptAsOptions) => Promise<Map<Address, bigint>>`

Batch delegated decryption.

## Related

* [ZamaSDK](/protocol/sdk/api-references/sdk/zamasdk.md) — creates `Token` via `createToken()`
* [WrappedToken](/protocol/sdk/api-references/sdk/wrappedtoken.md) — extends `Token` with shield / unshield / allowance / wrapper operations


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/token.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
