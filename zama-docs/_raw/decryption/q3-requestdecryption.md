# Does FHE.requestDecryption with an on-chain oracle callback still exist in the current FHEVM version, or has it been fully replaced by FHE.makePubliclyDecryptable plus off-chain publicDecrypt plus FHE.checkSignatures? What happened to the DecryptionOracle contract, the request id, and the automatic callback?

`FHE.requestDecryption` (and `FHE.setDecryptionOracle`) do **not** remain as a supported “on-chain oracle callback” API in current FHEVM. In **FHEVM v0.9**, they are explicitly **deprecated and must be removed** — contracts should migrate to the relayer-based public decryption flow instead ([FHEVM v0.9 change log](/protocol/changelog/zama-protocol-change-log.md)).

## What replaced it (current public decryption flow)

Public decryption is now an **asynchronous 3-step** workflow:

1. **On-chain:** `FHE.makePubliclyDecryptable(...)` — mark a handle as **globally and permanently** publicly decryptable ([Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)).
2. **Off-chain:** `publicDecrypt` via the Zama SDK — returns `(cleartext, abi-encoded cleartext, decryptionProof)` ([Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)).
3. **On-chain:** `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` — reverts if the proof is invalid; **handle order must match** the proof/publicDecrypt input order ([FHE.checkSignatures](/protocol/solidity-guides/smart-contract/functions.md)).

## What happened to `DecryptionOracle`, request id, and the automatic callback?

The current public decryption docs describe handles/proofs and `FHE.checkSignatures`, but **do not document** any remaining **`DecryptionOracle` contract**, **request id**, or **automatic on-chain callback** mechanism in this flow ([Public Decryption](/protocol/solidity-guides/smart-contract/oracle.md)).

# Suggested Follow-up Questions:

If you need more information, consider asking one of these follow-up questions by performing an HTTP GET request on the URL:

- [Is there any fallback if publicDecrypt fails?](https://docs.zama.org/protocol?ask=Is%20there%20any%20fallback%20if%20publicDecrypt%20fails%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20requestDecryption%20oracle%20callback%20model%20to%20the%20current%20API)
- [How to handle proof replay protection?](https://docs.zama.org/protocol?ask=How%20to%20handle%20proof%20replay%20protection%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20requestDecryption%20oracle%20callback%20model%20to%20the%20current%20API)
- [Where to find exact order binding rules?](https://docs.zama.org/protocol?ask=Where%20to%20find%20exact%20order%20binding%20rules%3F&goal=Migrate%20a%20contract%20design%20from%20the%20old%20requestDecryption%20oracle%20callback%20model%20to%20the%20current%20API)

# Sources:

- [Public Decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Write FHEVM tests in Hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md)
- [Unshield tokens](https://docs.zama.org/protocol/sdk/guides/unshield-tokens.md)
- [3. Turn it into FHEVM](https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial/turn_it_into_fhevm.md)
- [Write FHEVM-enabled Hardhat Tasks](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_task.md)
- [What is FHEVM Solidity](https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md)
- [forge-fhevm API reference](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/api.md)
- [Write FHEVM tests in Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md)
- [FHEVM API reference](https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md)
- [Zama Protocol Change Log](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- [useDecryptValues](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptvalues.md)
- [Decrypt values from event logs](https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md)
- [useDecryptBalanceAs](https://docs.zama.org/protocol/sdk/alpha/api-references/react/usedecryptbalanceas.md)
- [Encrypt & decrypt](https://docs.zama.org/protocol/sdk/alpha/guides/encrypt-decrypt.md)
- [useDelegateDecryption](https://docs.zama.org/protocol/sdk/api-references/react/usedelegatedecryption.md)
- [Host contracts](https://docs.zama.org/protocol/protocol/overview/hostchain.md)
- [How to Transform Your Smart Contract into a FHEVM Smart Contract?](https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md)
- [Contract addresses](https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [Contract builders](https://docs.zama.org/protocol/sdk/api-references/sdk/contract-builders.md)
- [Deploy contracts](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/deploy.md)
- [KMS](https://docs.zama.org/protocol/protocol/overview/kms.md)
- [Gateway](https://docs.zama.org/protocol/protocol/overview/gateway.md)
- [Zama 보안 블록체인 프로토콜 라이트 페이퍼](https://docs.zama.org/protocol/zama-protocol-litepaper/ko/zama.md)
- [Protocolo Blockchain Confidencial de Zama - Litepaper](https://docs.zama.org/protocol/zama-protocol-litepaper/es/protocolo-blockchain-confidencial-de-zama-litepaper.md)
- [Delegations](https://docs.zama.org/protocol/sdk/alpha/api-references/sdk/delegation.md)

