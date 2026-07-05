# Who may call FHE.allow on a ciphertext handle - must the caller already have ACL permission on that handle? What ACL permission does the result of an FHE operation like FHE.add have by default within the transaction - is the calling contract automatically transiently allowed?

## 1) Who may call `FHE.allow` on a ciphertext handle?

Permissions in FHEVM are enforced **per handle** via the ACL. In particular, to *compute* on ciphertexts, the **contract itself** must already have ACL permissions on the **input handles** — not necessarily the external caller (`msg.sender`). For example, in `computeAPlusB()`, the operation succeeds even when the function caller does **not** have FHE permission, because `address(this)` has permissions on both inputs (`_a` and `_b`) ([`Add` example](/protocol/examples/basic/fhe-operations/fheadd.md)).

For **public decryption**, the docs are explicit: `FHE.makePubliclyDecryptable(...)` requires that the calling contract **already has ACL permission** to access the handle ([FHEVM API reference](/protocol/solidity-guides/smart-contract/functions.md)).

For `FHE.allow(...)` specifically, the docs don’t state a general “caller must already have ACL permission on that handle” rule. What’s clear is that:

* `isSenderAllowed`/`isAllowed` checks matter when you **process ciphertext inputs** ([ACL examples](/protocol/solidity-guides/smart-contract/acl/acl_examples.md), [ACL overview](/protocol/solidity-guides/smart-contract/acl.md))
* denied accounts are blocked from granting new permissions via ACL logic ([ACL overview](/protocol/solidity-guides/smart-contract/acl.md)).

## 2) Default ACL permission for results like `FHE.add` within the transaction

After `FHE.add(_a, _b)`, the contract address (`address(this)`) receives **ephemeral (temporary) FHE permission** over the result handle **for the duration of the function**, and it is **revoked when the function exits** ([`Add` example](/protocol/examples/basic/fhe-operations/fheadd.md)).

So the caller contract is *transiently* allowed to use the result *inside* the same transaction/function, but:

* `msg.sender` does **not** get permanent access automatically.
* you must explicitly grant permanent allowances (e.g., `FHE.allowThis(result)` and `FHE.allow(result, msg.sender)`) if you want `msg.sender` to decrypt later ([`Add` example](/protocol/examples/basic/fhe-operations/fheadd.md)).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [How ACL interacts with callers?](https://docs.zama.org/protocol?ask=How%20ACL%20interacts%20with%20callers%3F)
- [Do I need ACL for inputs?](https://docs.zama.org/protocol?ask=Do%20I%20need%20ACL%20for%20inputs%3F)
- [Can I decrypt after transaction?](https://docs.zama.org/protocol?ask=Can%20I%20decrypt%20after%20transaction%3F)

# Sources:

- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [Access Control List](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Handles](https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md)
- [3. Turn it into FHEVM](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md)
- [Reorgs handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Error handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Host contracts](https://docs.zama.org/protocol/protocol/overview/hostchain.md)
- [4. Test the FHEVM contract](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/test_the_fhevm_contract.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [Add](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [ERC7984 Standard](https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)
- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [If then else](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheifthenelse.md)

