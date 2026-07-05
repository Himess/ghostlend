> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md).

# Configuration

This document explains how to enable encrypted computations in your smart contract by setting up the `fhevm` environment. Learn how to integrate essential libraries, configure encryption, and add secure computation logic to your contracts.

## Core configuration setup

To utilize encrypted computations in Solidity contracts, you must configure the **FHE library**. The `fhevm` package simplifies this process with prebuilt configuration contracts, allowing you to focus on developing your contract's logic without handling the underlying cryptographic setup.

This library and its associated contracts provide a standardized way to configure and interact with Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) infrastructure on different Ethereum networks. It supplies the necessary contract addresses for Zama's FHEVM components (`ACL`, `FHEVMExecutor`, `KMSVerifier`), enabling seamless integration for Solidity contracts that require FHEVM support. The `InputVerifier` is not part of the inherited config — it is resolved at runtime via `FHEVMExecutor.getInputVerifierAddress()`.

## Key components configured automatically

1. **FHE library**: Sets up encryption parameters and cryptographic keys.
2. **Network-specific settings**: Adapts to local testing, testnets (Sepolia for example), or mainnet deployment.

By inheriting these configuration contracts, you ensure seamless initialization and functionality across environments.

## ZamaConfig.sol

The `ZamaConfig` library exposes functions to retrieve FHEVM configuration structs and contract addresses for supported networks: Ethereum mainnet, Sepolia testnet, and local Hardhat environments.

Under the hood, this library encapsulates the network-specific addresses of Zama's FHEVM infrastructure into a single struct (`CoprocessorConfig`).

## ZamaEthereumConfig

The `ZamaEthereumConfig` contract is designed to be inherited by a user contract. The constructor automatically sets up the FHEVM coprocessor using the configuration provided by the library for the respective network. When a contract inherits from `ZamaEthereumConfig`, the constructor calls `FHE.setCoprocessor` with the appropriate addresses. This ensures that the inheriting contract is automatically wired to the correct FHEVM contracts for the target network, abstracting away manual address management and reducing the risk of misconfiguration.

**Example**

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyERC20 is ZamaEthereumConfig {
  constructor() {
    // Additional initialization logic if needed
  }
}
```

## Using `isInitialized`

The `isInitialized` utility function checks whether an encrypted variable has been properly initialized, preventing unexpected behavior due to uninitialized values.

**Function signature**

```solidity
function isInitialized(T v) internal pure returns (bool)
```

**Purpose**

* Ensures encrypted variables are initialized before use.
* Prevents potential logic errors in contract execution.

**Example: Initialization Check for Encrypted Counter**

```solidity
require(FHE.isInitialized(counter), "Counter not initialized!");
```

## Summary

By leveraging prebuilt a configuration contract like `ZamaEthereumConfig` in `ZamaConfig.sol`, you can efficiently set up your smart contract for encrypted computations. These tools abstract the complexity of cryptographic initialization, allowing you to focus on building secure, confidential smart contracts.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
