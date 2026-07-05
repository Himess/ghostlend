# Are FHE.sum and FHE.isIn available in the current @fhevm/solidity library and usable on Sepolia? What are their exact Solidity signatures?

No — I cannot find `FHE.sum` or `FHE.isIn` as **available, supported operators** in the current Solidity operations documented for `@fhevm/solidity`.

## What the docs show

* The **supported FHE operations** list includes arithmetic (`FHE.add`, `FHE.sub`, …), bitwise, comparison, `FHE.select`, and random generation — but **does not mention** `FHE.sum` or `FHE.isIn` ([Operations on encrypted types](/protocol/solidity-guides/smart-contract/operations.md)).
* The **Roadmap** lists “Set inclusion” with function name **`FHE.isIn()`** as **“ETA -”** (i.e., not confirmed as present in the current released API) ([Roadmap](/protocol/protocol/roadmap.md)).

## Sepolia usability

Sepolia support in these docs is about deploying with the right config (e.g., inheriting `ZamaEthereumConfig`) so `FHE.*` calls route correctly ([Deploy contracts](/protocol/solidity-guides/development-guide/foundry/deploy.md)).\
But since `FHE.sum` / `FHE.isIn` aren’t documented as current supported operators, I can’t confirm they are usable on Sepolia.

## Exact Solidity signatures

The docs I can access **do not provide** the exact Solidity parameterized signatures for `FHE.sum` or `FHE.isIn` — `FHE.isIn()` is only mentioned by name on the roadmap, without a full signature.

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Is FHE.sum in the current release?](https://docs.zama.org/protocol?ask=Is%20FHE.sum%20in%20the%20current%20release%3F)
- [What are FHE.isIn's params/signature?](https://docs.zama.org/protocol?ask=What%20are%20FHE.isIn's%20params%2Fsignature%3F)
- [Can I use Sepolia with FHE basics now?](https://docs.zama.org/protocol?ask=Can%20I%20use%20Sepolia%20with%20FHE%20basics%20now%3F)

# Sources:

- [3. Turn it into FHEVM](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [Add](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md)
- [If then else](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheifthenelse.md)
- [Operations on encrypted types](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md)
- [Sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)
- [FHE on blockchain](https://docs.zama.org/protocol/protocol/overview.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [Dealing with branches and conditions](https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md)
- [ACL examples](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md)
- [Roadmap](https://docs.zama.org/protocol/protocol/roadmap.md)
- [useEncrypt](https://docs.zama.org/protocol/sdk/alpha/api-references/react/useencrypt.md)
- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)

