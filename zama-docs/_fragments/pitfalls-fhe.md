# FHE pitfalls, limits, and anti-patterns (from current solidity-guides, fetched 2026-07-03)

One bullet per finding; source URL after each. "Changelog" = https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md

## Types & arithmetic
- Arithmetic on `e(u)int` is **unchecked — wraps around on overflow/underflow**; no error is raised (by design, to avoid leaking info). Guard manually with `FHE.lt`/`FHE.select`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md
- "FHE arithmetic operators can overflow. Do not forget to take into account such a possibility" — use the select-based overflow-cancel idiom (compute tmp, `isOverflow = FHE.lt(tmp, old)`, select old on overflow). — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md
- `FHE.div` / `FHE.rem` accept **plaintext divisors only**; "Attempting to use an encrypted value as `rhs` will result in a panic." — https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md
- `euint256` supports NO add/sub/mul/div/rem/min/max/gt/ge/lt/le — only bitwise, shifts/rotates, eq/ne, neg, not, select, rand. Don't plan arithmetic on it. — https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md
- `eaddress` (= `euint160`) supports only `eq, ne, select`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md
- `ebytesXXX` types were **removed** in FHEVM v0.7; `einput` replaced by `externalEuintXXX`/`externalEbool`/`externalEaddress`; library renamed `TFHE` → `FHE`. — Changelog (v0.7)
- Shift/rotate second operand is `uint8`/`euint8` and is **computed modulo the bit width** of the first operand (`FHE.shr(euint64 x, 70)` == shift by 6) — differs from Solidity `>>`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md
- Plaintext operand must not exceed encrypted operand's size: `add(uint8, euint8)` valid, `add(uint32 a, euint16 b)` is NOT. — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- Comparison with plaintext LEFT operand silently inverts operand order and calls the *opposite* comparison (`gt(uint32 a, euint16 b)` actually returns `lt(b, a)`). — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- `FHE.neg` on unsigned types returns the **modular opposite**, not a signed negative. — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- Functions performing FHE operations **cannot be `view`** (FHE ops are state-changing); you cannot compute an encrypted sum inside `eth_call`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- Uninitialized encrypted values are treated as `0` / `false` in computations — check `FHE.isInitialized(v)` where that matters. — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md + …/smart-contract/configure.md
- Oversized types waste gas/HCU: use the smallest euint that fits (e.g. `euint8` for 0-255), not `euint128`/`euint256`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md
- Prefer scalar operands over `FHE.asEuint(x)`-wrapped ciphertext operands — "this will save a lot of gas" for the same encrypted result. — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md

## HCU limits
- Per-transaction HCU limits (page says "current devnet"): **global 20,000,000 HCU** and **sequential depth 5,000,000 HCU**; "If either limit is exceeded, the transaction will revert." Fix: refactor to fewer FHE ops or split across independent transactions. — https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md
- Sepolia-specific HCU numbers are NOT documented (only the `HCU_LIMIT_CONTRACT` address 0xa10998783c8CF88D886Bc30307e631D6686F0A22); assume devnet numbers, verify empirically. — ?ask response on hcu.md + https://docs.zama.org/protocol/solidity-guides/smart-contract/configure/contract_addresses.md
- Since FHEVM v0.12 there are also configurable **per-block** HCU limits (whitelist can bypass) — long chains of dependent FHE ops (depth) bind before the global budget. — Changelog (v0.12)
- Non-scalar `mul` is brutal: euint64 mul = 596,000 HCU; euint128 mul = 1,686,000 HCU; euint64 `rem` (scalar) = 1,153,000; euint128 `rem` = 1,943,000. A handful of big-width mul/div/rem ops can eat the whole 5M depth budget. — https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md

## ACL mistakes
- **Missing `FHE.isSenderAllowed(input)` on ciphertext arguments = inference attack**: attacker passes the victim's balance handle as their own transfer amount and binary-searches the victim's balance from success/failure effects ("Each successful or failed transfer leaks one bit"). Always `require(FHE.isSenderAllowed(encryptedAmount), ...)` for handles passed by callers. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md
- Forgetting `FHE.allowThis(newHandle)` after each state update: FHE op results are only **ephemerally** allowed to the contract for the duration of the call and revoked at function exit — without `allowThis` the contract cannot reuse the stored handle in later transactions. — ?ask response (fheadd example) + every example in https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/conditions.md
- User decryption requires the handle to be allowed for **both** the user AND the contract ("a value that needs to be decrypted must be explicitly authorized for both the user and the contract"). `FHE.allow(h, user)` alone is not enough — also `FHE.allowThis(h)`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md
- Encrypted constants created in the constructor (e.g. error codes) need `FHE.allowThis` in the constructor or they can't be used in later transactions. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md
- `FHE.makePubliclyDecryptable` requires the calling contract to already have ACL permission on the handle; it is **permanent** and makes the plaintext readable by anyone — irreversible reveal. — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- `FHE.allowTransient` grants access only for the current transaction (EIP-1153 transient storage) — do not use it for values a contract/user must access in a later transaction. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md
- When calling another contract with a ciphertext (e.g. confidential token `transferFrom`), you must first `FHE.allowTransient(handle, tokenContract)` or the callee can't operate on it. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md
- Denied accounts (`FHE.isAccountDenied`) are blocked from `allow*` calls — they can neither grant nor receive new permissions. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md
- Delegation mistake: `FHE.delegateUserDecryption(relayer, address(this), exp)` from inside a contract "always reverts because `msg.sender == contractAddress`" — an EOA must delegate its own rights by calling `IACL.delegateForUserDecryption` on the ACL directly; the FHE helper delegates the *contract's* rights only. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md
- Delegation invariants: `msg.sender != contractAddress`, `msg.sender != delegate`, `delegate != contractAddress`, `expirationDate > block.timestamp`, and at most one delegate-or-revoke per block per (delegator, delegate, contractAddress) tuple. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md + …/smart-contract/functions.md
- **Reorg leak**: ACL events propagate to the Gateway immediately on block inclusion; a `FHE.allow` in a reorged-out block can still leak the secret. For high-value data use two-step authorization with a >95-block timelock before the `FHE.allow`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md

