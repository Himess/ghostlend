# What are the HCU per-transaction limits on Ethereum Sepolia testnet? Is the global limit 20000000 and the sequential depth limit 5000000 on Sepolia as well as devnet? What exactly happens when the limit is exceeded?

## HCU per-transaction limits on Ethereum Sepolia

The docs **do not provide Sepolia-specific HCU limit values** (global cap and sequential depth cap).

What *is* documented for Sepolia is the deployed **`HCU_LIMIT_CONTRACT`** address: `0xa10998783c8CF88D886Bc30307e631D6686F0A22` on Sepolia testnet. See [Contract addresses → Sepolia testnet](/protocol/solidity-guides/smart-contract/configure/contract_addresses.md).

## Are Sepolia limits the same as devnet?

The docs only state the limits for **devnet**:

* **Global HCU limit per transaction:** `20,000,000`
* **HCU depth limit per transaction:** `5,000,000`

Source: [HCU](/protocol/solidity-guides/development-guide/hcu.md)

So: **I cannot confirm from the docs** that Sepolia matches those same values.

## What happens when the limit is exceeded?

If **either** the global HCU limit or the sequential depth limit is exceeded, **the transaction will revert** (the transaction fails).\
Source: [HCU](/protocol/solidity-guides/development-guide/hcu.md)

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Sepolia vs devnet limits differ?](https://docs.zama.org/protocol?ask=Sepolia%20vs%20devnet%20limits%20differ%3F)
- [Where is Sepolia HCU limit documented?](https://docs.zama.org/protocol?ask=Where%20is%20Sepolia%20HCU%20limit%20documented%3F)
- [What are Sepolia HCU limit values (global/depth)?](https://docs.zama.org/protocol?ask=What%20are%20Sepolia%20HCU%20limit%20values%20(global%2Fdepth)%3F)

# Sources:

- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Zama Protocol Change Log](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Errors](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/errors.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Zama 보안 블록체인 프로토콜 라이트 페이퍼](https://docs.zama.org/protocol/zama-protocol-litepaper/ko/zama.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [Write FHEVM-enabled Hardhat Tasks](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md)
- [Deploy contracts and run tests](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md)
- [HyperEVM](https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/hyper_evm.md)
- [Configuration](https://docs.zama.org/protocol/sdk/alpha/guides/configuration.md)
- [4. Test the FHEVM contract](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/test_the_fhevm_contract.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [ERC-20 to Wrapped ERC-7984](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md)
- [Contract builders](https://docs.zama.org/protocol/sdk/api-references/sdk/contract-builders.md)
- [First confidential dApp](https://docs.zama.org/protocol/sdk/alpha/getting-started/first-confidential-dapp.md)
- [Quick start](https://docs.zama.org/protocol/sdk/getting-started/quick-start.md)
- [Sealed-Bid Auction](https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction.md)
- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [Dealing with branches and conditions](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md)
- [Security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Security model](https://docs.zama.org/protocol/sdk/alpha/concepts/security-model.md)
- [Host contracts](https://docs.zama.org/protocol/protocol/overview/hostchain.md)
- [How to Transform Your Smart Contract into a FHEVM Smart Contract?](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md)
- [Contract addresses](https://docs.zama.org/protocol/protocol-apps/addresses.md)
- [2. Write a simple contract](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/write_a_simple_contract.md)

