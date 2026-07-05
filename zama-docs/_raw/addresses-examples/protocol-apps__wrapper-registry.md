> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry.md).

# Registry

This document explains the **Confidential Token Wrappers Registry,** an onchain directory that maps ERC-20 tokens to their corresponding ERC-7984 confidential token wrappers. Use it to discover, validate, and integrate confidential wrappers within the FHEVM ecosystem.

## Terminology

* **Token**: An ERC-20 token.
* **Confidential Wrapper**: An ERC-7984 confidential token wrapper. Also called "confidential token".
* **Underlying Token**: The ERC-20 token that the confidential wrapper is associated with.
* **TokenWrapperPair**: A pair of a token and its confidential wrapper.
* **Valid**: A valid confidential wrapper has been verified by the registry owner and can be used to wrap and unwrap tokens from the underlying token.
* **Invalid**: An invalid confidential wrapper has been revoked by the registry owner and should not be used to wrap and unwrap tokens from the underlying token.
* **Owner**: The owner of the registry. In the FHEVM protocol, this is the Protocol DAO governance (see [governance.md](/protocol/protocol-apps/governance/governance.md)).

## Contract information

| Resource           | Link                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deployed addresses | [Addresses directory](/protocol/protocol-apps/addresses.md)                                                                                                                                |
| Source code        | [ConfidentialTokenWrappersRegistry.sol](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-token-wrappers-registry/contracts/ConfidentialTokenWrappersRegistry.sol) |

## Structure

