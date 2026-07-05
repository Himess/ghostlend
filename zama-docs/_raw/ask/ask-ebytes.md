# Do ebytes64, ebytes128, ebytes256 encrypted bytes types exist in the current FHEVM Solidity library, or were they removed? Which version removed them if so?

No — the current FHEVM Solidity `FHE` library does **not** include encrypted byte types like `ebytes64`, `ebytes128`, or `ebytes256`.

* The **current supported encrypted types** list only: `ebool`, `euint8/16/32/64/128/160/256`, `eint*` (signed integers), and `eaddress` — there is no `ebytes*` section ([Supported types](/protocol/solidity-guides/smart-contract/types.md)).
* They were **removed** in **FHEVM v0.7 (July 2025)**. The v0.7 change log explicitly lists **“Removed `ebytesXXX` types”** under breaking changes ([Zama Protocol Change Log](/protocol/changelog/zama-protocol-change-log.md)).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [What encrypted byte types exist now?](https://docs.zama.org/protocol?ask=What%20encrypted%20byte%20types%20exist%20now%3F)
- [Why were `ebytes` removed in v0.7?](https://docs.zama.org/protocol?ask=Why%20were%20%60ebytes%60%20removed%20in%20v0.7%3F)
- [Are there alternatives to `ebytes` in FHEVM?](https://docs.zama.org/protocol?ask=Are%20there%20alternatives%20to%20%60ebytes%60%20in%20FHEVM%3F)

# Sources:

- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Supported types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md)
- [Generate random numbers](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md)
- [Casting and trivial encryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md)
- [Chains](https://docs.zama.org/protocol/protocol-apps/chains.md)
- [FHE counter](https://docs.zama.org/protocol/examples/basic/fhe-counter.md)
- [Zama 機密性ブロックチェーン・プロトコル ライトペーパー](https://docs.zama.org/protocol/zama-protocol-litepaper/ja/zama-burokkuchnpurotokoru-raitopp.md)
- [Zama Protocol Change Log](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- [Write FHEVM tests in Hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md)
- [FHE library](https://docs.zama.org/protocol/protocol/overview/library.md)

