> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md).

# User decryption delegation

Delegation lets one account (the **delegator**) authorize another account (the **delegate**) to perform user decryption on its behalf, in the context of a specific contract. The ACL stores user decryption permissions as `(user, contractAddress)` pairs; delegation transfers the rights of `(delegator, contractAddress)` to `(delegate, contractAddress)`.

## Who is the delegator?

It depends on which API you call:

| Caller                             | API                                                           | Delegator (`msg.sender` to ACL) |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| **EOA** (Externally Owned Account) | `IACL.delegateForUserDecryption` directly on the ACL contract | the EOA itself                  |
| **Smart contract**                 | `FHE.delegateUserDecryption` from inside a contract function  | `address(this)`                 |

`FHE.delegateUserDecryption` cannot be used by an EOA to delegate its own rights — the EOA must call the ACL directly.

## Constraints

The ACL enforces three invariants when registering a delegation:

* `msg.sender != contractAddress`
* `msg.sender != delegate`
* `delegate != contractAddress`

Plus a one-delegate-or-revoke-per-block rule per `(delegator, delegate, contractAddress)` tuple.

## Pattern 1 — EOA delegates to a backend service

The user calls the ACL contract directly to delegate their own rights:

```solidity
import { IACL } from "@fhevm/solidity/lib/Impl.sol";

IACL(aclAddress).delegateForUserDecryption(relayer, vault, expirationDate);
```

After this, the relayer can user-decrypt any handle that has the `(EOA, vault)` ACL pair.

## Pattern 2 — Contract delegates its own rights

A contract delegates user-decryption rights it has been granted. `contractAddress` must be a **different** contract whose handles this contract has been allowed to access.

```solidity
import { FHE } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract Aggregator is ZamaEthereumConfig {
    address public immutable vault;

    constructor(address vault_) { vault = vault_; }

    function authorizeRelayer(address relayer, uint64 expirationDate) external {
        FHE.delegateUserDecryption(relayer, vault, expirationDate);
    }

    function revokeRelayer(address relayer) external {
        FHE.revokeUserDecryptionDelegation(relayer, vault);
    }
}
```

{% hint style="warning" %}
**Common mistake:** calling `FHE.delegateUserDecryption(relayer, address(this), expiration)` from inside a contract, hoping to delegate the caller user's rights. This always reverts because `msg.sender == contractAddress` violates one of the constraints listed above. Use Pattern 1 instead — the user must call the ACL directly.
{% endhint %}

## API summary

```solidity
// Granting (caller-contract side)
FHE.delegateUserDecryption(delegate, contractAddress, expirationDate);
FHE.delegateUserDecryptionWithoutExpiration(delegate, contractAddress);
FHE.delegateUserDecryptions(delegate, contractAddresses, expirationDate);            // batch
FHE.delegateUserDecryptionsWithoutExpiration(delegate, contractAddresses);           // batch

// Revoking
FHE.revokeUserDecryptionDelegation(delegate, contractAddress);
FHE.revokeUserDecryptionDelegations(delegate, contractAddresses);                    // batch

// Querying
FHE.isDelegatedForUserDecryption(delegator, delegate, contractAddress, handle);      // active for handle?
FHE.getDelegatedUserDecryptionExpirationDate(delegator, delegate, contractAddress);  // 0 = none, max = permanent
FHE.isUserDecryptable(handle, user, contractAddress);                                // raw ACL check, ignores delegation
```


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
