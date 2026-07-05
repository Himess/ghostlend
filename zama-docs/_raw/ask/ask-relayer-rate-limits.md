# What are the relayer rate limits and is an API key required on Sepolia testnet?

## Relayer rate limits on Sepolia testnet

I cannot find any published **relayer rate limits** in the docs available here.

## Is an API key required on Sepolia testnet?

**Yes.** The relayer **requires an API key for every request**.

* For Sepolia testnet, the relayer endpoint is `https://relayer.testnet.zama.org` (see Sepolia contract/service addresses → **RELAYER\_URL**).
* For the **Zama-hosted relayer**, the only supported auth method is an **`x-api-key` header** (`ApiKeyHeader`). Requests without this header are rejected.

Use the docs here:

* [Authentication](/protocol/sdk/guides/authentication.md)
* [Relayer API keys](/protocol/sdk/guides/relayer-api-keys.md)
* Sepolia [Contract addresses](/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md) (includes `RELAYER_URL`)

### Practical note for dApps

If your dApp runs in the browser, you should use a **backend proxy** so the API key never reaches client-side code.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What’s Sepolia relayer rate limit docs?](https://docs.zama.org/protocol?ask=What%E2%80%99s%20Sepolia%20relayer%20rate%20limit%20docs%3F&goal=Build%20a%20confidential%20lending%20dApp%20on%20Sepolia)
- [Can I still test without proxy on Sepolia?](https://docs.zama.org/protocol?ask=Can%20I%20still%20test%20without%20proxy%20on%20Sepolia%3F&goal=Build%20a%20confidential%20lending%20dApp%20on%20Sepolia)
- [Where to find sample proxy code for Sepolia?](https://docs.zama.org/protocol?ask=Where%20to%20find%20sample%20proxy%20code%20for%20Sepolia%3F&goal=Build%20a%20confidential%20lending%20dApp%20on%20Sepolia)

# Sources:

- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Authentication](https://docs.zama.org/protocol/sdk/guides/authentication.md)
- [Node.js backend](https://docs.zama.org/protocol/sdk/guides/node-js-backend.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [Local development](https://docs.zama.org/protocol/sdk/guides/local-development.md)
- [Chains](https://docs.zama.org/protocol/protocol-apps/chains.md)
- [Relayer & Oracle](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md)
- [RelayerCleartext](https://docs.zama.org/protocol/sdk/api-references/sdk/relayercleartext.md)
- [Relayer SDK](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/sdk-overview.md)
- [FHEVM Metrics](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/metrics/metrics.md)
- [Staking](https://docs.zama.org/protocol/protocol-apps/staking.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [ZamaSDK](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/acl/reorgs_handling.md)

