> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/event-decoders.md).

# Event decoders

Utilities for decoding raw `eth_getLogs` entries into typed event objects.

## Import

```ts
import {
  decodeOnChainEvents,
  TOKEN_TOPICS,
  decodeConfidentialTransfer,
  decodeWrap,
  decodeUnwrapRequested,
  decodeUnwrapFinalized,
  findWrap,
  findUnwrapRequested,
  // ACL delegation events
  ACL_TOPICS,
  decodeDelegatedForUserDecryption,
  decodeRevokedDelegationForUserDecryption,
  decodeAclEvent,
  decodeAclEvents,
  findDelegatedForUserDecryption,
  findRevokedDelegationForUserDecryption,
} from "@zama-fhe/sdk";
```

## decodeOnChainEvents

`(logs: RawLog[]) => OnChainEvent[]`

Decodes an array of raw log entries into typed event objects. Each returned event has an `.eventName` discriminator.

```ts
const logs = await publicClient.getLogs({
  address: tokenAddress,
  topics: [TOKEN_TOPICS],
});

const events = decodeOnChainEvents(logs);

for (const event of events) {
  switch (event.eventName) {
    case "ConfidentialTransfer":
      console.log(event.from, event.to, event.encryptedAmount);
      break;
    case "Wrap":
      console.log(event.to, event.roundedAmount, event.encryptedWrappedAmount);
      break;
    case "UnwrapRequested":
      console.log(event.receiver, event.unwrapRequestId);
      break;
    case "UnwrapFinalized":
      console.log(event.receiver, event.cleartextAmount);
      break;
  }
}
```

| Parameter | Type       | Description                                                 |
| --------- | ---------- | ----------------------------------------------------------- |
| `logs`    | `RawLog[]` | Raw log entries from `eth_getLogs` or a transaction receipt |

**Returns:** `OnChainEvent[]` — each event has an `.eventName` of `"ConfidentialTransfer"`, `"Wrap"`, `"UnwrapRequested"`, or `"UnwrapFinalized"`.

{% hint style="info" %}
A shield emits **both** a `ConfidentialTransfer(from=zeroAddress, …)` and a `Wrap` event. `Wrap.encryptedWrappedAmount` is the same FHE handle as the co-emitted `ConfidentialTransfer.encryptedAmount` — use `Wrap` as the shield marker (it carries the cleartext `roundedAmount`) and correlate the two halves rather than counting both.
{% endhint %}

## TOKEN\_TOPICS

`Hex[]`

Array of topic hashes for all supported token events. Pass this to `eth_getLogs` to fetch relevant logs in a single RPC call.

```ts
const logs = await publicClient.getLogs({
  address: tokenAddress,
  topics: [TOKEN_TOPICS],
  fromBlock: startBlock,
  toBlock: "latest",
});
```

## Individual decoders

Each decoder takes a single log entry and returns a typed event object, or `null` if the log does not match.

| Decoder                           | Event type             | Description                                  |
| --------------------------------- | ---------------------- | -------------------------------------------- |
| `decodeConfidentialTransfer(log)` | `ConfidentialTransfer` | Encrypted transfer between accounts          |
| `decodeWrap(log)`                 | `Wrap`                 | Tokens wrapped (shielded)                    |
| `decodeUnwrapRequested(log)`      | `UnwrapRequested`      | Unwrap initiated; includes `unwrapRequestId` |
| `decodeUnwrapFinalized(log)`      | `UnwrapFinalized`      | Unwrap completed; includes `unwrapRequestId` |

```ts
import { decodeConfidentialTransfer } from "@zama-fhe/sdk";

for (const log of receipt.logs) {
  const transfer = decodeConfidentialTransfer(log);
  if (transfer) {
    console.log(`Transfer from ${transfer.from} to ${transfer.to}`);
  }
}
```

## Convenience finders

Search a log array and return the first matching event.

### findWrap

`(logs: RawLog[]) => WrapEvent | null`

Finds the first `Wrap` event in a set of logs. Useful after a shield transaction.

```ts
import { findWrap } from "@zama-fhe/sdk";

const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash });
const wrapEvent = findWrap(receipt.logs);
if (wrapEvent) {
  console.log(`Wrapped ${wrapEvent.roundedAmount} tokens`);
}
```

