# After a smart contract operator calls confidentialTransferFrom and receives the returned transferred euint64 handle, what ACL permissions does the contract have on that handle? Can it store the handle and use it in later transactions, or is the allowance transient only for the current transaction?

When your operator contract receives the *returned* encrypted value/handle (e.g. an `euint64` from `confidentialTransferFrom`), it only has whatever ACL permissions already exist for that specific handle.

### What permissions exist?

* **No implicit “operator gets access” is guaranteed by the docs.** In FHEVM, access is enforced **per handle** via the ACL.
* To make a contract able to reuse a handle later, you must grant it ACL permission yourself using the FHE ACL helpers:
  * `FHE.allowThis(handle)` — **permanent** access for the *current contract*.
  * `FHE.allow(handle, someAddress)` — **permanent** access for `someAddress`.
  * `FHE.allowTransient(handle, someAddress)` — **temporary** access **only for the current transaction**.

### Can the contract store the handle and use it later?

* **Yes, but only if it has a permanent allowance.**
  * The docs state that **transient** allowances are stored in transient storage and are valid **for the duration of the current transaction**.
  * **Permanent** allowances are stored in a dedicated ACL contract and are available **across transactions** (`FHE.allow` / `FHE.allowThis`).\
    See [Access Control List](/protocol/solidity-guides/v0.11/smart-contract/acl.md) and [ACL examples](/protocol/solidity-guides/v0.11/smart-contract/acl/acl_examples.md).

So for a lending pool that needs to add the transferred amount into an encrypted deposit balance and keep using it in future calls, grant **permanent** ACL permission (typically via `FHE.allowThis(...)`, then update your stored encrypted balance and allowances).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [IsTransient vs permanent: when to use?](https://docs.zama.org/protocol?ask=IsTransient%20vs%20permanent%3A%20when%20to%20use%3F&goal=Lending%20pool%20needs%20to%20add%20the%20actually-transferred%20amount%20to%20a%20user's%20encrypted%20deposit%20balance)
- [How to grant permanent ACL on handle?](https://docs.zama.org/protocol?ask=How%20to%20grant%20permanent%20ACL%20on%20handle%3F&goal=Lending%20pool%20needs%20to%20add%20the%20actually-transferred%20amount%20to%20a%20user's%20encrypted%20deposit%20balance)
- [Which function stores the new handle ACL after transfer?](https://docs.zama.org/protocol?ask=Which%20function%20stores%20the%20new%20handle%20ACL%20after%20transfer%3F&goal=Lending%20pool%20needs%20to%20add%20the%20actually-transferred%20amount%20to%20a%20user's%20encrypted%20deposit%20balance)

# Sources:

- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [ACL examples](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/acl/acl_examples.md)
- [useConfidentialTransferFrom](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialtransferfrom.md)
- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [useConfidentialTransfer](https://docs.zama.org/protocol/sdk/api-references/react/useconfidentialtransfer.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/logics/error_handling.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/acl/reorgs_handling.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/logics/error_handling.md)
- [Handle errors](https://docs.zama.org/protocol/sdk/guides/handle-errors.md)
- [Token](https://docs.zama.org/protocol/sdk/api-references/sdk/token.md)
- [FHE library](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/library.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/acl.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/acl.md)
- [Smart contracts - FHEVM API](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/functions.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [Permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md)
- [Key features](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/key_concepts.md)
- [Key features](https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/getting-started/overview.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/v0.11/getting-started/overview.md)

