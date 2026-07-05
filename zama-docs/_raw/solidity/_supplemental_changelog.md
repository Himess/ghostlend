> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md).

# Zama Protocol Change Log

### Zama Protocol status

Deployed and planned FHEVM versions on the Testnet and Mainnet.

| Status  | Version     | Details                                    |
| ------- | ----------- | ------------------------------------------ |
| Testnet | FHEVM v0.13 | [Change log ↗](#fhevm-v0.13-june-2026)     |
| Mainnet | FHEVM v0.11 | [Change log ↗](#fhevm-v0.11-february-2026) |

See the full version status in the [Zama Protocol Version Dashboard](https://zamablockchain.grafana.net/public-dashboards/4027c482ad1e44ddb1336ec04cc5a1db).

### Product updates

{% updates format="full" %}
{% update date="2026-06-29" %}

## FHEVM v0.13 — June 2026

**Highlights**

The v0.13 release strengthens multichain support, introduces a redesigned developer SDK, and improves coprocessor consensus monitoring:

* **Improved Multichain support**, building on the multi-chain foundation introduced in v0.12 with per-chain worker isolation and simplified host chain configuration.
* **New `@fhevm/sdk` npm package** with a major refactor of the relayer SDK.
* **New FHE operations**: `FHE.sum` and `FHE.isIn` for aggregation and membership checks on encrypted values.
* **All-contracts delegation**: delegating to the `0xffffffffffffffffffffffffffffffffffffffff` sentinel address grants a user delegation rights over all contracts.
* **Coprocessor consensus drift monitoring**, with metrics and logs that can be used for alerting.
* **tfhe-rs upgraded to v1.6.1** across the Coprocessor and KMS.

**New features**

* **`FHE.sum`** (Copro): sums a list of encrypted values in a single FHE operation.
* **`FHE.isIn`** (Copro): checks whether an encrypted value belongs to a given set.
* **All-contracts delegation** (Copro, KMS, Devex): users can delegate decryption rights across all contracts at once by delegating the `0xffffffffffffffffffffffffffffffffffffffff` contract address. See [RFC 017](https://github.com/zama-ai/tech-spec/pull/410).
* **`@fhevm/sdk` npm package** (Devex): new SDK package replacing the previous relayer SDK structure, with a major refactor.
* **Coprocessor consensus drift monitoring** (Copro): detects anomalous coprocessor consensus drift.
* **Generic event listener** (Copro, Gateway): a generic event listener is now integrated in the Coprocessor.
* **AI skills repository** (Devex): a new public repository of AI agent skills for building on FHEVM — [zama-ai/skills](https://github.com/zama-ai/skills).

**Improvements**

* **Multichain hardening** (Copro): host chains are now seeded declaratively with per-chain worker isolation, the host chain ID is derived from ciphertext handles instead of static gw-listener configuration, and Helm charts are updated for multi-coprocessor and multichain deployments.
* **IAM authentication for the Coprocessor RDS** (Copro): database access now supports IAM-based authentication instead of static credentials.
* **Improved consensus reconciliation** (Copro): better reconciliation logic for multi-coprocessor consensus.
* **KMS context and `extra_data` verification** (KMS, Gateway, Copro): context and extra\_data are now verified on all KMS endpoints.
* **tfhe-rs upgraded to `v1.6.1`** (Copro, KMS).
* **Extensive end-to-end test suite** (Devex): broader e2e coverage across input, compute, and decryption flows.
  {% endupdate %}

{% update date="2026-04-01" tags="preview" %}

## FHEVM v0.12 — April 2026

#### Highlights

The v0.12 release brings multi-chain support, stronger consensus, and tighter resource controls to the Zama Protocol:

* **Multi-chain coprocessor support and multi-coprocessor consensus** with deterministic ciphertext re-randomisation, enabling coprocessors to converge on identical FHE results across chains.
* **KMS context-aware decryptions** introducing epoch IDs and context-state validation across the Gateway, KMS connector, and host contracts.
* **Per-block HCU metering** on the host with configurable per-block, per-transaction, and per-depth Homomorphic Compute Unit limits, plus a whitelist for privileged callers.
* **Simplified ACL (v2)** replacing the MultichainACL contract suite with a single access-control flow on the host chain.
* **Compressed key generation on GPU** in the KMS, lowering key-generation overhead for GPU-backed deployments.

#### New features

* **Multi-chain coprocessor support** (Copro): coprocessors can now serve multiple host chains in a single deployment.
* **Multi-coprocessor consensus** (Copro): independent coprocessors converge on identical FHE results, with deterministic re-randomisation as the foundation.
* **KMS context-aware decryptions** (Gateway, KMS, Host contracts): a new "KMS context" system adds epoch IDs and context state to decryption operations. Decryption requests carry context-aware `extraData`, and the KMS connector validates context state via a new `kms_context` table and Ethereum listener.
* **Per-block HCU limits** (Host contracts): a new `HCULimit` contract enforces configurable per-block, per-transaction, and per-transaction-depth Homomorphic Compute Unit limits, with a whitelist mechanism for privileged callers to bypass block limits.
* **Compressed key generation on GPU** (KMS).
* **Coprocessor state revert tooling** (Copro): new `revert_coprocessor_db_state.sql` script, packaged in the db-migration Docker image, that can revert a coprocessor to a previous block number.
* **Gateway ciphertext drift detection** (Gateway): opt-in detection comparing local ciphertext digests against on-chain consensus, enabled via `--ciphertext-commits-address`.
* **Library-Solidity additions**: `FHE.isPublicDecryptionResultValid` view function for on-chain decryption signature validation; `FHE.fromExternal` returns a trivial-encrypt of `0` for uninitialized handles instead of reverting.
* **relayer-sdk v0.5.x** (Devex): new `extraData` parameter on the relayer SDK.

#### Improvements

* **ACL simplification (v2)** (Host contracts): the MultichainACL contract suite is removed; access control is consolidated on the host chain with simpler validation.
* **New handle format** (Host contracts): handle hashing now includes a `FHE_comp` domain separator and the previous block hash + timestamp, strengthening uniqueness across chains and time.
* **Per-FHE-operation re-randomisation** (Copro): ciphertext inputs are re-randomised per FHE operation using a deterministic seed derived from input ciphertexts and operator.
* **Re-randomisation of input ciphertexts before first compression** (Copro).
* **KMS-connector switched to `eth_getLogs`** (KMS): replaces subscription-based event listening with batched database insertion.
* **tfhe-rs upgraded to v1.5.4** (Copro/MPC).
* **Contract upgrade version check CI**: a new workflow enforces that `REINITIALIZER_VERSION` and version constants are bumped when contract bytecode changes.
* **`ECDSA.sol` renamed to `FhevmECDSA.sol`** to fix naming conflicts.

{% hint style="danger" %}

#### Breaking changes

* **MultichainACL contracts deleted**: `MultichainACL.sol`, `MultichainACLChecks.sol`, and `IMultichainACL.sol` are removed entirely.
* **`isUserDecryptionReady` signature changed**: the `address userAddress` parameter was removed. The old signature is preserved via a backward-compatibility overload but is deprecated.
* **New handle format**: `FHEVMExecutor` handle hashing now prepends `COMPUTATION_DOMAIN_SEPARATOR` (`"FHE_comp"`) and appends `blockhash(block.number-1)` + `block.timestamp`.
* **`HCULimit` contract required**: `FHEVMExecutor` `REINITIALIZER_VERSION` bumped to 3; initialization requires `hcuCapPerBlock`, `maxHCUDepthPerTx`, and `maxHCUPerTx`. Integrators must sync to get whitelisted contracts.
* **ACL `REINITIALIZER_VERSION` bumped to 4**: `ExpirationDateBeforeOneHour` error replaced by `ExpirationDateInThePast`. Validation now only checks `expirationDate > block.timestamp`.
* **`KMSVerifier` upgraded** for context-aware decryption with epoch / context support.
* **`ECDSA.sol` renamed to `FhevmECDSA.sol`**: import path changes from `cryptography/ECDSA.sol` to `cryptography/FhevmECDSA.sol`; library renamed from `ECDSA` to `FhevmECDSA`.
* **Coprocessor**: `tenants` table removed from the DB; legacy `tfhe-worker` gRPC endpoint removed.
  {% endhint %}

#### Bug fixes

* Backport of `prepareUpgrade` flows to the 0.12.x line.
* Reduced coprocessor migration lock time during the 0.12 migration.
* Coprocessor no longer reads key blobs from the database on key cache hits.

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.12.0)
* [Documentation](https://docs.zama.org/protocol/solidity-guides/v0.12)
  {% endupdate %}

{% update date="2026-02-01" tags="new-features,improvements,fixes" %}

## FHEVM v0.11 — February 2026

This release brings major performance and security improvements to the Zama Protocol.

#### Highlights

* **tfhe-rs v1.5.0 upgrade** across Coprocessor and KMS for improved FHE performance
* **ACL checks on host chain** for direct access control enforcement through the relayer and KMS connector
* **Delegated decryption** with a complete end-to-end flow
* **FHE statistics for TFHE-rs** for better observability into Coprocessor FHE operations

#### New features

* **GPU acceleration:** Optional GPU backends for ZK proof verification, Switch-and-Squash (SnS), and re-randomization. CPU-only deployments remain fully supported.
* **Delegated decryption:** Complete end-to-end support for delegated user decryption, allowing authorized addresses to decrypt on behalf of users.
* **Operator staking system:** New ERC-4626-based staking contracts with UUPS upgradeability, permit support, and Operator Rewarder contracts for fee management.
* **Confidential Tokens Registry:** Added a Confidential Tokens Registry and ERC-7984 upgradeable wrapper contracts for encrypted token assets.
* **CLI tool:** Added a new command-line tool for common FHEVM workflows.
* **BNB chain support:** Added configurations for BNB chain deployments.

#### Improvements

* **tfhe-rs upgrade to v1.5.0:** Updated across the Coprocessor and KMS, while FHE keys and serialized ciphertexts remain generally compatible.
* **ACL checks on host chain:** Decryption ACL checks now run directly on the host chain through the relayer and KMS connector, reducing trust assumptions.
* **FHE statistics:** Added FHE operation statistics and decryption performance metrics in the Coprocessor.
* **Dependence-chain processing:** Improved the Coprocessor scheduler for better parallelism.
* **Host-listener poller mode:** Added an alternative polling mode that replaces WebSocket-based event listening.
* **KMS garbage collection:** Added garbage collection for KMS operations.
* **Database optimizations:** Improved indexing for the `ciphertext_digest` table.

#### Fixes

* Overflow prevention in the `ProtocolStaking` cooldown mechanism
* ERC-4626 inflation attack mitigation using decimal offset
* Better handling of cyclic dependence errors in the Coprocessor
* Improved `eth_getLogs` timeout management in the host-listener

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.11.0)
* [Documentation](https://docs.zama.org/protocol/solidity-guides)
  {% endupdate %}

{% update date="2025-10-01" tags="preview,new-features,improvements" %}

## FHEVM v0.10 — October 2025

This preview introduces a dedicated payment contract in the Gateway and flexible delegation of decryption rights through smart contracts.

These changes improve fee management, access control, and the usability of encrypted operations.

#### Preview

* **Gateway payment contract** for Coprocessor and KMS fee management
* **Delegation through smart contracts** for controlled decryption access
* **Time-scoped permissions** for temporary or session-based access
* **Contract-scoped permissions** for stricter access control

#### New features

* **Gateway payment contract:** Adds a dedicated payment contract within the Gateway to manage fees for Coprocessor and KMS operations, including input and decryption flows.
* **Delegation via smart contracts:** Users can delegate decryption rights to other addresses with fine-grained control over scope and duration:
  * Explicit authorization for another address to generate EIP-712 signatures and run `userDecrypt` operations
  * Delegation validity defined by timestamp for temporary or session-based access
  * Delegation scoped to specific contract addresses for context-aware access control

#### Improvements

* More flexible encrypted data access through delegation
* More transparent fee management with a dedicated Gateway payment flow

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.10.0)
* [Documentation](https://docs.zama.org/protocol/solidity-guides/v0.10)
  {% endupdate %}

{% update date="2025-10-01" tags="new-features,improvements,breaking-changes" %}

## FHEVM v0.9 — October 2025

This release adds new key generation capabilities, dynamic coprocessor management, and a redesigned decryption event flow.

These changes improve flexibility, scalability, and consensus handling while deprecating older event formats.

{% hint style="danger" %}

#### Breaking changes

The methods `FHE.requestDecryption` and `FHE.setDecryptionOracle` are now deprecated and must be removed.

Update your contracts to use the new decryption flow through the relayer.
{% endhint %}

#### Highlights

* **On-chain FHE key and CRS generation**
* **Dynamic pauser management**
* **Transaction input re-randomization**
* **Redesigned user decryption events**
* **Gateway API cleanup and renaming**

#### New features

* **Support generation of FHE key and CRS on-chain:**
  * Request FHE key and CRS generation directly through the Gateway.
  * New environment variables for gateway contracts:
    * `KMS_GENERATION_THRESHOLD` — threshold used to validate consensus on FHE key or CRS generation
    * `KMS_NODE_STORAGE_URL_[0-N]` — storage base URL for public materials for each KMS node
  * New environment variable for the coprocessor (`gw-listener`):
    * `KMS_GENERATION_ADDRESS` — address of the `KMSGeneration` gateway contract
  * New environment variable for the connector:
    * `KMS_GENERATION_ADDRESS` — address of the `KMSGeneration` gateway contract

{% hint style="info" %}

#### Obsolete environment variables

These variables are no longer used:

* `FHE_PARAMS_NAME`

* `FHE_PARAMS_DIGEST`
  {% endhint %}

* **New `PauserSet` immutable contract:**
  * Host and Gateway contracts can now be paused by any address added in `PauserSet`.
  * New environment variables for gateway contracts:
    * `NUM_PAUSERS` — number of pauser addresses to add. Set this to `n_kms + n_copro`.
    * `PAUSER_ADDRESS_[0-N]` — pauser addresses
  * New environment variables for host contracts:
    * `NUM_PAUSERS` — number of pauser addresses to add. Set this to `n_kms + n_copro`.
    * `PAUSER_ADDRESS_[0-N]` — pauser addresses

{% hint style="info" %}

#### Obsolete environment variable

This variable is no longer used:

* `PAUSER_ADDRESS`
  {% endhint %}

* **Re-randomization of transaction inputs:**
  * All transaction inputs, including state inputs, are re-encrypted before FHE evaluation.
  * This provides [sIND-CPAD security](https://www.zama.ai/post/drifting-towards-better-error-probabilities-in-fully-homomorphic-encryption).
  * This feature is transparent to users.

#### Improvements

* **User decryption response:**
  * Encrypted shares and signatures are no longer aggregated on-chain in the Gateway.
  * Each KMS response now emits its own event.
  * New events in the `Decryption` contract:
    * `UserDecryptionResponse(uint256 indexed decryptionId, uint256 indexShare, bytes userDecryptedShare, bytes signature, bytes extraData);`
    * `UserDecryptionResponseThresholdReached(uint256 indexed decryptionId);`

{% hint style="danger" %}

#### Breaking changes

This event is deprecated from the Gateway `Decryption` contract:

* `PublicDecryptionResponse(uint256 indexed decryptionId, bytes decryptedResult, bytes[] signatures, bytes extraData)`
  {% endhint %}

* **User decryption request:**
  * User EIP-712 signature verification is simplified in the Gateway `Decryption` contract.

{% hint style="danger" %}

#### Breaking changes

The `uint256 contractsChainId` field is no longer part of the `UserDecryptRequestVerification` struct used for EIP-712 signature verification.
{% endhint %}

* **Gateway contract renaming:**
  * `MultichainAcl` is renamed to `MultichainACL`.
  * `KmsManagement` is renamed to `KMSGeneration`.

{% hint style="danger" %}

#### Breaking changes

These Gateway contracts are renamed:

* `MultichainAcl` → `MultichainACL`
* `KmsManagement` → `KMSGeneration`

These environment variables are renamed:

* `KMS_MANAGEMENT_ADDRESS` → `KMS_GENERATION_ADDRESS`
* `KMS_CONNECTOR_KMS_MANAGEMENT_CONTRACT__ADDRESS` → `KMS_CONNECTOR_KMS_GENERATION_CONTRACT__ADDRESS`

In the KMS Connector Helm chart `values.yaml`, this field is renamed:

* `kmsManagement` → `kmsGeneration`
  {% endhint %}

* **Gateway check functions replaced:**
  * All external `check...` view functions are removed from the Gateway contracts.
  * Associated errors are moved to other contracts or removed.
  * Equivalent `is...` view functions now return a boolean instead of reverting.

{% hint style="danger" %}

#### Breaking changes

All `check...` view functions are removed from the Gateway contracts.

For example:

* `checkPublicDecryptAllowed` is replaced by `isPublicDecryptAllowed`
* `PublicDecryptNotAllowed` is moved to the `Decryption` contract
  {% endhint %}

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.9.0)
* [Documentation](https://docs.zama.org/protocol/solidity-guides/v0.9)
  {% endupdate %}

{% update date="2025-09-01" tags="new-features,improvements,breaking-changes" %}

## FHEVM v0.8 — September 2025

This release makes FHEVM more scalable, secure, and developer-friendly.

#### Highlights

* **New KMS connector** for modular integration
* **Compressed ciphertexts** for lighter payloads
* **Flexible `extraData` field** for richer apps
* **Post-quantum ML-KEM512** for faster, smaller decrypts
* **Stronger chain resilience and ERC-7995 compliance**

#### New features

* **New KMS connector:** Added a new Key Management System connector to improve modularity and integration.
* **Compressed ciphertext support:** Added support for compressed ciphertexts in both the SnS worker and KMS, reducing payload sizes.
* **Generic `extraData` field:** Gateway functions, events, and signed structs now include a generic `extraData` field for extensibility and custom data support.
* **`SepoliaConfig` update:** Added the `protocolId()` function to support protocol identification.

#### Improvements

* **ERC-7995 compatibility:** Updated the Oracle callback interface for compliance, following [ERC-7995](https://github.com/ethereum/ERCs/pull/1143).
* **Reduced user decrypt payload size:** Migrated to **ML-KEM512** for 128-bit equivalent post-quantum security. This reduces decrypt response sizes and allows more responses per block.
* **Host listener:** Added reorganization handling in the host listener for stronger chain resilience.
* **Library storage layout:** Adjusted the storage layout to align with the standard guidelines.

{% hint style="danger" %}

#### Breaking changes

**Oracle callback function signature** now requires this format:

```solidity
function callbackExample(
  uint256 requestID,
  bytes memory cleartexts,
  bytes memory decryptionProof
) external;
```

{% endhint %}

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.8.0)
* [Documentation](https://docs.zama.ai/protocol/solidity-guides/v0.8)
  {% endupdate %}

{% update date="2025-07-01" tags="new-features,breaking-changes" %}

## FHEVM v0.7 — July 2025

This release introduces the first iteration of the Zama Protocol.

#### Highlights

* **Gateway** is now a core component for protocol orchestration.
* **Coprocessor input verification** is now enforced on the coprocessor side.
* **Decryption pipeline** now prepares ciphertexts for decryption on coprocessors.
* **Solidity library** is restructured to match the new protocol architecture.

{% hint style="danger" %}

#### Breaking changes

* Renamed the library from `TFHE` to `FHE`
* Introduced `FHE.requestDecryption` with support for `msg.value`, deprecating `GatewayCaller`
* Removed `ebytesXXX` types
* Replaced `einput` with `externalEuintXXX`, `externalEbool`, and `externalEaddress`
* Introduced per-transaction operation limits, replacing the previous per-block limit
  {% endhint %}

#### Resources

* [GitHub release](https://github.com/zama-ai/fhevm/releases/tag/v0.7.0)
* [Documentation](https://docs.zama.ai/protocol/solidity-guides/v0.7)
  {% endupdate %}
  {% endupdates %}


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
