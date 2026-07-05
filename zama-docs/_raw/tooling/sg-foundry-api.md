> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md).

# forge-fhevm API reference

This page is a quick reference for the [`FhevmTest`](https://github.com/zama-ai/forge-fhevm/blob/main/src/FhevmTest.sol) base contract from [forge-fhevm](https://github.com/zama-ai/forge-fhevm). For the full reference and additional helpers, see the [forge-fhevm docs](https://github.com/zama-ai/forge-fhevm/tree/main/docs).

### Import

```solidity
import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
```

### State variables (set by `setUp()`)

| Variable            | Type            | Role                                                                        |
| ------------------- | --------------- | --------------------------------------------------------------------------- |
| `_executor`         | `FHEVMExecutor` | Processes FHE operations and emits the events that drive plaintext tracking |
| `_acl`              | `ACL`           | Per-handle access control (transient and persistent)                        |
| `_inputVerifier`    | `InputVerifier` | Verifies EIP-712 input proofs (1 mock signer)                               |
| `_kmsVerifier`      | `KMSVerifier`   | Verifies EIP-712 decryption proofs (1 mock signer)                          |
| `MOCK_INPUT_SIGNER` | `address`       | Address of the mock input signer                                            |
| `MOCK_KMS_SIGNER`   | `address`       | Address of the mock KMS signer                                              |

### Encryption helpers

Each helper has a two-argument overload (`address(this)` is the implicit user) and a three-argument overload (explicit user).

```solidity
function encryptBool(bool value, address target) returns (externalEbool, bytes memory);
function encryptBool(bool value, address user, address target) returns (externalEbool, bytes memory);

function encryptUint8(uint8 value, address target) returns (externalEuint8, bytes memory);
function encryptUint8(uint8 value, address user, address target) returns (externalEuint8, bytes memory);

// Same shape for: encryptUint16, encryptUint32, encryptUint64,
//                  encryptUint128, encryptUint256, encryptAddress
```

### Decryption helpers

```solidity
// Low-level: no ACL checks, raw uint256
function decrypt(bytes32 handle) returns (uint256);

// Typed overloads — return the matching Solidity primitive
function decrypt(ebool value)    returns (bool);
function decrypt(euint8 value)   returns (uint8);
function decrypt(euint16 value)  returns (uint16);
function decrypt(euint32 value)  returns (uint32);
function decrypt(euint64 value)  returns (uint64);
function decrypt(euint128 value) returns (uint128);
function decrypt(euint256 value) returns (uint256);
function decrypt(eaddress value) returns (address);

// Public decrypt — KMS-signed proof verifiable via FHE.checkSignatures
function publicDecrypt(bytes32[] memory handles)
    returns (uint256[] memory cleartexts, bytes memory proof);

// User decrypt — full ACL + EIP-712 flow
function userDecrypt(
    bytes32 handle,
    address userAddress,
    address contractAddress,
    bytes memory userSignature
) returns (uint256);
```

### Proof helpers

```solidity
// KMS-signed decryption proof (no ACL check) — for callback-style flows
function buildDecryptionProof(bytes32[] memory handles, bytes memory abiEncodedCleartexts)
    view returns (bytes memory proof);
function buildDecryptionProof(bytes32 handle, bytes memory abiEncodedCleartext)
    view returns (bytes memory proof);

// EIP-712 user-decrypt signature
function signUserDecrypt(uint256 userPk, address contractAddress)
    view returns (bytes memory signature);
function signUserDecrypt(
    uint256 userPk,
    address[] memory contractAddresses,
    uint256 startTimestamp,
    uint256 durationDays
) view returns (bytes memory signature);
```

### Constants

| Constant                             | Value                                    | Purpose                                                  |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------- |
| `MOCK_INPUT_SIGNER_PK`               | Hardcoded mock key — see `FhevmTest.sol` | Signs input proofs (deterministic, mock signer)          |
| `MOCK_KMS_SIGNER_PK`                 | Hardcoded mock key — see `FhevmTest.sol` | Signs KMS decryption proofs (deterministic, mock signer) |
| `EMPTY_EXTRA_DATA`                   | `hex"00"`                                | Default extra data appended to EIP-712 proofs            |
| `DEFAULT_USER_DECRYPT_DURATION_DAYS` | `1`                                      | Default validity for user-decrypt sigs                   |

{% hint style="info" %}
The mock signer keys are Zama-specific values committed inside `forge-fhevm/src/FhevmTest.sol` — they are **not** Foundry's standard test private keys. They exist only so EIP-712 proofs are deterministic in tests.
{% endhint %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