### findUnwrapRequested

`(logs: RawLog[]) => UnwrapRequestedEvent | null`

Finds the first `UnwrapRequested` event in a set of logs. Useful after an unshield initiation.

```ts
import { findUnwrapRequested } from "@zama-fhe/sdk";

const unwrapEvent = findUnwrapRequested(receipt.logs);
if (unwrapEvent) {
  console.log(`Unwrap requested for ${unwrapEvent.encryptedAmount}`);
}
```

## ACL delegation events

The ACL contract emits events when delegations are created or revoked. These are separate from token events — they use their own topic hashes and decoders.

### Import

```ts
import {
  ACL_TOPICS,
  AclTopics,
  decodeDelegatedForUserDecryption,
  decodeRevokedDelegationForUserDecryption,
  decodeAclEvent,
  decodeAclEvents,
  findDelegatedForUserDecryption,
  findRevokedDelegationForUserDecryption,
} from "@zama-fhe/sdk";
```

### ACL\_TOPICS

`Hex[]`

Array of topic hashes for both ACL delegation events. Pass this to `eth_getLogs` to fetch delegation events from the ACL contract.

```ts
const logs = await publicClient.getLogs({
  address: aclAddress,
  topics: [ACL_TOPICS],
  fromBlock: startBlock,
  toBlock: "latest",
});
```

### Individual decoders

| Decoder                                         | Event type                           | Description                   |
| ----------------------------------------------- | ------------------------------------ | ----------------------------- |
| `decodeDelegatedForUserDecryption(log)`         | `DelegatedForUserDecryption`         | Delegation created or renewed |
| `decodeRevokedDelegationForUserDecryption(log)` | `RevokedDelegationForUserDecryption` | Delegation revoked            |

### DelegatedForUserDecryptionEvent

| Field               | Type      | Description                                 |
| ------------------- | --------- | ------------------------------------------- |
| `eventName`         | `string`  | `"DelegatedForUserDecryption"`              |
| `delegator`         | `Address` | Account granting access                     |
| `delegate`          | `Address` | Account receiving access                    |
| `contractAddress`   | `Address` | Contract the delegation applies to          |
| `delegationCounter` | `bigint`  | Monotonic delegation counter                |
| `oldExpirationDate` | `bigint`  | Previous expiration (0 if first delegation) |
| `newExpirationDate` | `bigint`  | New expiration timestamp                    |

### RevokedDelegationForUserDecryptionEvent

| Field               | Type      | Description                            |
| ------------------- | --------- | -------------------------------------- |
| `eventName`         | `string`  | `"RevokedDelegationForUserDecryption"` |
| `delegator`         | `Address` | Account that granted access            |
| `delegate`          | `Address` | Account that had access                |
| `contractAddress`   | `Address` | Contract the revocation applies to     |
| `delegationCounter` | `bigint`  | Monotonic delegation counter           |
| `oldExpirationDate` | `bigint`  | Expiration date before revocation      |

### Convenience finders

| Finder                                         | Returns                                                 |
| ---------------------------------------------- | ------------------------------------------------------- |
| `findDelegatedForUserDecryption(logs)`         | First `DelegatedForUserDecryptionEvent` or null         |
| `findRevokedDelegationForUserDecryption(logs)` | First `RevokedDelegationForUserDecryptionEvent` or null |

### Batch decoders

| Decoder                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `decodeAclEvent(log)`   | Try both ACL decoders on a single log, return first match    |
| `decodeAclEvents(logs)` | Batch-decode an array of logs, skipping unrecognized entries |

{% hint style="info" %}
ACL delegation events are **not** included in `TOKEN_TOPICS` or `decodeOnChainEvents`. They are emitted by the ACL contract, not by token contracts. Use `ACL_TOPICS` and `decodeAclEvents` separately.
{% endhint %}

## Related

* [Delegated Decryption](/protocol/sdk/api-references/sdk/delegation.md) — delegation API with on-chain event examples
* [Token](/protocol/sdk/api-references/sdk/token.md) — high-level API for token operations


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/event-decoders.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
