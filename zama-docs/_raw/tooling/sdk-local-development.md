> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/sdk/guides/local-development.md).

# Local development

The SDK ships a `cleartext()` relayer factory that creates a cleartext relayer, replacing FHE operations with cleartext operations. Values are stored as plaintext on-chain — no KMS, no gateway, no WASM. Use it for local Hardhat nodes, custom testnets, or any chain where you deploy FHEVM contracts in cleartext mode.

The `cleartext()` relayer factory implements the same `RelayerSDK` interface as `web()` and `node()`, so the rest of your code stays unchanged.

{% hint style="warning" %}
Cleartext mode is blocked on Ethereum Mainnet (chain 1) and Sepolia (chain 11155111). It is intended for development and testing only.
{% endhint %}

## SDK setup

### 1. Install packages

```bash
npm install @zama-fhe/sdk viem
```

### 2. Use the `cleartext()` relayer with `createConfig`

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { cleartext, ZamaSDK, memoryStorage } from "@zama-fhe/sdk";
import { hardhat } from "@zama-fhe/sdk/chains";
```

### 3. Create the config with a Hardhat chain

For a local Hardhat network, use the built-in `hardhat` chain object:

```ts
const config = createConfig({
  chains: [{ ...hardhat, executorAddress: "0xYourExecutorAddress" }],
  publicClient,
  walletClient,
  storage: memoryStorage,
  relayers: {
    [hardhat.id]: cleartext(),
  },
});

const sdk = new ZamaSDK(config);
```

The `executorAddress` is the deployed `CleartextFHEVMExecutor` contract address from your Hardhat setup. It must be set on the chain definition — `cleartext()` picks it up automatically.

### 4. Use the SDK normally

The wrapper API works the same as in production setups:

```ts
const wrappedToken = sdk.createWrappedToken("0xWrappedEncryptedERC20");
await wrappedToken.shield(1000n);
const [address] = await walletClient.getAddresses();
const balance = await wrappedToken.balanceOf(address);
```

### 5. (Optional) Create a custom config for your own chain

If you deploy FHEVM contracts on a custom chain or at different addresses than the default ones, pass all required fields to the chain definition used with the `cleartext()` relayer factory:

```ts
import { createConfig } from "@zama-fhe/sdk/viem";
import { cleartext, ZamaSDK } from "@zama-fhe/sdk";
import type { FheChain } from "@zama-fhe/sdk/chains";

const myHardhat = {
  id: 12345,
  network: "http://localhost:8545",
  gatewayChainId: 10901,
  aclContractAddress: "0x...",
  kmsContractAddress: "0x...",
  inputVerifierContractAddress: "0x...",
  verifyingContractAddressDecryption: "0x...",
  verifyingContractAddressInputVerification: "0x...",
  executorAddress: "0x...",
  registryAddress: undefined,
  relayerUrl: "",
} as const satisfies FheChain;

const config = createConfig({
  chains: [myHardhat],
  publicClient,
  walletClient,
  relayers: {
    [myHardhat.id]: cleartext(),
  },
});

const sdk = new ZamaSDK(config);
```

**Where to find these addresses:**

| Field                                       | Source                                            |
| ------------------------------------------- | ------------------------------------------------- |
| `aclContractAddress`                        | Deployed ACL contract address                     |
| `executorAddress`                           | Deployed CleartextFHEVMExecutor contract address  |
| `verifyingContractAddressDecryption`        | Decryption contract on the gateway chain          |
| `verifyingContractAddressInputVerification` | InputVerification contract on the gateway chain   |
| `gatewayChainId`                            | The chain ID where gateway contracts are deployed |

{% hint style="info" %}
Usually, you want to use the same `gatewayChainId` and verifying contract addresses as the Hardhat defaults. You can also provide optional `kmsSignerPrivateKey` and `inputSignerPrivateKey` fields for custom EIP-712 verification signers.
{% endhint %}

## Next steps

* [RelayerCleartext reference](/protocol/sdk/api-references/sdk/relayercleartext.md) — the cleartext relayer and its chain-definition fields
* [Configuration](/protocol/sdk/guides/configuration.md) — production setup with `web()` or `node()` relayer factories
* [Chain Objects](/protocol/sdk/api-references/sdk/network-presets.md) — pre-configured chain definitions for Mainnet, Sepolia, and more


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/sdk/guides/local-development.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
