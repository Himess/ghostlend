# Which version of the @fhevm/solidity npm package do the current solidity guides document? Is SepoliaConfig still supported in the latest version or has it been replaced by ZamaEthereumConfig? What import path should a contract deployed on Ethereum Sepolia use?

## `@fhevm/solidity` npm package version in the Solidity guides

The Solidity guides in this docs set **do not specify an npm version** for `@fhevm/solidity`. I cannot find information about this in the docs.

## `SepoliaConfig` vs `ZamaEthereumConfig`

* **Solidity contract configuration (Sepolia/Hardhat):** the guides require inheriting from **`ZamaEthereumConfig`** — they explicitly warn that without it, Sepolia/Hardhat won’t support FHEVM execution. See [“3. Turn it into FHEVM”](/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md).
* **SDK-level preset configs:** the docs also state the legacy **`SepoliaConfig`** object is **no longer exported from `@zama-fhe/sdk`**; use the **chain presets** from `@zama-fhe/sdk/chains` instead. See [“Network presets”](/protocol/sdk/api-references/sdk/network-presets.md).

## Import path for a contract deployed on Ethereum Sepolia

Use these imports and inherit from `ZamaEthereumConfig`:

```solidity
import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is ZamaEthereumConfig { }
```

These exact paths and the Sepolia wiring via `ZamaEthereumConfig` are shown in [“3. Turn it into FHEVM”](/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md) and in [Configuration](/protocol/solidity-guides/smart-contract/configure.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What npm version pins the FHEVM Solidity lib?](https://docs.zama.org/protocol?ask=What%20npm%20version%20pins%20the%20FHEVM%20Solidity%20lib%3F&goal=Build%20a%20confidential%20lending%20protocol%20on%20Ethereum%20Sepolia%20with%20the%20latest%20FHEVM%20library)
- [Is SepoliaConfig ever reintroduced?](https://docs.zama.org/protocol?ask=Is%20SepoliaConfig%20ever%20reintroduced%3F&goal=Build%20a%20confidential%20lending%20protocol%20on%20Ethereum%20Sepolia%20with%20the%20latest%20FHEVM%20library)
- [Where to import ZamaConfig for Sepolia?](https://docs.zama.org/protocol?ask=Where%20to%20import%20ZamaConfig%20for%20Sepolia%3F&goal=Build%20a%20confidential%20lending%20protocol%20on%20Ethereum%20Sepolia%20with%20the%20latest%20FHEVM%20library)

# Sources:

- [3. Turn it into FHEVM](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md)
- [Overview](https://docs.zama.org/protocol/solidity-guides/readme.md)
- [Hardhat plugin](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md)
- [Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Write FHEVM tests in Hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [Library installation and overview](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md)
- [Write FHEVM-enabled Hardhat Tasks](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [Configuration](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md)
- [Set up Hardhat](https://docs.zama.org/protocol/solidity-guides/getting-started/setup.md)
- [Deploy contracts and run tests](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/run_test.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md)
- [Contract addresses](https://docs.zama.org/protocol/protocol-apps/addresses.md)
- [Zama Token](https://docs.zama.org/protocol/protocol-apps/zama-token.md)
- [Contract builders](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/contract-builders.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Network presets](https://docs.zama.org/protocol/sdk/api-references/sdk/network-presets.md)
- [Host contracts](https://docs.zama.org/protocol/protocol/overview/hostchain.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [ERC-20 to Wrapped ERC-7984](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [Zama Protocol Change Log](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- [Set up Foundry](https://docs.zama.org/protocol/solidity-guides/getting-started/setup-1.md)
- [4. Test the FHEVM contract](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/test_the_fhevm_contract.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [How to Transform Your Smart Contract into a FHEVM Smart Contract?](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md)

