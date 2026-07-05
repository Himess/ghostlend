# Manifest — addresses & examples raw dumps

Fetched 2026-07-03 via `curl -sSL "<url>" -o "<file>"` (raw GitBook markdown, `.md` endpoints). All files verified: none start with `<!DOCTYPE html`, none contain `global-error`. 34 doc pages + 5 `?ask=` responses. Local dir: `zama-docs/_raw/addresses-examples/`.

Format: `local file ← URL`

## Addresses / protocol-apps (15)

- `protocol-apps__readme.md` ← https://docs.zama.org/protocol/protocol-apps/readme.md
- `protocol-apps__apps.md` ← https://docs.zama.org/protocol/protocol-apps/apps.md
- `protocol-apps__chains.md` ← https://docs.zama.org/protocol/protocol-apps/chains.md
- `protocol-apps__addresses.md` ← https://docs.zama.org/protocol/protocol-apps/addresses.md
- `addresses__mainnet.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/mainnet.md
- `addresses__mainnet__ethereum.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/ethereum.md
- `addresses__mainnet__gateway.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/mainnet/gateway.md
- `addresses__testnet.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet.md
- `addresses__testnet__sepolia.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md
- `addresses__testnet__gateway.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet/gateway.md
- `protocol-apps__confidential-tokens.md` ← https://docs.zama.org/protocol/protocol-apps/confidential-tokens.md
- `protocol-apps__confidential-wrapper.md` ← https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md (discovered via confidential-tokens index; not in original URL list)
- `protocol-apps__wrapper-registry.md` ← https://docs.zama.org/protocol/protocol-apps/confidential-tokens/wrapper-registry.md (discovered via confidential-tokens index; not in original URL list)
- `solidity-guides__contract_addresses.md` ← https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md
- `changelog__zama-protocol-change-log.md` ← https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md

## Examples (19)

- `ex__basic__fhe-counter.md` ← https://docs.zama.org/protocol/examples/basic/fhe-counter.md
- `ex__basic__fhe-operations.md` ← https://docs.zama.org/protocol/examples/basic/fhe-operations.md
- `ex__basic__fheadd.md` ← https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md
- `ex__basic__fheifthenelse.md` ← https://docs.zama.org/protocol/examples/basic/fhe-operations/fheifthenelse.md
- `ex__basic__encryption.md` ← https://docs.zama.org/protocol/examples/basic/encryption.md
- `ex__basic__encrypt-single.md` ← https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md
- `ex__basic__encrypt-multiple.md` ← https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-multiple-values.md
- `ex__basic__decryption.md` ← https://docs.zama.org/protocol/examples/basic/decryption.md
- `ex__dec__user-decrypt-single.md` ← https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md
- `ex__dec__user-decrypt-multiple.md` ← https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md
- `ex__dec__heads-or-tails.md` ← https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md
- `ex__dec__highest-die-roll.md` ← https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md
- `ex__oz__openzeppelin.md` ← https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md
- `ex__oz__erc7984.md` ← https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md
- `ex__oz__erc7984-wrapper-mock.md` ← https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md
- `ex__oz__swap-erc7984-to-erc20.md` ← https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md
- `ex__oz__vesting-wallet.md` ← https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/vesting-wallet.md
- `ex__auction__sealed-bid.md` ← https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction.md
- `ex__auction__sealed-bid-tutorial.md` ← https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md

## `?ask=` responses (5) — GET `<page>.md?ask=<urlencoded question>`

- `ask-01-mock-addresses.md` ← https://docs.zama.org/protocol/protocol-apps/confidential-tokens.md?ask=What are the addresses of cUSDCMock and cWETHMock on Sepolia, what are their underlying ERC-20 mock tokens, and do the underlying mocks have public mint functions for testing?
- `ask-02-faucet-mint.md` ← https://docs.zama.org/protocol/protocol-apps/confidential-tokens.md?ask=How does a developer get testnet tokens to test confidential token flows on Sepolia (faucet or mint)?
- `ask-03-relayer-url.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md?ask=What is the relayer URL for Sepolia and is an API key required?
- `ask-04-wrappers-registry.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md?ask=What is the address of the Wrappers Registry on Sepolia?
- `ask-05-decryption-oracle.md` ← https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md?ask=What is the DecryptionOracle address on Sepolia?

## Synthesized outputs

- `zama-docs/05-addresses.md` — all address tables verbatim + `?ask` answers + consistency check + quick-reference table
- `zama-docs/07-examples.md` — all 19 example pages verbatim with lending-relevance intros (order: decryption → OZ/token → auction → basics)
- `zama-docs/_fragments/pitfalls-addresses-examples.md`
- `zama-docs/_fragments/questions-addresses-examples.md`
