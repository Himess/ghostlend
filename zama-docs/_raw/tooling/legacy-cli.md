> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/cli.md).

# Using the CLI

The `fhevm` Command-Line Interface (CLI) tool provides a simple and efficient way to encrypt data for use with the blockchain's Fully Homomorphic Encryption (FHE) system. This guide explains how to install and use the CLI to encrypt integers and booleans for confidential smart contracts.

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed on your system before proceeding. Then, globally install the `@zama-fhe/relayer-sdk` package to enable the CLI tool:

```bash
npm install -g @zama-fhe/relayer-sdk
```

Once installed, you can access the CLI using the `relayer` command. Verify the installation and explore available commands using:

```bash
relayer help
```

## Encrypting Data

The CLI allows you to encrypt integers and booleans for use in smart contracts. Encryption is performed using the blockchain's FHE public key, ensuring the confidentiality of your data.

### Syntax

```bash
relayer encrypt --node <NODE_URL> <CONTRACT_ADDRESS> <USER_ADDRESS> <DATA:TYPE>...
```

* **`--node`**: Specifies the RPC URL of the blockchain node (e.g., `http://localhost:8545`).
* **`<CONTRACT_ADDRESS>`**: The address of the contract interacting with the encrypted data.
* **`<USER_ADDRESS>`**: The address of the user associated with the encrypted data.
* **`<DATA:TYPE>`**: The data to encrypt, followed by its type:
  * `:64` for 64-bit integers
  * `:1` for booleans

### Example Usage

Encrypt the integer `71721075` (64-bit) and the boolean `1` for the contract at `0x8Fdb26641d14a80FCCBE87BF455338Dd9C539a50` and the user at `0xa5e1defb98EFe38EBb2D958CEe052410247F4c80`:

```bash
relayer encrypt 0x8Fdb26641d14a80FCCBE87BF455338Dd9C539a50 0xa5e1defb98EFe38EBb2D958CEe052410247F4c80 71721075:64 1:1
```


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/cli.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
