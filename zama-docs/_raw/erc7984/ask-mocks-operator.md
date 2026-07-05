# Are the Sepolia testnet confidential token mocks like cUSDCMock and cWETHMock instances of the same ConfidentialWrapper contract with full ERC-7984 operator and confidentialTransferFrom support? Which OpenZeppelin confidential-contracts version are they built on?

## 1) Are `cUSDCMock` and `cWETHMock` the same wrapper contract type, with `setOperator` + `confidentialTransferFrom` support?

Yes — both `cUSDCMock` and `cWETHMock` are **Sepolia “mocked” confidential wrappers**. They wrap ERC-20 test tokens into confidential **ERC-7984** tokens, and they follow the same wrapper/operator transfer surface described in the **Confidential wrapper** documentation (including **operator-based transfer** via `confidentialTransferFrom`) ([Sepolia](/protocol/protocol-apps/addresses/testnet/sepolia.md), [Confidential wrapper](/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)).

Operator approvals work the same way on these confidential ERC-7984 tokens: you call **`setOperator`**, then the approved operator can call **`confidentialTransferFrom`** ([Operator approvals](/protocol/sdk/guides/operator-approvals.md), [Transfer privately](/protocol/sdk/guides/transfer-privately.md)).

## 2) Which OpenZeppelin `confidential-contracts` version are they built on?

I cannot find information about the exact **`@openzeppelin\/confidential-contracts` version** used to build the Sepolia mock wrappers in the docs available to me ([OpenZeppelin library installation and overview](/protocol/solidity-guides/v0.10/docs/examples/openzeppelin.md)).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Are cUSDCMock and cWETHMock identical wrappers?](https://docs.zama.org/protocol?ask=Are%20cUSDCMock%20and%20cWETHMock%20identical%20wrappers%3F&goal=A%20lending%20pool%20contract%20on%20Sepolia%20must%20pull%20cUSDCMock%20deposits%20from%20users%20via%20setOperator%20plus%20confidentialTransferFrom)
- [What exact OpenZeppelin version is used for mocks?](https://docs.zama.org/protocol?ask=What%20exact%20OpenZeppelin%20version%20is%20used%20for%20mocks%3F&goal=A%20lending%20pool%20contract%20on%20Sepolia%20must%20pull%20cUSDCMock%20deposits%20from%20users%20via%20setOperator%20plus%20confidentialTransferFrom)
- [Where can I find the wrappers registry entry for Sepolia?](https://docs.zama.org/protocol?ask=Where%20can%20I%20find%20the%20wrappers%20registry%20entry%20for%20Sepolia%3F&goal=A%20lending%20pool%20contract%20on%20Sepolia%20must%20pull%20cUSDCMock%20deposits%20from%20users%20via%20setOperator%20plus%20confidentialTransferFrom)

# Sources:

- [ERC-20 to Wrapped ERC-7984](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md)
- [Operator approvals](https://docs.zama.org/protocol/sdk/guides/operator-approvals.md)
- [Transfer privately](https://docs.zama.org/protocol/sdk/guides/transfer-privately.md)
- [useConfidentialSetOperator](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useconfidentialsetoperator.md)
- [useConfidentialTransferFrom](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialtransferfrom.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/api-references/sdk/wrappedtoken.md)
- [WrappedToken](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/wrappedtoken.md)
- [useConfidentialTransfer](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useconfidentialtransfer.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [Mocked mode](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/mocked.md)
- [sealed-bid-auction](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/sealed-bid-auction.md)
- [Sealed-Bid Auction](https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction.md)
- [Swap ERC7984 to ERC20](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md)
- [vesting-wallet](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/vesting-wallet.md)
- [erc7984](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [openzeppelin](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin.md)
- [Library installation and overview](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md)
- [erc7984-tutorial](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984-tutorial.md)
- [SUMMARY](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/summary.md)
- [ERC7984ERC20WrapperMock](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/openzeppelin/erc7984erc20wrappermock.md)
- [contracts](https://docs.zama.org/protocol/solidity-guides/v0.10/coprocessor/docs/fundamentals/fhevm/contracts.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [Zama 보안 블록체인 프로토콜 라이트 페이퍼](https://docs.zama.org/protocol/zama-protocol-litepaper/ko/zama.md)
- [Host contracts](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/hostchain.md)
- [Host contracts](https://docs.zama.org/protocol/protocol/overview/hostchain.md)
- [sealed-bid-auction-tutorial](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/examples/sealed-bid-auction-tutorial.md)
- [Tutorial](https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md)