{% @mermaid/diagram content="flowchart
subgraph Ethereum
Protocol-DAO -- owner --> Registry
Registry -- registers --> Confidential-Wrapper
Protocol-DAO -- owner --> Confidential-Wrapper
end" %}

More information on confidential wrappers can be found in the [confidential-wrapper.md](/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md) file.

## Quick Start

{% hint style="info" %}
A token can only be associated with one confidential wrapper. A confidential wrapper can only be associated with one token.
{% endhint %}

{% hint style="warning" %}
**Always check validity:** A non-zero wrapper address may be revoked by the owner. Always verify the `isValid` flag associated with the (token, wrapper) pair before use.
{% endhint %}

### Find the confidential wrapper of a token

```solidity
(bool isValid, address confidentialToken) = registry.getConfidentialTokenAddress(erc20TokenAddress);
```

If the token has been registered with a confidential wrapper:

* `isValid` will be `true`
* `confidentialToken` will be the address of the confidential wrapper.

If the token has never been registered with a confidential wrapper:

* `isValid` will be `false`
* `confidentialToken` will be `address(0)`.

If the confidential wrapper has been revoked:

* `isValid` will be `false`
* `confidentialToken` will be the address of the (revoked) confidential wrapper.

### Find the underlying token of a confidential wrapper

```solidity
(bool isValid, address token) = registry.getTokenAddress(confidentialWrapperAddress);
```

If the confidential wrapper has been registered with a token:

* `isValid` will be `true`
* `token` will be the address of its underlying token.

If the confidential wrapper has never been registered with a token:

* `isValid` will be `false`
* `token` will be `address(0)`.

If the confidential wrapper has been revoked:

* `isValid` will be `false`
* `token` will be the address of its underlying token.

### Check if a confidential wrapper is valid

```solidity
bool isValid = registry.isConfidentialTokenValid(confidentialWrapperAddress);
```

If the confidential wrapper has been revoked,

* `isValid` will be `false`.

If the confidential wrapper has not been revoked (it is still valid),

* `isValid` will be `true`.

## Integration patterns

Token and confidential wrapper pairs are stored in the registry as `TokenWrapperPair` structs. Each struct contains:

* `tokenAddress`: the address of the underlying token.
* `confidentialTokenAddress`: the address of the confidential wrapper.
* `isValid`: `true` if the confidential wrapper is valid, `false` if it has been revoked.

### Get all valid confidential (token, wrapper) pairs

```solidity
TokenWrapperPair[] memory tokenConfidentialTokenPairs = registry.getTokenConfidentialTokenPairs();
```

It returns all confidential wrappers (including revoked ones).

### Get the total number of confidential (token, wrapper) pairs

```solidity
uint256 totalTokenConfidentialTokenPairs = registry.getTokenConfidentialTokenPairsLength();
```

### Get the index of a token

```solidity
uint256 tokenIndex = registry.getTokenIndex(tokenAddress);
```

`tokenAddress` must be a registered token. Otherwise, it will revert with `TokenNotRegistered`.

### Get a valid confidential (token, wrapper) pair by index

```solidity
TokenWrapperPair memory tokenConfidentialTokenPair = registry.getTokenConfidentialTokenPair(index);
```

It returns a single confidential (token, wrapper) pair (including revoked ones).

### Get a slice of confidential (token, wrapper) pairs

```solidity
TokenWrapperPair[] memory tokenConfidentialTokenPairsSlice = registry.getTokenConfidentialTokenPairsSlice(fromIndex, toIndex);
```

It returns a slice of confidential (token, wrapper) pairs (including revoked ones). `fromIndex` is included and `toIndex` is excluded.

## Data Structures

### TokenWrapperPair

```solidity
struct TokenWrapperPair {
    address tokenAddress;              // The ERC-20 token
    address confidentialTokenAddress;  // The ERC-7984 wrapper
    bool isValid;                      // false if revoked
}
```

## Events

| Event                                                                 | Description                           |
| --------------------------------------------------------------------- | ------------------------------------- |
| `ConfidentialTokenRegistered(tokenAddress, confidentialTokenAddress)` | Emitted when a new pair is registered |
| `ConfidentialTokenRevoked(tokenAddress, confidentialTokenAddress)`    | Emitted when a wrapper is revoked     |

## Errors

| Error                                                                                         | Cause                                                  |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `TokenZeroAddress()`                                                                          | Attempted to register with zero token address          |
| `ConfidentialTokenZeroAddress()`                                                              | Attempted to register/revoke with zero wrapper address |
| `TokenAddressIsConfidentialTokenAddress(tokenAddress)`                                        | Token and confidential token addresses are the same    |
| `NotERC7984(confidentialTokenAddress)`                                                        | Wrapper doesn't support ERC-7984 interface             |
| `ConfidentialTokenDoesNotSupportERC165(confidentialTokenAddress)`                             | Wrapper doesn't implement ERC-165                      |
| `ConfidentialTokenAlreadyAssociatedWithToken(confidentialTokenAddress, existingTokenAddress)` | Wrapper already registered to another token            |
| `TokenAlreadyAssociatedWithConfidentialToken(tokenAddress, existingConfidentialTokenAddress)` | Token already has a registered wrapper                 |
| `RevokedConfidentialToken(confidentialTokenAddress)`                                          | Attempting to revoke an already-revoked wrapper        |
| `NoTokenAssociatedWithConfidentialToken(confidentialTokenAddress)`                            | Attempting to revoke unregistered wrapper              |
| `FromIndexGreaterOrEqualToIndex(fromIndex, toIndex)`                                          | Invalid slice range                                    |
| `TokenNotRegistered(tokenAddress)`                                                            | Token has not been registered                          |

## Owner Administration

{% hint style="info" %}
All administrative actions are restricted to the registry owner.
{% endhint %}

### Register a confidential token

```solidity
registry.registerConfidentialToken(
    erc20TokenAddress,
    confidentialWrapperAddress
);
```

**Validation performed:**

* Neither address can be zero
* Confidential token must implement ERC-165 (`supportsInterface` function) and support the ERC-7984 interface (`0x4958f2a4`)
* Token must not already have an associated wrapper
* Confidential token must not already be associated with another token

### Revoke a confidential token

```solidity
registry.revokeConfidentialToken(confidentialWrapperAddress);
```

**Important:** Revocation does NOT delete the mapping—it only sets `isValid = false`. This preserves historical records and prevents re-registration of malicious addresses.

Revoking is currently permanent. When a wrapper is revoked:

* `isValid` is set to `false`
* The mapping entries remain in storage
* The token cannot be registered with a new wrapper

## Upgradeability

The contract uses **UUPS (Universal Upgradeable Proxy Standard)** with 2-step ownership transfer. Only the owner can upgrade the contract.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
