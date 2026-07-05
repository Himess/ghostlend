> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/overview.md).

# Overview

**Welcome to the Zama SDK!**

{% hint style="info" %}
**Looking for the legacy Relayer SDK?**

This is the new default SDK for building on the Zama Protocol. The legacy `@zama-fhe/relayer-sdk` lives at [github.com/zama-ai/relayer-sdk](https://github.com/zama-ai/relayer-sdk).
{% endhint %}

## Where to go next

If you're new to the Zama Protocol, start with the [Litepaper](https://docs.zama.org/protocol/zama-protocol-litepaper) or the [Protocol Overview](https://docs.zama.org/protocol) to understand the foundations.

Otherwise:

🟨 Go to [**Quick start**](/protocol/sdk/getting-started/quick-start.md) to get from zero to a working confidential transfer in under 5 minutes.

🟨 Go to [**Build your first confidential dApp**](/protocol/sdk/getting-started/first-confidential-dapp.md) for an end-to-end React tutorial.

🟨 Go to [**Configuration**](/protocol/sdk/guides/configuration.md) for step-by-step instructions on shielding, transfers, balances, and more.

🟨 Go to [**SDK reference**](/protocol/sdk/api-references/sdk.md) for the full core SDK API.

🟨 Go to [**React reference**](/protocol/sdk/api-references/react.md) for all React hooks and components.

## Features

### Shield & unshield

Convert public ERC-20 tokens into encrypted form and back. The SDK handles approvals, encryption, and the two-step unshield flow.

### Confidential transfers

Encrypt amounts client-side before submitting on-chain. On-chain observers see the transaction but never the value.

### React hooks

TanStack Query-based hooks with cached decryption, automatic cache invalidation, and one-signature permit management.

## Two packages, one import

| Package                                                                     | Use when...                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@zama-fhe/sdk`](/protocol/sdk/api-references/sdk/zamasdk.md)              | You are building with vanilla TypeScript, Node.js, or any non-React framework |
| [`@zama-fhe/react-sdk`](/protocol/sdk/api-references/react/zamaprovider.md) | You are building a React app (hooks and React-specific providers)             |

If you are using React, install both packages: `@zama-fhe/react-sdk` provides the hooks and `ZamaProvider`, while `@zama-fhe/sdk` is a peer dependency that provides core utilities, relayer factories, chain presets, and error helpers. For wagmi apps, build the config with `createConfig` from `@zama-fhe/react-sdk/wagmi` and pass it to `<ZamaProvider config={zamaConfig}>`. For non-React apps, use `createConfig` from `@zama-fhe/sdk/viem` or `@zama-fhe/sdk/ethers`.

## Install

{% tabs %}
{% tab title="pnpm" %}

```sh
# React app
pnpm add @zama-fhe/react-sdk @zama-fhe/sdk @tanstack/react-query

# Vanilla TypeScript / Node.js
pnpm add @zama-fhe/sdk
```

{% endtab %}

{% tab title="npm" %}

```sh
# React app
npm install @zama-fhe/react-sdk @zama-fhe/sdk @tanstack/react-query

# Vanilla TypeScript / Node.js
npm install @zama-fhe/sdk
```

{% endtab %}

{% tab title="yarn" %}

```sh
# React app
yarn add @zama-fhe/react-sdk @zama-fhe/sdk @tanstack/react-query

# Vanilla TypeScript / Node.js
yarn add @zama-fhe/sdk
```

{% endtab %}
{% endtabs %}

## Your first confidential transfer in 30 seconds

```ts
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { createConfig } from "@zama-fhe/sdk/viem";
import { ZamaSDK } from "@zama-fhe/sdk";
import { web } from "@zama-fhe/sdk/web";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

const publicClient = createPublicClient({ chain: sepolia, transport: http() });
const walletClient = createWalletClient({ chain: sepolia, transport: custom(window.ethereum!) });

const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: "https://your-app.com/api/relayer/11155111",
} as const satisfies FheChain;

const config = createConfig({
  chains: [mySepolia],
  publicClient,
  walletClient,
  relayers: { [mySepolia.id]: web() },
});

const sdk = new ZamaSDK(config);
const wrappedToken = sdk.createWrappedToken("0xYourWrappedToken");

await wrappedToken.shield(1000n); // deposit public tokens
const [address] = await walletClient.getAddresses();
const balance = await wrappedToken.balanceOf(address); // decrypt your balance
await wrappedToken.confidentialTransfer("0xRecipient", 500n); // private send
await wrappedToken.unshield(500n); // withdraw back to public
```

Ready to build? Jump to the [Quick start](/protocol/sdk/getting-started/quick-start.md) for a full working example with your stack.

## Help center

Ask technical questions, discuss with the community, or report a bug.

* [Community forum](https://community.zama.org/c/zama-protocol/15)
* [Discord channel](https://discord.com/invite/zama)
* [Open an issue](https://github.com/zama-ai/sdk/issues) on the SDK repository


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/overview.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
