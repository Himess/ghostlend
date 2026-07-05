# In which FHEVM or @fhevm/solidity version was the SepoliaConfig configuration contract replaced or renamed to ZamaEthereumConfig? Is SepoliaConfig still usable in the current library version?

`SepoliaConfig` was replaced by `ZamaEthereumConfig` in **FHEVM v0.9**.

* The migration guide states that **“Unified `ZamaEthereumConfig` \[replaces] `SepoliaConfig`”** in **FHEVM v0.9**. See [migration](/protocol/solidity-guides/v0.10/docs/solidity-guides/migration.md).
* That same guide lists **`@fhevm/solidity` minimum version `v0.9.1`** (needed to get the updated config contracts). See [migration](/protocol/solidity-guides/v0.10/docs/solidity-guides/migration.md).

### Is `SepoliaConfig` still usable in the current library version?

No. In the **v0.9 config system**, the guide explicitly says:

* **“⚠️ Removal: The `SepoliaConfig` contract is now removed.”**\
  So you should migrate your imports/usages to `ZamaEthereumConfig`. See [migration](/protocol/solidity-guides/v0.10/docs/solidity-guides/migration.md).

`ZamaEthereumConfig` is the supported replacement; it’s designed to be inherited by your contract and wires the FHEVM coprocessor + decryption oracle based on network configuration. See [Configuration](/protocol/solidity-guides/v0.10/docs/solidity-guides/configure.md).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What version introduces ZamaEthereumConfig?](https://docs.zama.org/protocol?ask=What%20version%20introduces%20ZamaEthereumConfig%3F)
- [Is SepoliaConfig removed in v0.9?](https://docs.zama.org/protocol?ask=Is%20SepoliaConfig%20removed%20in%20v0.9%3F)
- [Minimum @fhevm/solidity version for v0.9?](https://docs.zama.org/protocol?ask=Minimum%20%40fhevm%2Fsolidity%20version%20for%20v0.9%3F)

# Sources:

- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/configure/contract_addresses.md)
- [Configuration](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/configure.md)
- [Table of all addresses](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/contract_addresses.md)
- [Configuration](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/configure/contract_addresses.md)
- [migration](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/migration.md)
- [Migrate to v0.9](https://docs.zama.org/protocol/solidity-guides/v0.11/development-guide/migration.md)
- [Migrate to v0.9](https://docs.zama.org/protocol/solidity-guides/v0.12/development-guide/migration.md)
- [3. Turn it into FHEVM](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md)
- [Network presets](https://docs.zama.org/protocol/sdk/api-references/sdk/network-presets.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/alpha/migration/migrate-v2-to-v3.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/acl.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/acl.md)
- [KMS](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/kms.md)
- [KMS](https://docs.zama.org/protocol/protocol/overview/kms.md)
- [library-solidity](https://docs.zama.org/protocol/solidity-guides/v0.10/library-solidity.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/v0.11/getting-started/overview.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md)
- [Table of contents](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/summary.md)

