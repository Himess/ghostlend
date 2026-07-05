# Do I need a Zama relayer API key when using the Sepolia testnet relayer at relayer.testnet.zama.org, both with the legacy @zama-fhe/relayer-sdk and the new @zama-fhe/sdk? How do I get a testnet key if so?

## Do you need a Zama relayer API key on Sepolia (`relayer.testnet.zama.org`)?

Yes—your setup must authenticate every Relayer request. The Relayer **requires an API key for every request**. See Authentication and Relayer API keys.

For the **Zama-hosted Relayer endpoint**, only `ApiKeyHeader` works (sent as `x-api-key`). `BearerToken` and `ApiKeyCookie` are rejected at the edge. This applies to the hosted relayer generally, regardless of whether you’re using the legacy `@zama-fhe/relayer-sdk` or the new `@zama-fhe/sdk`—you configure the relayer auth the same way at the HTTP layer. See the auth methods reference.

### What to set

Use:

```ts
auth: { __type: "ApiKeyHeader", value: process.env.RELAYER_API_KEY! }
```

(For browser dApps, use the backend proxy pattern and inject `x-api-key` server-side.)

## How do you get a *testnet* key?

I cannot find any docs page that defines a separate “testnet key” flow for `relayer.testnet.zama.org`.

The only documented process is the hosted-relayer API key application (“Apply for an API key”) on Relayer API keys. If you specifically need a Sepolia/testnet credential, that page is where the Zama team directs requests—there’s no other documented testnet-key endpoint here.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Where to apply for testnet key?](https://docs.zama.org/protocol?ask=Where%20to%20apply%20for%20testnet%20key%3F&goal=Ship%20a%20confidential%20lending%20dApp%20frontend%20on%20Sepolia%20for%20the%20Zama%20Developer%20Program)
- [Is ApiKeyHeader required for Sepolia?](https://docs.zama.org/protocol?ask=Is%20ApiKeyHeader%20required%20for%20Sepolia%3F&goal=Ship%20a%20confidential%20lending%20dApp%20frontend%20on%20Sepolia%20for%20the%20Zama%20Developer%20Program)
- [Can I test with a proxy pattern?](https://docs.zama.org/protocol?ask=Can%20I%20test%20with%20a%20proxy%20pattern%3F&goal=Ship%20a%20confidential%20lending%20dApp%20frontend%20on%20Sepolia%20for%20the%20Zama%20Developer%20Program)

# Sources:

- [Relayer API keys](https://docs.zama.org/protocol/sdk/guides/relayer-api-keys.md)
- [Relayer SDK](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/sdk-overview.md)
- [Authentication](https://docs.zama.org/protocol/sdk/guides/authentication.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Overview](https://docs.zama.org/protocol/sdk/overview.md)
- [Build a web application](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/webapp.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Unshield tokens](https://docs.zama.org/protocol/sdk/guides/unshield-tokens.md)
- [Relayer & Oracle](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md)
- [Contract addresses](https://docs.zama.org/protocol/protocol-apps/addresses.md)
- [ZamaSDK](https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md)

