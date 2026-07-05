# Solidity docs manifest

Fetched 2026-07-03 from docs.zama.org (raw GitBook markdown, `.md` endpoints).
All files verified: valid markdown, no GitBook error pages.
Local dir: `zama-docs/_raw/solidity/`

## Current solidity-guides (unversioned = CURRENT docs)

| Local file | Source URL |
| --- | --- |
| `readme.md` | https://docs.zama.org/protocol/solidity-guides/readme.md |
| `getting-started_overview.md` | https://docs.zama.org/protocol/solidity-guides/getting-started/overview.md |
| `smart-contract_configure.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md |
| `smart-contract_configure_contract_addresses.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md |
| `smart-contract_types.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md |
| `smart-contract_handles.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md |
| `smart-contract_operations.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md |
| `smart-contract_operations_casting.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md |
| `smart-contract_operations_random.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md |
| `smart-contract_inputs.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md |
| `smart-contract_acl.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md |
| `smart-contract_acl_acl_examples.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md |
| `smart-contract_acl_delegation.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md |
| `smart-contract_acl_reorgs_handling.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md |
| `smart-contract_logics.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/logics.md |
| `smart-contract_logics_conditions.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/conditions.md |
| `smart-contract_logics_loop.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md |
| `smart-contract_logics_error_handling.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md |
| `smart-contract_functions.md` | https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md |
| `development-guide_hcu.md` | https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md |
| `development-guide_transform_smart_contract_with_fhevm.md` | https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md |

## Supplemental (fetched to resolve version/deprecation questions)

| Local file | Source URL |
| --- | --- |
| `_supplemental_changelog.md` | https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md |
| `_supplemental_setup-hardhat.md` | https://docs.zama.org/protocol/solidity-guides/getting-started/setup.md |

## ?ask= responses (doc-grounded Q&A, in `zama-docs/_raw/ask/`)

| Local file | Question topic |
| --- | --- |
| `ask-version-config.md` | npm version pinned by docs; SepoliaConfig vs ZamaEthereumConfig; Sepolia imports |
| `ask-ebytes.md` | ebytesXX existence (answer: removed in FHEVM v0.7) |
| `ask-input-limits.md` | input packing limits (answer: not in current docs) |
| `ask-input-limits2.md` | input packing limits, retry (answer: 255 handles / 2048-bit CRS, from ARCHIVED v0.10 coprocessor docs) |
| `ask-hcu-limits.md` | Sepolia HCU limits (answer: only devnet numbers documented) |
| `ask-acl-rules.md` | who may call FHE.allow; default ACL of op results |
| `ask-sepoliaconfig.md` | when SepoliaConfig was removed (answer: v0.9, min @fhevm/solidity 0.9.1) |
| `ask-sum-isin.md` | FHE.sum / FHE.isIn availability (answer: not in current solidity API docs) |

## Version note

- `npm view @fhevm/solidity version` (run 2026-07-03) → **0.11.1** (dist-tags: latest=0.11.1, prerelease=0.9.0-1). Release dates: 0.7.0 Jun-2025, 0.8.0 Sep-2025, 0.9.0 Nov-2025, 0.9.1 Nov-2025, 0.10.0 Dec-2025, 0.11.0 Feb-2026, 0.11.1 Feb-2026.
- Protocol changelog status table: **Testnet = FHEVM v0.13**, **Mainnet = FHEVM v0.11**. Archived doc trees exist at `/v0.10/`, `/v0.11/`, `/v0.12/`; the unversioned tree (used here) is the current/latest docs.
- FHEVM protocol version numbers (v0.13) do NOT equal `@fhevm/solidity` package versions (0.11.1) — two different numbering schemes.
