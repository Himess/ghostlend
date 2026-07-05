> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/sdk/relayerweb.md).

# RelayerWeb

Browser relayer that runs FHE operations in a Web Worker via WASM. Handles encryption, decryption, and transport key pair management for browser applications.

## Import

```ts
import { RelayerWeb } from "@zama-fhe/sdk/web";
```

{% hint style="info" %}
For most applications, prefer the `web()` transport factory with `createConfig` instead of constructing `RelayerWeb` directly. See [Network Presets](/protocol/sdk/api-references/sdk/network-presets.md) for examples.
{% endhint %}

## Usage

{% tabs %}
{% tab title="Recommended (web transport)" %}

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { web } from "@zama-fhe/sdk/web";
import { sepolia } from "@zama-fhe/sdk/chains";

const config = createConfig({
  chains: [sepolia],
  publicClient,
  walletClient,
  relayers: {
    [sepolia.id]: web(),
  },
});
```

{% endtab %}

{% tab title="Direct construction" %}

```ts
import { RelayerWeb } from "@zama-fhe/sdk/web";
import { sepolia } from "@zama-fhe/sdk/chains";

const relayer = new RelayerWeb({
  chain: sepolia,
  worker: relayerWorkerClient,
});
```

{% endtab %}
{% endtabs %}

## Constructor (`RelayerWebConfig`)

### chain

`FheChain`

FHE chain configuration. Use a built-in chain preset (`sepolia`, `mainnet`, `hoodi`, `hardhat`) or a custom `FheChain` object.

### worker

`RelayerWorkerClient`

Worker client that handles WASM operations off the main thread.

### security

`RelayerWebSecurityConfig | undefined`

Security options for the WASM bundle and relayer requests.

| Field            | Type           | Description                                         |
| ---------------- | -------------- | --------------------------------------------------- |
| `integrityCheck` | `boolean`      | Verify SHA-384 of the WASM bundle. Default: `true`. |
| `getCsrfToken`   | `() => string` | Returns a CSRF token to attach to relayer requests. |

### threads

`number | undefined`

Number of WASM threads for parallel FHE operations inside the Web Worker. Default: `1` (single-threaded). The practical sweet spot is 4-8 threads; beyond that, diminishing returns and higher memory usage.

{% hint style="warning" %}
Multi-threading requires [COOP/COEP headers](https://web.dev/articles/coop-coep) for `SharedArrayBuffer` access:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, the browser blocks `SharedArrayBuffer` and the relayer falls back to single-threaded mode.
{% endhint %}

### fheArtifactStorage

`GenericStorage | undefined`

Persistent storage for caching the FHE encryption key and params across sessions.

### fheArtifactCacheTTL

`number | undefined`

How long cached FHE artifacts remain valid, in seconds.

## Related

* [ZamaSDK](/protocol/sdk/api-references/sdk/zamasdk.md) — pass the relayer to the SDK constructor
* [RelayerNode](/protocol/sdk/api-references/sdk/relayernode.md) — Node.js variant using worker threads
* [Configuration guide](/protocol/sdk/guides/configuration.md) — authentication and network presets


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/sdk/relayerweb.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
