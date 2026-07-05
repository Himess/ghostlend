> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/api-references/react/zamaprovider.md).

# ZamaProvider

Context provider that supplies the Zama SDK to all descendant hooks. Wrap your application (or the subtree that uses confidential tokens) with this component.

## Import

```ts
import { ZamaProvider } from "@zama-fhe/react-sdk";
```

## Usage

{% tabs %}
{% tab title="wagmi setup" %}

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: { [sepolia.id]: http("https://sepolia.infura.io/v3/YOUR_KEY") },
});

const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: "https://your-app.com/api/relayer/11155111",
  network: "https://sepolia.infura.io/v3/YOUR_KEY",
} as const satisfies FheChain;

const zamaConfig = createZamaConfig({
  chains: [mySepolia],
  wagmiConfig,
  relayers: {
    [mySepolia.id]: web(),
  },
});
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaProvider config={zamaConfig}>
          <YourApp />
        </ZamaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

{% endtab %}

{% tab title="viem setup" %}

```tsx
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { web } from "@zama-fhe/sdk/web";
import { createConfig } from "@zama-fhe/sdk/viem";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://sepolia.infura.io/v3/YOUR_KEY"),
});
const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum!),
});

const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: "https://your-app.com/api/relayer/11155111",
} as const satisfies FheChain;

const zamaConfig = createConfig({
  chains: [mySepolia],
  publicClient,
  walletClient,
  relayers: {
    [mySepolia.id]: web(),
  },
});
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ZamaProvider config={zamaConfig}>
        <YourApp />
      </ZamaProvider>
    </QueryClientProvider>
  );
}
```

{% endtab %}

{% tab title="cleartext (local dev)" %}

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { cleartext } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/viem";
import { hardhat } from "@zama-fhe/sdk/chains";

const zamaConfig = createConfig({
  chains: [hardhat],
  publicClient,
  walletClient,
  relayers: {
    [hardhat.id]: cleartext(),
  },
});
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ZamaProvider config={zamaConfig}>
        <YourApp />
      </ZamaProvider>
    </QueryClientProvider>
  );
}
```

{% endtab %}
{% endtabs %}

## Props

```ts
import { type ZamaProviderProps } from "@zama-fhe/react-sdk";
```

### config

`ZamaConfig`

Configuration object created by [`createConfig`](/protocol/sdk/guides/configuration.md). Wires together chains, relayers, signer, and storage for the SDK.

## Related

* [Configuration guide](/protocol/sdk/guides/configuration.md)
* [Permit Model](/protocol/sdk/concepts/permit-model.md)


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/api-references/react/zamaprovider.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
