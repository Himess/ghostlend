# How does a developer get testnet tokens to test confidential token flows on Sepolia (faucet or mint)?

On Sepolia, you don’t use a faucet for **mock confidential tokens**. Instead, you **mint the underlying ERC-20 test tokens**, then **shield** them into the confidential wrapper.

## 1) Mint test tokens (mocked confidential wrappers)

The Sepolia docs state that the **mocked** confidential wrappers wrap ERC-20 tokens deployed specifically for testing. Their underlying ERC-20s expose a **public** function:

* `mint(address to, uint256 amount)`
* with a limit of **1,000,000 tokens per call**

Example (USDC mock):

* Confidential wrapper: `cUSDCMock` = `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`
* Underlying token to mint: `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`

Source: [Sepolia → Confidential tokens (mocked)](/protocol/protocol-apps/addresses/testnet/sepolia.md)

## 2) Shield underlying → confidential

After you mint the underlying ERC-20, convert it into the confidential token by shielding (the SDK handles approval + wrap).

Core flow:

* create a `WrappedToken` for the **wrapper address**
* call `wrappedToken.shield(amount)`

See: [Shield tokens](/protocol/sdk/guides/shield-tokens.md)

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Where to mint on Sepolia?](https://docs.zama.org/protocol?ask=Where%20to%20mint%20on%20Sepolia%3F)
- [Which mock token wrapper exists?](https://docs.zama.org/protocol?ask=Which%20mock%20token%20wrapper%20exists%3F)
- [How to shield steps work?](https://docs.zama.org/protocol?ask=How%20to%20shield%20steps%20work%3F)

# Sources:

- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [erc7984-tutorial](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984-tutorial.md)
- [Token](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/token.md)
- [erc7984](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984.md)
- [Shield tokens](https://docs.zama.org/protocol/sdk/guides/shield-tokens.md)
- [Transfer privately](https://docs.zama.org/protocol/sdk/guides/transfer-privately.md)
- [Zama token quickstart](https://docs.zama.org/protocol/solidity-guides/v0.10/protocol-contracts/token.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)

