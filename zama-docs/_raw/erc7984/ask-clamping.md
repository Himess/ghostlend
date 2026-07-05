# When confidentialTransferFrom is called by an operator and the holder's encrypted balance is smaller than the requested encrypted amount, does the transaction revert or does it transfer zero and succeed? What does the returned euint64 represent in that case?

If the *holder’s encrypted balance* is smaller than the requested `encryptedAmount`, the on-chain transfer logic is designed to **avoid reverts and instead conditionally transfer zero** — i.e., it uses a `canTransfer` predicate and `FHE.select(...)` to only apply the transfer when the condition holds. In this style, **“transactions do not revert if a condition fails”** and the balances are updated conditionally.

However, in the **SDK** (and React hooks), the default path usually never reaches that on-chain behavior:

* `confidentialTransfer(...)` / `unshield()` do a **pre-flight confidential balance check** and **throw `InsufficientConfidentialBalanceError` before any transaction is sent** when `available < requested`.
* You can bypass that with `skipBalanceCheck: true` (then you rely on the on-chain conditional behavior).

## What the returned `euint64` represents

For the *callback variants* (e.g. `confidentialTransferFromAndCall`), the contract returns a **fresh ciphertext** called `transferred`.

Docs state that the returned `transferred` ciphertext is the **net amount computed from the transfer and any refund attempt**, and it is only granted as a transient allowance for the current transaction.\
So when `canTransfer` is false (insufficient encrypted balance), the **net transferred amount is the encrypted value of `0`**.

Relevant references:

* [Transfer privately](https://docs.zama.org/protocol/sdk/guides/transfer-privately) (pre-flight `InsufficientConfidentialBalanceError`)
* [Confidential wrapper (transfer callbacks)](/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md) (meaning of returned `transferred`)
* [Error handling in FHEVM](https://docs.zama.org/protocol/protocol/overview/library/error-handling) (no reverts on failed conditions + `FHE.select`)

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What happens on-chain when balance is too low?](https://docs.zama.org/protocol?ask=What%20happens%20on-chain%20when%20balance%20is%20too%20low%3F&goal=Designing%20lending%20pool%20accounting%20that%20pulls%20user%20deposits%20via%20operator%20confidentialTransferFrom)
- [What exactly is the returned transferred value?](https://docs.zama.org/protocol?ask=What%20exactly%20is%20the%20returned%20transferred%20value%3F&goal=Designing%20lending%20pool%20accounting%20that%20pulls%20user%20deposits%20via%20operator%20confidentialTransferFrom)
- [How can I bypass balance check safely?](https://docs.zama.org/protocol?ask=How%20can%20I%20bypass%20balance%20check%20safely%3F&goal=Designing%20lending%20pool%20accounting%20that%20pulls%20user%20deposits%20via%20operator%20confidentialTransferFrom)

# Sources:

- [useConfidentialTransferFrom](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useconfidentialtransferfrom.md)
- [Check balances](https://docs.zama.org/protocol/sdk/alpha/guides/check-balances.md)
- [useConfidentialTransfer](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useconfidentialtransfer.md)
- [Operator approvals](https://docs.zama.org/protocol/sdk/guides/operator-approvals.md)
- [Encrypted Inputs](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/inputs.md)
- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md)
- [Operations on encrypted types](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/operations.md)
- [Operations on encrypted types](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/operations.md)
- [Migrate from v2 to v3](https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Token](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/token.md)
- [Handle errors](https://docs.zama.org/protocol/sdk/alpha/guides/handle-errors.md)
- [Errors](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/errors.md)
- [ACL examples](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/acl/acl_examples.md)
- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [Transfer privately](https://docs.zama.org/protocol/sdk/guides/transfer-privately.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/logics/error_handling.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/logics/error_handling.md)

