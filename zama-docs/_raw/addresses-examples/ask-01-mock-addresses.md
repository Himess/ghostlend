# What are the addresses of cUSDCMock and cWETHMock on Sepolia, what are their underlying ERC-20 mock tokens, and do the underlying mocks have public mint functions for testing?

On **Sepolia**, the confidential wrapper addresses and their underlying ERC-20 mocks are:

* **`cUSDCMock`**
  * Wrapper (ERC-7984) address: `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`
  * Underlying ERC-20 mock token: `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF`
  * Underlying mock minting: **public** `mint(address to, uint256 amount)` with a **1,000,000 token per call** limit
* **`cWETHMock`**
  * Wrapper (ERC-7984) address: `0x46208622DA27d91db4f0393733C8BA082ed83158`
  * Underlying ERC-20 mock token: `0xff54739b16576FA5402F211D0b938469Ab9A5f3F`
  * Underlying mock minting: **public** `mint(address to, uint256 amount)` with a **1,000,000 token per call** limit

This is documented on the Sepolia testnet addresses page here: [Sepolia](/protocol/protocol-apps/addresses/testnet/sepolia.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What are cUSDTMock and cBRONMock addresses?](https://docs.zama.org/protocol?ask=What%20are%20cUSDTMock%20and%20cBRONMock%20addresses%3F)
- [Do all underlying mocks have public mint?](https://docs.zama.org/protocol?ask=Do%20all%20underlying%20mocks%20have%20public%20mint%3F)
- [Any mint limits besides 1M per call?](https://docs.zama.org/protocol?ask=Any%20mint%20limits%20besides%201M%20per%20call%3F)

# Sources:

- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [ERC-20 to Wrapped ERC-7984](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/api-references/sdk/wrappedtoken.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/wrappedtoken.md)
- [Contract builders](https://docs.zama.org/protocol/sdk/api-references/sdk/contract-builders.md)

