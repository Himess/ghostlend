> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/initialization.md).

# Setup

The use of `@zama-fhe/relayer-sdk` requires a setup phase. This consists of the instantiation of the `FhevmInstance`. This object holds all the configuration and methods needed to interact with an FHEVM using a Relayer. It can be created using the following code snippet:

```ts
import { createInstance } from "@zama-fhe/relayer-sdk";

const instance = await createInstance({
  // ACL_CONTRACT_ADDRESS (FHEVM Host chain)
  aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
  // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
  kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
  // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
  inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
  // DECRYPTION_ADDRESS (Gateway chain)
  verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
  // INPUT_VERIFICATION_ADDRESS (Gateway chain)
  verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  // FHEVM Host chain id
  chainId: 11155111,
  // Gateway chain id
  gatewayChainId: 55815,
  // Optional RPC provider to host chain
  network: "https://eth-sepolia.public.blastapi.io",
  // Relayer URL
  relayerUrl: "https://relayer.testnet.zama.cloud",
});
```

or the even simpler:

```ts
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk";

const instance = await createInstance(SepoliaConfig);
```

The information regarding the configuration of Sepolia's FHEVM and associated Relayer maintained by Zama can be found in the `SepoliaConfig` object or in the [contract addresses page](https://docs.zama.ai/protocol/solidity-guides/smart-contract/configure/contract_addresses). The `gatewayChainId` is `55815`. The `chainId` is the chain-id of the FHEVM chain, so for Sepolia it would be `11155111`.

{% hint style="info" %}
For more information on the Relayer's part in the overall architecture please refer to [the Relayer's page in the architecture documentation](https://docs.zama.ai/protocol/protocol/overview/relayer_oracle).
{% endhint %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/initialization.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
