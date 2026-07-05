> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md).

# What is FHEVM Solidity

This document provides an overview of key features of the FHEVM smart contract library.

### Configuration and initialization

Smart contracts using FHEVM require proper configuration and initialization:

* **Environment setup**: Import and inherit from environment-specific configuration contracts
* **Relayer configuration**: Configure secure relayer access for cryptographic operations
* **Initialization checks**: Validate encrypted variables are properly initialized before use

For more information see [Configuration](/protocol/solidity-guides/smart-contract/configure.md).

### Encrypted data types

FHEVM introduces encrypted data types compatible with Solidity:

* **Booleans**: `ebool`
* **Unsigned Integers**: `euint8`, `euint16`, `euint32`, `euint64`, `euint128`, `euint256`
* **Addresses**: `eaddress`
* **Input**: `externalEbool`, `externalEaddress`, `externalEuintXX` for handling encrypted input data

Encrypted data is represented as ciphertext handles, ensuring secure computation and interaction.

For more information see [use of encrypted types](/protocol/solidity-guides/smart-contract/types.md).

### Casting types

fhevm provides functions to cast between encrypted types:

* **Casting between encrypted types**: `FHE.asEbool` converts encrypted integers to encrypted booleans
* **Casting to encrypted types**: `FHE.asEuintX` converts plaintext values to encrypted types
* **Casting to encrypted addresses**: `FHE.asEaddress` converts plaintext addresses to encrypted addresses

For more information see [use of encrypted types](/protocol/solidity-guides/smart-contract/types.md).

### Confidential computation

fhevm enables symbolic execution of encrypted operations, supporting:

* **Arithmetic:** `FHE.add`, `FHE.sub`, `FHE.mul`, `FHE.min`, `FHE.max`, `FHE.neg`, `FHE.div`, `FHE.rem`
  * Note: `div` and `rem` operations are supported only with plaintext divisors
* **Bitwise:** `FHE.and`, `FHE.or`, `FHE.xor`, `FHE.not`, `FHE.shl`, `FHE.shr`, `FHE.rotl`, `FHE.rotr`
* **Comparison:** `FHE.eq`, `FHE.ne`, `FHE.lt`, `FHE.le`, `FHE.gt`, `FHE.ge`
* **Advanced:** `FHE.select` for branching on encrypted conditions, `FHE.randEuintX` for on-chain randomness.

For more information on operations, see [Operations on encrypted types](/protocol/solidity-guides/smart-contract/operations.md).

For more information on conditional branching, see [Conditional logic in FHE](/protocol/solidity-guides/smart-contract/logics/conditions.md).

For more information on random number generation, see [Generate Random Encrypted Numbers](/protocol/solidity-guides/smart-contract/operations/random.md).

### Access control mechanism

fhevm enforces access control with a blockchain-based Access Control List (ACL):

* **Persistent access**: `FHE.allow`, `FHE.allowThis` grants permanent permissions for ciphertexts.
* **Transient access**: `FHE.allowTransient` provides temporary access for specific transactions.
* **Validation**: `FHE.isSenderAllowed` ensures that only authorized entities can interact with ciphertexts.
* **Persistent public decryption**: `FHE.makePubliclyDecryptable`, `FHE.isPubliclyDecryptable` makes a given ciphertext permanently publicly decryptable.
* **User decryption delegation**: a contract can delegate user-decryption rights via `FHE.delegateUserDecryption`; an EOA delegates its own rights by calling `IACL.delegateForUserDecryption` on the ACL directly. See [User decryption delegation](/protocol/solidity-guides/smart-contract/acl/delegation.md) for the two patterns.
* **Account deny list**: `FHE.isAccountDenied` checks whether an account is blocked from interacting with encrypted values.

For more information see [ACL](/protocol/solidity-guides/smart-contract/acl.md).


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