## Handles
- Never infer anything from handle bytes: only guarantee is "equal handles → equal plaintexts" (+ different plaintexts → different handles). You canNOT rely on: different handles → different plaintexts; equal plaintexts → equal handles; equal handles → same computation/ciphertext. — https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md
- Same op + same inputs in different blocks gives **different handles** (previous block hash is mixed into handle derivation) — don't dedupe or compare logic via handle equality; use `FHE.eq` for plaintext equality. — https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md
- Handle format changed in FHEVM v0.12 ("FHE_comp" domain separator + prev blockhash + timestamp) — never hardcode/derive handle values. — Changelog (v0.12)

## Control flow & decryption
- Encrypted conditions **cannot revert the transaction** ("Transactions do not revert if a condition fails") — a failed encrypted check must be neutralized with `FHE.select` and surfaced via the encrypted last-error idiom + event. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/error_handling.md
- Cannot `break` a loop on an encrypted condition; use a constant-bound loop with `FHE.select` inside. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md
- Encrypted-index array access requires a full O(n) homomorphic scan (`FHE.eq` + `FHE.select` per element) — "very expensive in gas and should be avoided whenever possible." — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md
- Every `FHE.select` assignment creates a **new ciphertext handle** even if the plaintext didn't change — re-grant ACL each time; also don't infer "no change" from the outside. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/conditions.md
- Moving from an encrypted condition to public logic is always **async**: makePubliclyDecryptable → off-chain publicDecrypt → on-chain `FHE.checkSignatures`. There is no synchronous decrypt in a contract. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/conditions.md
- `FHE.checkSignatures` handle order must exactly match the off-chain `publicDecrypt` order ("A proof computed for `[handleA, handleB]` is different from a proof computed for `[handleB, handleA]`"). — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- `FHE.checkSignatures` / `isPublicDecryptionResultValid` provide **no replay protection** — the consuming function must add its own state guard (e.g. `require(!isPrizeDistributed)` / status enum). — https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md
- `FHE.requestDecryption` and `FHE.setDecryptionOracle` are **deprecated since FHEVM v0.9 and must be removed**; use the relayer-based flow (makePubliclyDecryptable + checkSignatures). Any tutorial using the oracle-callback pattern is outdated. — Changelog (v0.9)
- Privacy leaks through *behavior*, not just values: in an AMM (or lending) flow, do the transfers on **both** legs every time (one leg encrypted-zero) or observers learn the direction/branch taken. — https://docs.zama.org/protocol/solidity-guides/smart-contract/logics/loop.md

## Inputs
- Trivially encrypted values (`FHE.asEuintXX(plain)`) are **publicly visible on-chain** — "not secure in any sense"; never route secrets through trivial encryption. — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md + …/smart-contract/functions.md
- Downcasting (`euint64` → `euint32`) truncates (drops most significant bits) silently. — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md
- Pack all of a transaction's encrypted inputs into ONE `createEncryptedInput` (one proof) — proofs are per (contract, user) pair; handles are indexed in add-order (`handles[0]`, `handles[1]`, …). — https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md
- Packing ceilings are not in current docs; ARCHIVED v0.10 coprocessor defaults via ?ask: max **255 handles per input proof**, CRS max **2048 bits** total. Don't design inputs beyond that without testing. — ?ask response citing /v0.10/ coprocessor docs (ARCHIVED source)
- Since FHEVM v0.12, `FHE.fromExternal` on an uninitialized handle returns trivial-encrypt of `0` instead of reverting — invalid input can silently become 0. — Changelog (v0.12)

## Randomness
- `FHE.randEuintX` only works in transactions (mutates PRNG state) — **not** via `eth_call`; bounded variant requires the upper bound to be a **power of 2** (range `[0, upperBound - 1]`). — https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md

## Config / environment
- `SepoliaConfig` was **removed in FHEVM v0.9** — inherit `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` (auto-resolves addresses via `block.chainid`; requires `@fhevm/solidity` >= 0.9.1). — ?ask response citing the v0.9 migration guide + https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md
- `InputVerifier` is NOT part of the inherited config; it is resolved at runtime via `FHEVMExecutor.getInputVerifierAddress()`. — https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md
- `FHE.sum` / `FHE.isIn` (announced for FHEVM v0.13, tagged Copro) are NOT in the current Solidity API docs (roadmap "ETA -") — do not use them in a design. — Changelog (v0.13) + ?ask response on functions.md
- Overflow-checked encrypted integers are only "coming soon" — not available today. — https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md
- Hardhat needs an even-numbered Node.js LTS (v18/v20); odd versions misbehave. Default MNEMONIC/INFURA_API_KEY fallbacks are not suitable for real deployments. — https://docs.zama.org/protocol/solidity-guides/getting-started/setup.md
- `ECDSA.sol` was renamed `FhevmECDSA.sol` in FHEVM v0.12 (import path change). — Changelog (v0.12)
