> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/relayernode.md).

# RelayerNode

Node.js relayer that runs FHE operations in native worker threads. The server-side counterpart to `RelayerWeb`.

{% hint style="warning" %}
`RelayerNode`, `NodeWorkerClient`, and `NodeWorkerPool` are internal classes — they are no longer exported from `@zama-fhe/sdk/node`. Use the `node()` transport factory with `createConfig` instead.
{% endhint %}

## Usage

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { ZamaSDK } from "@zama-fhe/sdk";
import { node } from "@zama-fhe/sdk/node";
import { sepolia } from "@zama-fhe/sdk/chains";

const config = createConfig({
  chains: [{ ...sepolia, auth: { __type: "ApiKeyHeader", value: process.env.RELAYER_API_KEY } }],
  publicClient,
  walletClient,
  relayers: {
    [sepolia.id]: node({ poolSize: 4 }),
  },
});

const sdk = new ZamaSDK(config);
```

## `node()` options

### poolSize

`number | undefined`

Number of native worker threads. Default: `min(CPU cores, 4)`. Must be a positive integer.

### fheArtifactStorage

`GenericStorage | undefined`

Persistent storage for caching the FHE encryption key and params.

### fheArtifactCacheTTL

`number | undefined`

How long cached FHE artifacts remain valid, in seconds. Must be a non-negative integer.

## Related

* [ZamaSDK](/protocol/sdk/api-references/sdk/zamasdk.md) — pass the config to the SDK constructor
* [RelayerWeb](/protocol/sdk/api-references/sdk/relayerweb.md) — browser variant using Web Workers and WASM
* [Configuration guide](/protocol/sdk/guides/configuration.md) — authentication and network presets


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/relayernode.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
