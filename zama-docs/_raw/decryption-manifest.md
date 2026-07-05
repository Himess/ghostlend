# Decryption docs manifest
All files in `zama-docs/_raw/decryption/`. Fetched 2026-07-03 as raw markdown (`curl -sSL "<url>.md"`); every file verified non-HTML/non-error.
Channels: **CURRENT** = unversioned docs paths. **ARCHIVED vX.Y** = old Solidity-guide versions. **ALPHA** = prerelease SDK docs channel. **?ask** = GitBook doc-grounded Q&A response.

## Current protocol / Solidity
| local file | URL |
| --- | --- |
| oracle.md | https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md |
| functions.md | https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md |
| acl-delegation.md | https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md |
| hardhat-write-test.md | https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md |
| examples-decryption.md | https://docs.zama.org/protocol/examples/basic/decryption.md |
| user-decrypt-single.md | https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md |
| user-decrypt-multiple.md | https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md |
| heads-or-tails.md | https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md |
| highest-die-roll.md | https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md |
| protocol-overview.md | https://docs.zama.org/protocol/protocol/overview.md |
| gateway.md | https://docs.zama.org/protocol/protocol/overview/gateway.md |
| kms.md | https://docs.zama.org/protocol/protocol/overview/kms.md |

## Current TypeScript SDK (`@zama-fhe/sdk` v3 / `@zama-fhe/react-sdk` v3)
| local file | URL |
| --- | --- |
| sdk-encrypt-decrypt.md | https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt.md |
| sdk-check-balances.md | https://docs.zama.org/protocol/sdk/guides/check-balances.md |
| sdk-delegated-decryption.md | https://docs.zama.org/protocol/sdk/guides/delegated-decryption.md |
| sdk-permit-model.md | https://docs.zama.org/protocol/sdk/concepts/permit-model.md |
| sdk-security-model.md | https://docs.zama.org/protocol/sdk/concepts/security-model.md |
| sdk-api-zamasdk.md | https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md |
| sdk-api-errors.md | https://docs.zama.org/protocol/sdk/api-references/sdk/errors.md |
| sdk-react-usedecryptvalues.md | https://docs.zama.org/protocol/sdk/api-references/react/usedecryptvalues.md |
| sdk-react-usegrantpermit.md | https://docs.zama.org/protocol/sdk/api-references/react/usegrantpermit.md |
| sdk-migrate-v2-v3.md | https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md |
| sdk-alpha-decrypt-event-logs.md (ALPHA) | https://docs.zama.org/protocol/sdk/alpha/guides/decrypt-from-event-logs.md |

## Archived (legacy) — NOTE: all archived oracle pages have been REWRITTEN to the current 3-step model; none contains the old `FHE.requestDecryption` callback API anymore
| local file | URL |
| --- | --- |
| legacy-v012-oracle.md (ARCHIVED v0.12) | https://docs.zama.org/protocol/solidity-guides/v0.12/smart-contract/oracle.md |
| legacy-v011-oracle.md (ARCHIVED v0.11) | https://docs.zama.org/protocol/solidity-guides/v0.11/smart-contract/oracle.md |
| legacy-v010-oracle.md (ARCHIVED v0.10) | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/solidity-guides/decryption/oracle.md |
| legacy-v010-sdk-public-decryption.md (ARCHIVED v0.10) | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md |
| legacy-v010-sdk-user-decryption.md (ARCHIVED v0.10) | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/user-decryption.md |
| legacy-v010-relayer-oracle.md (ARCHIVED v0.10) | https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md |

## ?ask= responses (doc-grounded Q&A; treat as secondary to page dumps)
| local file | question |
| --- | --- |
| q1-latency.md | typical publicDecrypt latency on Sepolia → **no documented figure** |
| q2-spoofing.md | who may submit cleartext+proof; anti-spoofing → **anyone; proof binds cleartexts to handles; checkSignatures reverts otherwise; no built-in replay protection** |
| q3-requestdecryption.md | fate of FHE.requestDecryption / DecryptionOracle → **deprecated & to be removed in FHEVM v0.9; no request id / automatic callback in current flow** (cites protocol changelog) |
| q4-limits.md | max handles per publicDecrypt / rate limits → **no documented max; HTTP 429 surfaces as RelayerRequestFailedError (.retryable, .retryAfter)** |
| q5-retry.md | unfulfilled decryption / retry / refund → **makePubliclyDecryptable is permanent, retry publicDecrypt freely, no on-chain retry/refund mechanism exists or is needed** |
| q6-acl.md | ACL prerequisites for makePubliclyDecryptable → **calling contract needs ACL access to the handle (typically FHE.allowThis); no FHE.allow to any oracle address needed** |
| q7-hardhat.md | Hardhat mock simulation → **hre.fhevm.publicDecrypt returns proof accepted by FHE.checkSignatures in mock; no awaitDecryptionOracle helper exists; userDecryptEuint/userDecrypt helpers** |
| q8-latency2.md | latency figures / block counts → **none documented; KMS is threshold-MPC (e.g. 9-of-13)** |
