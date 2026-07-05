# FHEVM Solidity — Core Reference (current docs, fetched 2026-07-03)

Source of truth: raw markdown dumps in `zama-docs/_raw/solidity/` (see `zama-docs/_raw/solidity-manifest.md`).
All tables, signatures, and code blocks below are copied **verbatim** from those dumps. Anything not verbatim is marked.

## 0. Versions (read this first)

- `npm view @fhevm/solidity version` → **0.11.1** (latest, published 2026-02-19). Dist-tags: `latest: 0.11.1`, `prerelease: 0.9.0-1`.
- Protocol changelog status (verbatim table): Testnet = **FHEVM v0.13**, Mainnet = **FHEVM v0.11**. (Source: https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md)
- **FHEVM protocol versions (v0.7…v0.13) are a different numbering scheme from the `@fhevm/solidity` npm package versions (0.7.0…0.11.1).** The docs do not pin an npm version ("The Solidity guides in this docs set do not specify an npm version" — ?ask response). Archived doc trees exist at `/v0.10/`, `/v0.11/`, `/v0.12/`; everything cited below without a `/vX.Y/` path segment is the **current** docs tree.
- Key migration history (verbatim bullets from the changelog, https://docs.zama.org/protocol/changelog/zama-protocol-change-log.md):
  - **FHEVM v0.7 (July 2025), breaking:** "Renamed the library from `TFHE` to `FHE`", "Introduced `FHE.requestDecryption` with support for `msg.value`, deprecating `GatewayCaller`", "Removed `ebytesXXX` types", "Replaced `einput` with `externalEuintXXX`, `externalEbool`, and `externalEaddress`", "Introduced per-transaction operation limits, replacing the previous per-block limit".
  - **FHEVM v0.9 (October 2025), breaking:** "The methods `FHE.requestDecryption` and `FHE.setDecryptionOracle` are now deprecated and must be removed. Update your contracts to use the new decryption flow through the relayer." Also (per ?ask response citing the migration guide): "Unified `ZamaEthereumConfig` [replaces] `SepoliaConfig`" and "⚠️ Removal: The `SepoliaConfig` contract is now removed", minimum `@fhevm/solidity` **v0.9.1**.
  - **FHEVM v0.12 (April 2026), breaking:** MultichainACL contracts deleted; "New handle format: `FHEVMExecutor` handle hashing now prepends `COMPUTATION_DOMAIN_SEPARATOR` (`\"FHE_comp\"`) and appends `blockhash(block.number-1)` + `block.timestamp`"; "`HCULimit` contract required" (per-block, per-transaction, per-depth limits + whitelist); ACL error `ExpirationDateBeforeOneHour` replaced by `ExpirationDateInThePast`; `ECDSA.sol` renamed to `FhevmECDSA.sol`. New: "`FHE.isPublicDecryptionResultValid` view function"; "`FHE.fromExternal` returns a trivial-encrypt of `0` for uninitialized handles instead of reverting".
  - **FHEVM v0.13 (June 2026, current Testnet):** "New FHE operations: `FHE.sum` and `FHE.isIn`" (tagged "(Copro)"); "All-contracts delegation: delegating to the `0xffffffffffffffffffffffffffffffffffffffff` sentinel address grants a user delegation rights over all contracts"; new `@fhevm/sdk` npm package replacing the previous relayer SDK. **UNCERTAIN:** `FHE.sum`/`FHE.isIn` do NOT appear anywhere in the current solidity-guides API reference or operations pages; a ?ask response says the Roadmap lists "Set inclusion" `FHE.isIn()` with "ETA -" and "I cannot find `FHE.sum` or `FHE.isIn` as available, supported operators in the current Solidity operations documented for `@fhevm/solidity`." Do not design around them.

---

## 1. Supported encrypted types

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md

Verbatim type table ("The `FHE` library currently supports the following encrypted types:"):

| Type     | Bit Length | Supported Operators                                                                                                                | Aliases (with supported operators)                                                      |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Ebool    | 2          | and, or, xor, eq, ne, not, select, rand                                                                                            |                                                                                         |
| Euint8   | 8          | add, sub, mul, div, rem, and, or, xor, shl, shr, rotl, rotr, eq, ne, ge, gt, le, lt, min, max, neg, not, select, rand, randBounded |                                                                                         |
| Euint16  | 16         | add, sub, mul, div, rem, and, or, xor, shl, shr, rotl, rotr, eq, ne, ge, gt, le, lt, min, max, neg, not, select, rand, randBounded |                                                                                         |
| Euint32  | 32         | add, sub, mul, div, rem, and, or, xor, shl, shr, rotl, rotr, eq, ne, ge, gt, le, lt, min, max, neg, not, select, rand, randBounded |                                                                                         |
| Euint64  | 64         | add, sub, mul, div, rem, and, or, xor, shl, shr, rotl, rotr, eq, ne, ge, gt, le, lt, min, max, neg, not, select, rand, randBounded |                                                                                         |
| Euint128 | 128        | add, sub, mul, div, rem, and, or, xor, shl, shr, rotl, rotr, eq, ne, ge, gt, le, lt, min, max, neg, not, select, rand, randBounded |                                                                                         |
| Euint160 | 160        | eq, ne, select                                                                                                                     | Eaddress — `eaddress` is an alias for `euint160`, used for encrypted Ethereum addresses |
| Euint256 | 256        | and, or, xor, shl, shr, rotl, rotr, eq, ne, neg, not, select, rand, randBounded                                                    |                                                                                         |

Key answers:
- **`euint128` exists** with the full operator set (incl. add/sub/mul/div/rem/comparisons/min/max).
- **`euint256` exists but supports NO add/sub/mul/div/rem/min/max/comparisons other than eq/ne** — only bitwise, shifts/rotates, eq, ne, neg, not, select, rand, randBounded. Do not plan arithmetic on `euint256`.
- **`eaddress`** = alias of `euint160`; only `eq, ne, select`.
- **`ebool`** exists (bit length listed as 2); ops: and, or, xor, eq, ne, not, select, rand. (functions.md adds: "In the backend, the boolean is represented by an encrypted unsigned integer of bit width 8, but this is abstracted away by the Solidity library.")
- **`ebytesXX` types do NOT exist.** Changelog v0.7 breaking change (verbatim): "Removed `ebytesXXX` types". They are absent from the current types list. (?ask response: "the current FHEVM Solidity `FHE` library does **not** include encrypted byte types like `ebytes64`, `ebytes128`, or `ebytes256`… removed in FHEVM v0.7 (July 2025)".)
- No signed encrypted integers appear in the types table. (One ?ask response casually mentioned "eint* (signed integers)" but this is corroborated nowhere in the fetched pages — treat signed types as **not available**; see questions-fhe.md.)
- Input wrapper types (getting-started/overview.md + functions.md): `externalEbool`, `externalEuint8/16/32/64/128/256`, `externalEaddress`.
- Verbatim hints (types.md): "Arithmetic operations on `e(u)int` types are **unchecked**, meaning they wrap around on overflow." — "Encrypted integers with overflow checking will soon be available in the `FHE` library. These will allow reversible arithmetic operations but may reveal some information about the input values." — "Division (`div`) and remainder (`rem`) operations are only supported when the right-hand side (`rhs`) operand is a plaintext (non-encrypted) value. Attempting to use an encrypted value as `rhs` will result in a panic." — "Higher-precision integer types are available in the `TFHE-rs` library and can be added to `fhevm` as needed."

---

## 2. Operations

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md and https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md

Verbatim operation tables:

**Arithmetic:**

| Name                         | Function name | Symbol | Type   |
| ---------------------------- | ------------- | ------ | ------ |
| Add                          | `FHE.add`     | `+`    | Binary |
| Subtract                     | `FHE.sub`     | `-`    | Binary |
| Multiply                     | `FHE.mul`     | `*`    | Binary |
| Divide (plaintext divisor)   | `FHE.div`     |        | Binary |
| Reminder (plaintext divisor) | `FHE.rem`     |        | Binary |
| Negation                     | `FHE.neg`     | `-`    | Unary  |
| Min                          | `FHE.min`     |        | Binary |
| Max                          | `FHE.max`     |        | Binary |

Hint (verbatim): "Division (FHE.div) and remainder (FHE.rem) operations are currently supported only with plaintext divisors."

**Bitwise:**

| Name         | Function name | Symbol | Type   |
| ------------ | ------------- | ------ | ------ |
| Bitwise AND  | `FHE.and`     | `&`    | Binary |
| Bitwise OR   | `FHE.or`      | `\|`   | Binary |
| Bitwise XOR  | `FHE.xor`     | `^`    | Binary |
| Bitwise NOT  | `FHE.not`     | `~`    | Unary  |
| Shift Right  | `FHE.shr`     |        | Binary |
| Shift Left   | `FHE.shl`     |        | Binary |
| Rotate Right | `FHE.rotr`    |        | Binary |
| Rotate Left  | `FHE.rotl`    |        | Binary |

Shift semantics (verbatim): "The shift operators `FHE.shr` and `FHE.shl` can take any encrypted type `euintX` as a first operand and either a `uint8`or a `euint8` as a second operand, however the second operand will always be computed modulo the number of bits of the first operand. For example, `FHE.shr(euint64 x, 70)` is equivalent to `FHE.shr(euint64 x, 6)` because `70 % 64 = 6`. This differs from the classical shift operators in Solidity, where there is no intermediate modulo operation".

**Comparison:**

| Name                  | Function name | Symbol | Type   |
| --------------------- | ------------- | ------ | ------ |
| Equal                 | `FHE.eq`      |        | Binary |
| Not equal             | `FHE.ne`      |        | Binary |
| Greater than or equal | `FHE.ge`      |        | Binary |
| Greater than          | `FHE.gt`      |        | Binary |
| Less than or equal    | `FHE.le`      |        | Binary |
| Less than             | `FHE.lt`      |        | Binary |

Comparisons return `ebool`. Plaintext-left-operand note (functions.md, verbatim): "**Note** that in the case of ciphertext-plaintext operations, since our backend only accepts plaintext right operands, calling the operation with a plaintext left operand will actually invert the operand order and call the *opposite* comparison."

**Ternary:** `FHE.select` — see section 7. **Random:** `FHE.randEuintX()` — see section 9.

**Scalar vs ciphertext operands** (functions.md, verbatim): "**Ciphertext-Plaintext Interoperability**: Supports operations that mix encrypted and plaintext operands, provided the plaintext operand's size does not exceed the encrypted operand's size. Example: `add(uint8 a, euint8 b)` is valid, but `add(uint32 a, euint16 b)` is not. Ciphertext-plaintext operations are generally faster and consume less gas than ciphertext-ciphertext operations." Also "**Implicit Upcasting**: Automatically adjusts operand types when necessary". Bitwise special case (verbatim): "Unlike other binary operations, bitwise operations do not natively accept a mix of ciphertext and plaintext inputs. To ease developer experience, the `FHE` library adds function overloads for these operations. Such overloads implicitly do a trivial encryption before actually calling the operation function."

Best practice (operations.md, verbatim): "Some FHE operators exist in two versions: one where all operands are ciphertexts handles, and another where one of the operands is an unencrypted scalar. Whenever possible, use the scalar operand version, as this will save a lot of gas."

```solidity
euint32 x;
// ...
x = FHE.add(x,42);        // ✅ scalar version — much cheaper
x = FHE.add(x,FHE.asEuint(42)); // ❌ same result, way more gas
```

**Overflow/underflow semantics:** unchecked wrap-around (types.md, section 1 above). Overflow-guard idiom (operations.md, verbatim — directly applicable to lending mint/deposit flows):

```solidity
function mint(externalEuint32 encryptedAmount, bytes calldata inputProof) public {
  euint32 mintedAmount = FHE.fromExternal(encryptedAmount, inputProof);
  euint32 tempTotalSupply = FHE.add(totalSupply, mintedAmount);
  ebool isOverflow = FHE.lt(tempTotalSupply, totalSupply);
  totalSupply = FHE.select(isOverflow, totalSupply, tempTotalSupply);
  euint32 tempBalanceOf = FHE.add(balances[msg.sender], mintedAmount);
  balances[msg.sender] = FHE.select(isOverflow, balances[msg.sender], tempBalanceOf);
  FHE.allowThis(balances[msg.sender]);
  FHE.allow(balances[msg.sender], msg.sender);
}
```

Selected verbatim signatures (functions.md):

```solidity
function add(T a, T b) internal returns (T)
function sub(T a, T b) internal returns (T)
function mul(T a, T b) internal returns (T)

// a + b
function add(euint8 a, euint8 b) internal view returns (euint8)
function add(euint8 a, euint16 b) internal view returns (euint16)
function add(uint32 a, euint32 b) internal view returns (euint32)

// a / b
function div(euint8 a, uint8 b) internal pure returns (euint8)
function div(euint16 a, uint16 b) internal pure returns (euint16)
function div(euint32 a, uint32 b) internal pure returns (euint32)

function min(T a, T b) internal returns (T)
function max(T a, T b) internal returns (T)

function and(T a, T b) internal returns (T)
function or(T a, T b) internal returns (T)
function xor(T a, T b) internal returns (T)

function shl(euint16 a, euint8 b) internal view returns (euint16)
function shr(euint32 a, euint16 b) internal view returns (euint32)
function rotl(euint16 a, euint8 b) internal view returns (euint16)
function rotr(euint32 a, euint16 b) internal view returns (euint32)

function eq(T a, T b) internal returns (ebool)
function ne(T a, T b) internal returns (ebool)
function ge(T a, T b) internal returns (ebool)
function gt(T a, T b) internal returns (ebool)
function le(T a, T b) internal returns (ebool)
function lt(T a, T b) internal returns (ebool)

function select(ebool control, T a, T b) internal returns (T)
```

`neg` note (verbatim): "since we work with unsigned integers, the result of negation is interpreted as the modular opposite. The `not` operator returns the value obtained after flipping all the bits of the operand."

**No `view` FHE functions** (functions.md, verbatim warning): "Functions with FHE operations cannot be marked as `view` since FHE operations cost gas to execute since they always involve a state-change. For instance, you cannot compute and return the encrypted sum of two encrypted values in a view function." (Returning already-stored handles from a `view` getter is fine — see inputs.md examples.)

Uninitialized values (functions.md, verbatim): "Uninitialized encrypted values are treated as `0` (for integers) or `false` (for booleans) in computations."

---

## 3. HCU (Homomorphic Complexity Units)

Source: https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md

What it is (verbatim): "FHE operations in FHEVM are computationally intensive… To manage computational load and prevent potential denial-of-service attacks, FHEVM implements a metering system called **Homomorphic Complexity Units ("HCU")**. … there is a contract named `HCULimit`, which monitors HCU consumption for each transaction and enforces two key limits:
- **Sequential homomorphic operations depth limit per transaction**: Controls HCU usage for operations that must be processed in order.
- **Global homomorphic operations complexity per transaction**: Controls HCU usage for operations that can be processed in parallel.
If either limit is exceeded, the transaction will revert."

Limits (verbatim): "The current devnet has an HCU limit of **20,000,000** per transaction and an HCU depth limit of **5,000,000** per transaction. If either HCU limit is exceeded, the transaction will revert. To resolve this, you must do one of the following: Refactor your code to reduce the number of FHE operations in your transaction. / Split your FHE operations across multiple independent transactions."

**Note:** the page says "devnet"; a ?ask query confirmed the docs give no Sepolia-specific numbers (Sepolia does have `HCU_LIMIT_CONTRACT` = `0xa10998783c8CF88D886Bc30307e631D6686F0A22`). Treat 20M global / 5M sequential-depth as the working per-transaction budget. FHEVM v0.12 additionally introduced **per-block** HCU limits (changelog: "a new `HCULimit` contract enforces configurable per-block, per-transaction, and per-transaction-depth Homomorphic Compute Unit limits, with a whitelist mechanism for privileged callers to bypass block limits").

### HCU cost tables (verbatim, complete)

#### Boolean operations (`ebool`)

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `and`         | 22,000       | 25,000           |
| `or`          | 22,000       | 24,000           |
| `xor`         | 2,000        | 22,000           |
| `not`         | -            | 2                |
| `select`      | -            | 55,000           |
| `randEbool`   | -            | 19,000           |

#### 8-bit Encrypted integers (`euint8`)

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `add`         | 84,000       | 88,000           |
| `sub`         | 84,000       | 91,000           |
| `mul`         | 122,000      | 150,000          |
| `div`         | 210,000      | -                |
| `rem`         | 440,000      | -                |
| `and`         | 31,000       | 31,000           |
| `or`          | 30,000       | 30,000           |
| `xor`         | 31,000       | 31,000           |
| `shr`         | 32,000       | 91,000           |
| `shl`         | 32,000       | 92,000           |
| `rotr`        | 31,000       | 93,000           |
| `rotl`        | 31,000       | 91,000           |
| `eq`          | 55,000       | 55,000           |
| `ne`          | 55,000       | 55,000           |
| `ge`          | 52,000       | 63,000           |
| `gt`          | 52,000       | 59,000           |
| `le`          | 58,000       | 58,000           |
| `lt`          | 52,000       | 59,000           |
| `min`         | 84,000       | 119,000          |
| `max`         | 89,000       | 121,000          |
| `neg`         | -            | 79,000           |
| `not`         | -            | 9                |
| `select`      | -            | 55,000           |
| `randEuint8`  | -            | 23,000           |

#### 16-bit Encrypted integers (`euint16`)

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `add`         | 93,000       | 93,000           |
| `sub`         | 93,000       | 93,000           |
| `mul`         | 193,000      | 222,000          |
| `div`         | 302,000      | -                |
| `rem`         | 580,000      | -                |
| `and`         | 31,000       | 31,000           |
| `or`          | 30,000       | 31,000           |
| `xor`         | 31,000       | 31,000           |
| `shr`         | 32,000       | 123,000          |
| `shl`         | 32,000       | 125,000          |
| `rotr`        | 31,000       | 125,000          |
| `rotl`        | 31,000       | 125,000          |
| `eq`          | 55,000       | 83,000           |
| `ne`          | 55,000       | 83,000           |
| `ge`          | 55,000       | 84,000           |
| `gt`          | 55,000       | 84,000           |
| `le`          | 58,000       | 83,000           |
| `lt`          | 58,000       | 84,000           |
| `min`         | 88,000       | 146,000          |
| `max`         | 89,000       | 145,000          |
| `neg`         | -            | 93,000           |
| `not`         | -            | 16               |
| `select`      | -            | 55,000           |
| `randEuint16` | -            | 23,000           |

#### 32-bit Encrypted Integers (`euint32`)

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `add`         | 95,000       | 125,000          |
| `sub`         | 95,000       | 125,000          |
| `mul`         | 265,000      | 328,000          |
| `div`         | 438,000      | -                |
| `rem`         | 792,000      | -                |
| `and`         | 32,000       | 32,000           |
| `or`          | 32,000       | 32,000           |
| `xor`         | 32,000       | 32,000           |
| `shr`         | 32,000       | 163,000          |
| `shl`         | 32,000       | 162,000          |
| `rotr`        | 32,000       | 160,000          |
| `rotl`        | 32,000       | 163,000          |
| `eq`          | 82,000       | 86,000           |
| `ne`          | 83,000       | 85,000           |
| `ge`          | 84,000       | 118,000          |
| `gt`          | 84,000       | 118,000          |
| `le`          | 84,000       | 117,000          |
| `lt`          | 83,000       | 117,000          |
| `min`         | 117,000      | 182,000          |
| `max`         | 117,000      | 180,000          |
| `neg`         | -            | 131,000          |
| `not`         | -            | 32               |
| `select`      | -            | 55,000           |
| `randEuint32` | -            | 24,000           |

#### 64-bit Encrypted integers (`euint64`)

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `add`         | 133,000      | 162,000          |
| `sub`         | 133,000      | 162,000          |
| `mul`         | 365,000      | 596,000          |
| `div`         | 715,000      | -                |
| `rem`         | 1,153,000    | -                |
| `and`         | 34,000       | 34,000           |
| `or`          | 34,000       | 34,000           |
| `xor`         | 34,000       | 34,000           |
| `shr`         | 34,000       | 209,000          |
| `shl`         | 34,000       | 208,000          |
| `rotr`        | 34,000       | 209,000          |
| `rotl`        | 34,000       | 209,000          |
| `eq`          | 83,000       | 120,000          |
| `ne`          | 84,000       | 118,000          |
| `ge`          | 116,000      | 152,000          |
| `gt`          | 117,000      | 152,000          |
| `le`          | 119,000      | 149,000          |
| `lt`          | 118,000      | 146,000          |
| `min`         | 150,000      | 219,000          |
| `max`         | 149,000      | 218,000          |
| `neg`         | -            | 131,000          |
| `not`         | -            | 63               |
| `select`      | -            | 55,000           |
| `randEuint64` | -            | 24,000           |

#### 128-bit Encrypted integers (`euint128`)

| Function name  | HCU (scalar) | HCU (non-scalar) |
| -------------- | ------------ | ---------------- |
| `add`          | 172,000      | 259,000          |
| `sub`          | 172,000      | 260,000          |
| `mul`          | 696,000      | 1,686,000        |
| `div`          | 1,225,000    | -                |
| `rem`          | 1,943,000    | -                |
| `and`          | 37,000       | 37,000           |
| `or`           | 37,000       | 37,000           |
| `xor`          | 37,000       | 37,000           |
| `shr`          | 37,000       | 272,000          |
| `shl`          | 37,000       | 272,000          |
| `rotr`         | 37,000       | 283,000          |
| `rotl`         | 37,000       | 278,000          |
| `eq`           | 117,000      | 122,000          |
| `ne`           | 117,000      | 122,000          |
| `ge`           | 149,000      | 210,000          |
| `gt`           | 150,000      | 218,000          |
| `le`           | 150,000      | 218,000          |
| `lt`           | 149,000      | 215,000          |
| `min`          | 186,000      | 289,000          |
| `max`          | 180,000      | 290,000          |
| `neg`          | -            | 168,000          |
| `not`          | -            | 130              |
| `select`       | -            | 57,000           |
| `randEuint128` | -            | 25,000           |

#### 256-bit Encrypted integers (`euint256`)

| Function name  | HCU (scalar) | HCU (non-scalar) |
| -------------- | ------------ | ---------------- |
| `and`          | 38,000       | 38,000           |
| `or`           | 38,000       | 38,000           |
| `xor`          | 39,000       | 39,000           |
| `shr`          | 38,000       | 369,000          |
| `shl`          | 39,000       | 378,000          |
| `rotr`         | 40,000       | 375,000          |
| `rotl`         | 38,000       | 378,000          |
| `eq`           | 118,000      | 152,000          |
| `ne`           | 117,000      | 150,000          |
| `neg`          | -            | 269,000          |
| `not`          | -            | 130              |
| `select`       | -            | 108,000          |
| `randEuint256` | -            | 30,000           |

#### Encrypted addresses (`euint160`)

"When using `eaddress` (internally represented as `euint160`), the HCU costs for equality and inequality checks and select are as follows:"

| Function name | HCU (scalar) | HCU (non-scalar) |
| ------------- | ------------ | ---------------- |
| `eq`          | 115,000      | 125,000          |
| `ne`          | 115,000      | 124,000          |
| `select`      | -            | 83,000           |

#### Additional Operations

| Function name    | HCU |
| ---------------- | --- |
| `cast`           | 32  |
| `trivialEncrypt` | 32  |

Practical budgeting example (derived, not verbatim): a euint64 confidential-transfer pattern (`le` + 2×`select` + `add` + `sub` non-scalar) ≈ 149k + 110k + 162k + 162k ≈ 583k HCU — roughly 30 such flows fit the 20M global budget, but the 5M **sequential depth** limit binds long dependent chains first.

---

## 4. ACL (Access Control List)

Sources: https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md , https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/acl_examples.md , https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md

Types of access (acl.md, verbatim):
- "**Permanent allowance**: Configured using `FHE.allow(ciphertext, address)`. Grants long-term access to the ciphertext for a specific address. Stored in a dedicated contract for persistent storage."
- "**Transient allowance**: Configured using `FHE.allowTransient(ciphertext, address)`. Grants access to the ciphertext only for the duration of the current transaction. Stored in transient storage, reducing gas costs. Ideal for temporary operations like passing ciphertexts to external functions."
- "**Permanent public allowance**: Configured using `FHE.makePubliclyDecryptable(ciphertext)`. Grants long-term access to the ciphertext for any user."
- "`FHE.allowThis(ciphertext)` is shorthand for `FHE.allow(ciphertext, address(this))`. It authorizes the current contract to reuse a ciphertext handle in future transactions."

| Allowance type | Purpose                                        | Storage type                                                            | Use case                                                                                            |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Transient**  | Temporary access during a transaction.         | [Transient storage](https://eips.ethereum.org/EIPS/eip-1153) (EIP-1153) | Calling external functions or computations with ciphertexts. Use when wanting to save on gas costs. |
| **Permanent**  | Long-term access across multiple transactions. | Dedicated contract storage                                              | Persistent ciphertexts for contracts or users requiring ongoing access.                             |

Verbatim signatures (functions.md):

```solidity
function allow(T value, address account) internal
function allowThis(T value) internal
function allowTransient(T value, address account) internal

function isAllowed(T value, address account) internal view returns (bool)
function isSenderAllowed(T value) internal view returns (bool)

function makePubliclyDecryptable(T value) internal returns (T)
function isPubliclyDecryptable(T value) internal view returns (bool)

function isAccountDenied(address account) internal view returns (bool)

function cleanTransientStorage() internal

function toBytes32(T value) internal pure returns (bytes32)

function checkSignatures(
    bytes32[] memory handlesList,
    bytes memory abiEncodedCleartexts,
    bytes memory decryptionProof
) internal

function isPublicDecryptionResultValid(
    bytes32[] memory handlesList,
    bytes memory abiEncodedCleartexts,
    bytes memory decryptionProof
) internal view returns (bool)
```

- `makePubliclyDecryptable` (verbatim): "Marks an encrypted value as publicly decryptable. Once called, any entity can request the off-chain decryption of this value via the Zama SDK. Supported for all encrypted types… **The calling contract must have ACL permission to access the handle.**"
- `isAllowed`/`isSenderAllowed` (verbatim hint): "Both functions return `true` if the ciphertext is authorized for the specified address, regardless of whether the allowance is stored in the ACL contract or in transient storage."
- `isAccountDenied` (acl.md, verbatim): "Denied accounts are blocked from `allow*` calls inside the ACL contract, so they cannot grant or receive new permissions on encrypted values."
- `checkSignatures` (verbatim): reverts if "The `decryptionProof` is empty or has invalid length / The number of valid signatures is below the KMS signers threshold / Any signature is from a non-registered KMS signer". Warning (verbatim): "The order of handles in `handlesList` must match the order used when calling `publicDecrypt` off-chain. A proof computed for `[handleA, handleB]` is different from a proof computed for `[handleB, handleA]`." And: "Neither function provides replay protection on its own… The callback that consumes the cleartexts must implement its own replay/state guard."

**ACL of FHE op results / who can compute:** to compute on ciphertexts the **contract** must have ACL permission on the input handles (not necessarily `msg.sender`). The result of an op (e.g. `FHE.add`) gives `address(this)` **ephemeral permission for the duration of the function, revoked when it exits**; nothing is persisted and `msg.sender` gets nothing automatically — you must call `FHE.allowThis(result)` / `FHE.allow(result, user)` explicitly to persist access. (?ask response grounded in https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md ; consistent with every example in the fetched pages, which call `FHE.allowThis` after each state update.)

**User decryption needs BOTH user and contract allowed** (acl_examples.md, verbatim): "If a ciphertext can be decrypted by a user, explicit access must be granted to them. Additionally, the user decryption mechanism requires the signature of a public key associated with the contract address. Therefore, a value that needs to be decrypted must be explicitly authorized for both the user and the contract."

**The canonical mistake / inference attack** (acl_examples.md): a `transfer(address to, euint64 encryptedAmount)` that does **not** call `FHE.isSenderAllowed(encryptedAmount)` lets an attacker pass the **victim's** balance handle as the amount and binary-search the victim's balance from whether transfers succeed. "Each successful or failed transfer leaks one bit about the victim's balance." Fix (verbatim):

```solidity
function transfer(address to, euint64 encryptedAmount) public {
  // Ensure the sender is authorized to access the encrypted amount
  require(FHE.isSenderAllowed(encryptedAmount), "Unauthorized access to encrypted amount.");

  // Proceed with further logic
  ...
}
```

Method-chaining sugar (acl_examples.md, verbatim): `using FHE for *;` then `ciphertext.allowThis().allow(address1);`, `ciphertext.allowTransient(address1).allow(address2);` etc.

### User-decryption delegation

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md (verbatim throughout)

"The ACL stores user decryption permissions as `(user, contractAddress)` pairs; delegation transfers the rights of `(delegator, contractAddress)` to `(delegate, contractAddress)`."

| Caller                             | API                                                           | Delegator (`msg.sender` to ACL) |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| **EOA** (Externally Owned Account) | `IACL.delegateForUserDecryption` directly on the ACL contract | the EOA itself                  |
| **Smart contract**                 | `FHE.delegateUserDecryption` from inside a contract function  | `address(this)`                 |

"`FHE.delegateUserDecryption` cannot be used by an EOA to delegate its own rights — the EOA must call the ACL directly."

Constraints (verbatim): "`msg.sender != contractAddress`", "`msg.sender != delegate`", "`delegate != contractAddress`", "Plus a one-delegate-or-revoke-per-block rule per `(delegator, delegate, contractAddress)` tuple." functions.md adds: `expirationDate > block.timestamp` (reverts with `IACL-ExpirationDateInThePast`); the others revert with `IACL-SenderCannotBeContractAddress`, `IACL-SenderCannotBeDelegate`, `IACL-DelegateCannotBeContractAddress`.

Common mistake (verbatim warning): "calling `FHE.delegateUserDecryption(relayer, address(this), expiration)` from inside a contract, hoping to delegate the caller user's rights. This always reverts because `msg.sender == contractAddress` violates one of the constraints… Use Pattern 1 instead — the user must call the ACL directly."

API summary (verbatim):

```solidity
// Granting (caller-contract side)
FHE.delegateUserDecryption(delegate, contractAddress, expirationDate);
FHE.delegateUserDecryptionWithoutExpiration(delegate, contractAddress);
FHE.delegateUserDecryptions(delegate, contractAddresses, expirationDate);            // batch
FHE.delegateUserDecryptionsWithoutExpiration(delegate, contractAddresses);           // batch

// Revoking
FHE.revokeUserDecryptionDelegation(delegate, contractAddress);
FHE.revokeUserDecryptionDelegations(delegate, contractAddresses);                    // batch

// Querying
FHE.isDelegatedForUserDecryption(delegator, delegate, contractAddress, handle);      // active for handle?
FHE.getDelegatedUserDecryptionExpirationDate(delegator, delegate, contractAddress);  // 0 = none, max = permanent
FHE.isUserDecryptable(handle, user, contractAddress);                                // raw ACL check, ignores delegation
```

EOA pattern (verbatim): `import { IACL } from "@fhevm/solidity/lib/Impl.sol"; IACL(aclAddress).delegateForUserDecryption(relayer, vault, expirationDate);`

### Reorg handling

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md

"ACL events are propagated from the FHEVM host chain to the Gateway immediately after being included in a block" — so a granted `FHE.allow` can leak data even if the granting block is later reorged out. "On Ethereum, a reorg can be up to 95 slots deep in the worst case, so waiting for more than 95 blocks should ensure that a previously sent transaction has been finalized." Recommended pattern for high-value secrets: two-step ACL authorization with a timelock — record `blockWhenBought = block.number` in the purchase tx, and only in a later tx: `require(block.number > blockWhenBought + 95, "Too early to request ACL, risk of reorg"); FHE.allow(privateKey, buyer);`. Hint (verbatim): "it should be used sparingly: only when leaked information could be critically important and high-value."

---

## 5. Encrypted inputs

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md

- Inputs are ciphertexts + "**Zero-Knowledge Proofs of Knowledge (ZKPoKs)** to ensure the validity of the encrypted data without revealing the plaintext" (prevents replay/misuse).
- "**Efficient packing**: All inputs for a transaction are packed into a single ciphertext in a user-defined order, optimizing the size and generation of the zero-knowledge proof."
- Function parameters (verbatim): "**`externalEbool`, `externalEaddress`,`externalEuintXX`**: Refers to the index of the encrypted parameter within the proof, representing a specific encrypted input handle. **`bytes`**: Contains the ciphertext and the associated zero-knowledge proof used for validation."

```solidity
function exampleFunction(
  externalEbool param1,
  externalEuint64 param2,
  externalEuint8 param3,
  bytes calldata inputProof
) public {
  // Function logic here
}
```

Client-side packing with index semantics (verbatim, Hardhat):

```typescript
import { fhevm } from "hardhat";

const input = fhevm.createEncryptedInput(contract.address, signers.alice.address);
input.addBool(canTransfer); // at index 0
input.add64(transferAmount); // at index 1
input.add8(transferType); // at index 2
const encryptedInput = await input.encrypt();

const externalEboolParam1 = encryptedInput.handles[0];
const externalEuint64Param2 = encryptedInput.handles[1];
const externalEuint8Param3 = encryptedInput.handles[2];
const inputProof = encryptedInput.inputProof;
```

(External handles are passed as `bytes32` in the ABI: the example calls `"exampleFunction(bytes32,bytes32,bytes32,bytes)"`.)

Input order (verbatim): "Developers are free to design the function parameters in any order. There is no required correspondence between the order in which encrypted inputs are constructed in TypeScript and the order of arguments in the Solidity function."

Verification in-contract: `FHE.fromExternal(externalT, inputProof)` → returns the usable encrypted type. (verbatim: "**Input verification**: The `FHE.fromExternal` function ensures that the input is a valid ciphertext with a corresponding ZKPoK. **Type conversion**: The function transforms `externalEbool`, `externalEaddress`, `externalEuintXX` into the appropriate encrypted type (`ebool`, `eaddress`, `euintXX`)".) Usage everywhere: `euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);`. Since FHEVM v0.12 (changelog): "`FHE.fromExternal` returns a trivial-encrypt of `0` for uninitialized handles instead of reverting."

**Packing limits:** not documented in the current docs (?ask confirmed). From ARCHIVED v0.10 coprocessor docs via ?ask: coprocessor default `maximum-handles-per-input` = **255** entries per input proof, and the ZK CRS `max-num-bits` is "usually **2048**" total provable bits per packed input. Label: archived-source; treat as practical defaults, verify at build time.

Note the input is bound to `(contractAddress, userAddress)` at encryption time (`createEncryptedInput(contract.address, signers.alice.address)`) — the proof cannot be replayed for another contract/user pair.

---

## 6. Handles

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/handles.md (captured fully — newer concept page)

"Every encrypted value in FHEVM (`euint8`, `ebool`, `eaddress`, …) is referenced on-chain by a 32-byte **handle**. FHE operations take and return handles, and the ACL is enforced per handle."

Glossary (verbatim):

| Term            | What it is                                                                                                                                                                                                         | Where it lives                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Plaintext**   | The actual cleartext value (e.g. the number `42`). What `decrypt(...)` returns.                                                                                                                                    | Off-chain, only after authorized decryption. |
| **Ciphertext**  | The encrypted blob produced by FHE — the bytes the coprocessor stores and computes on. May be re-randomized at any time without changing the plaintext.                                                            | Off-chain, with the coprocessor.             |
| **Handle**      | A 32-byte on-chain identifier that points to a specific (plaintext, ciphertext) pair. The handle is what your Solidity code holds and passes around.                                                               | On-chain.                                    |
| **Computation** | The sequence of FHE operations that produced a handle (e.g. `FHE.add(a, b)`). Two different computations may produce the same handle, or the same computation may produce different handles in different contexts. | Conceptual — not stored as such.             |

Core principle (verbatim warning): "Treat handles like a name tag, not like the thing itself. The bytes don't tell you anything about how the handle was made or what ciphertext is behind it. The only thing you can read off a handle is which plaintext it points to — and only after decryption."

The one rule (verbatim): "**If two handles are equal, they point to the same plaintext.**" Mirror: "if two plaintexts are different, their handles must be different too. Anything beyond that, you can't assume."

| You can rely on                          | You can't rely on                              |
| ---------------------------------------- | ---------------------------------------------- |
| Equal handles → equal plaintexts         | Different handles → different plaintexts       |
| Different plaintexts → different handles | Equal plaintexts → equal handles               |
|                                          | Equal handles → same computation produced both |
|                                          | Equal handles → same ciphertext underneath     |

Common mistakes (verbatim): "**Assuming "same operation, same inputs → same handle".** Today, the protocol mixes the previous block's hash into how each handle is built, so the same computation in two different blocks already gives you different handles."

```solidity
// ❌ Don't depend on h3 == h4. Don't depend on h3 != h4 either.
euint64 h3 = FHE.add(h1, h2);
euint64 h4 = FHE.add(h1, h2);
```

"**Mixing handles from different places.** A handle that was bridged from another chain, or built off-chain and brought in via `FHE.fromExternal(...)`, is not guaranteed to equal a handle produced by on-chain computation — even when both encode the same plaintext." For plaintext equality use the FHE operator: `ebool isEqual = FHE.eq(a, b);`

You **can** treat a handle like any other `bytes32` (compare `==`/`!=`, store, log) — the ACL itself does — but never infer provenance from the bytes.

---

## 7. Branching, loops, error handling

Sources: https://docs.zama.org/protocol/solidity-guides/smart-contract/logics.md , …/logics/conditions.md , …/logics/loop.md , …/logics/error_handling.md

"Since encrypted values cannot be directly evaluated at runtime, standard Solidity control flow (`if`, `else`, `for` with encrypted conditions) does not work with FHE ciphertexts." (logics.md)

**`FHE.select` idiom** (conditions.md, verbatim): `FHE.select(condition, valueIfTrue, valueIfFalse);` — condition is `ebool` from a comparison. Example (verbatim):

```solidity
function bid(externalEuint64 encryptedValue, bytes calldata inputProof) external onlyBeforeEnd {
  // Convert the encrypted input to an encrypted 64-bit integer
  euint64 bid = FHE.fromExternal(encryptedValue, inputProof);

  // Compare the current highest bid with the new bid
  ebool isAbove = FHE.lt(highestBid, bid);

  // Update the highest bid if the new bid is greater
  highestBid = FHE.select(isAbove, bid, highestBid);

  // Allow the contract to use the updated highest bid ciphertext
  FHE.allowThis(highestBid);
}
```

Key considerations (verbatim): "Each time `FHE.select` assigns a value, a new ciphertext is created, even if the underlying plaintext value remains unchanged." — and always re-`allowThis`/`allow` updated ciphertexts.

**Why encrypted conditions cannot revert** (error_handling.md, verbatim): "**No automatic reversion**: Transactions do not revert if a condition fails, making it challenging to notify users of issues like insufficient funds or invalid inputs." Both branches always execute; the un-taken branch is neutralized via `FHE.select` (e.g. add `FHE.select(canTransfer, amount, FHE.asEuint32(0))`).

**Branching to a public path requires async public decryption** (conditions.md, verbatim): "there are only one way to branch from an encrypted path to a non-encrypted path: it requires an off-chain public decryption. Hence, any contract logic that requires moving from an encrypted input to a non-encrypted path always requires an async contract logic." Pattern: `FHE.makePubliclyDecryptable(handle)` on-chain → off-chain `publicDecrypt` via Zama SDK → submit cleartexts + proof back → `FHE.checkSignatures(cts, cleartexts, decryptionProof)` on-chain (reverts if proof invalid / cleartext mismatch / wrong handle-cleartext pairing). Full worked example in conditions.md (`revealWinner`/`transferPrize`) and in transform_smart_contract_with_fhevm.md (`requestVoteDecryption`/`revealResults` with `handles[0] = FHE.toBytes32(encryptedYesVotes); … FHE.checkSignatures(handles, abi.encode(yesVotes, noVotes), decryptionProof);`).

**Loops** (loop.md): "it is not possible to break a loop based on an encrypted condition." Replace with a finite loop with a constant max iteration count + `FHE.select` inside (verbatim):

```solidity
euint8 maxValue = FHE.asEuint8(6); // Could be a value between 0 and 10
euint8 x = FHE.asEuint8(0);
// some code
for (uint32 i = 0; i < 10; i++) {
    euint8 toAdd = FHE.select(FHE.lt(x, maxValue), FHE.asEuint8(2), FHE.asEuint8(0));
    x = FHE.add(x, toAdd);
}
```

"**Avoid using encrypted indexes**" — selecting `encArray[i]` by an encrypted index requires looping over ALL indexes with `FHE.eq` + `FHE.select`; "this pattern is very expensive in gas and should be avoided whenever possible." Also "Obfuscate branching": for an AMM on two confidential tokens, transfer on BOTH tokens in and out every swap (one leg being an encrypted zero) so even the trade direction is hidden (full code in loop.md).

**Error-handling pattern — encrypted error codes / last-error idiom** (error_handling.md, verbatim):

```solidity
struct LastError {
  euint8 error;      // Encrypted error code
  uint timestamp;    // Timestamp of the error
}

// Define error codes
euint8 internal NO_ERROR;
euint8 internal NOT_ENOUGH_FUNDS;

constructor() {
  NO_ERROR = FHE.asEuint8(0);           // Code 0: No error
  NOT_ENOUGH_FUNDS = FHE.asEuint8(1);   // Code 1: Insufficient funds

  // Persist ACL permission so the contract can reuse these encrypted constants
  // in later transactions (e.g. inside FHE.select calls).
  FHE.allowThis(NO_ERROR);
  FHE.allowThis(NOT_ENOUGH_FUNDS);
}

// Store the last error for each address
mapping(address => LastError) private _lastErrors;

// Event to notify about an error state change
event ErrorChanged(address indexed user);

function setLastError(euint8 error, address addr) private {
  _lastErrors[addr] = LastError(error, block.timestamp);

  // Grant ACL permissions so the contract can read this handle later
  // and so the user can decrypt their own error off-chain.
  FHE.allowThis(error);
  FHE.allow(error, addr);

  emit ErrorChanged(addr);
}

function _transfer(address from, address to, euint32 amount) internal {
  // Check if the sender has enough balance to transfer
  ebool canTransfer = FHE.le(amount, balances[from]);

  // Log the error state: NO_ERROR or NOT_ENOUGH_FUNDS
  setLastError(FHE.select(canTransfer, NO_ERROR, NOT_ENOUGH_FUNDS), msg.sender);

  // Perform the transfer operation conditionally
  balances[to] = FHE.add(balances[to], FHE.select(canTransfer, amount, FHE.asEuint32(0)));
  FHE.allowThis(balances[to]);
  FHE.allow(balances[to], to);

  balances[from] = FHE.sub(balances[from], FHE.select(canTransfer, amount, FHE.asEuint32(0)));
  FHE.allowThis(balances[from]);
  FHE.allow(balances[from], from);
}
```

---

## 8. Casting & trivial encryption

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/casting.md and functions.md

Cast matrix (verbatim):

| From type | To type  | Function        |
| --------- | -------- | --------------- |
| `euintX`  | `euintX` | `FHE.asEuintXX` |
| `ebool`   | `euintX` | `FHE.asEuintXX` |
| `euintX`  | `ebool`  | `FHE.asEbool`   |

Overall summary (verbatim):

| Casting Type             | Function            | Input Type        | Output Type |
| ------------------------ | ------------------- | ----------------- | ----------- |
| Trivial encryption       | `FHE.asEuintXX(x)`  | `uintX`           | `euintX`    |
|                          | `FHE.asEbool(x)`    | `bool`            | `ebool`     |
|                          | `FHE.asEaddress(x)` | `address`         | `eaddress`  |
| Conversion between types | `FHE.asEuintXX(x)`  | `euintXX`/`ebool` | `euintYY`   |
|                          | `FHE.asEbool(x)`    | `euintXX`         | `ebool`     |

Rules (verbatim): "Casting from smaller types to larger types (e.g. `euint32` → `euint64`) preserves all information / Casting from larger types to smaller types (e.g. `euint64` → `euint32`) will truncate and lose information." functions.md: "When `X > Y`, the most significant bits are dropped. When `X < Y`, the ciphertext is padded to the left with trivial encryptions of `0`."

`asEuint` serves three purposes (functions.md, verbatim): "verify ciphertext bytes and return a valid handle to the calling smart contract; cast a `euintX` typed ciphertext to a `euintY` typed ciphertext, where `X != Y`; trivially encrypt a plaintext value."

**Trivial encryption caveat** (verbatim): "Although the data is in ciphertext format, it remains publicly visible on-chain" and (functions.md) "what we call a trivial encryption is **not** secure in any sense. When trivially encrypting a plaintext value, this value is still visible in the ciphertext bytes." Use it only for public constants entering FHE math (e.g. `FHE.asEuint64(0)` as the neutral select branch). Cost is tiny (trivialEncrypt = 32 HCU; cast = 32 HCU).

---

## 9. Random numbers

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md

```solidity
// Generate random encrypted numbers
ebool rb = FHE.randEbool();       // Random encrypted boolean
euint8 r8 = FHE.randEuint8();     // Random 8-bit number
euint16 r16 = FHE.randEuint16();  // Random 16-bit number
euint32 r32 = FHE.randEuint32();  // Random 32-bit number
euint64 r64 = FHE.randEuint64();  // Random 64-bit number
euint128 r128 = FHE.randEuint128(); // Random 128-bit number
euint256 r256 = FHE.randEuint256(); // Random 256-bit number
```

Bounded variant (verbatim): "To generate random numbers within a specific range, you can specify an **upper bound**. The specified upper bound must be a power of 2. The random number will be in the range `[0, upperBound - 1]`."

```solidity
euint8 r8 = FHE.randEuint8(32);      // Random number between 0-31
euint16 r16 = FHE.randEuint16(512);  // Random number between 0-511
euint32 r32 = FHE.randEuint32(65536); // Random number between 0-65535
```

Caveats (verbatim): "Random number generation must be performed during transactions, as it requires the pseudo-random number generator (PRNG) state to be mutated on-chain. Therefore, it cannot be executed using the `eth_call` RPC method." Values are CSPRNG-generated, encrypted, unpredictable; each call costs gas/HCU (randEuintX ≈ 19k–30k HCU, see section 3).

---

## 10. Configuration (Sepolia / ZamaConfig)

Sources: https://docs.zama.org/protocol/solidity-guides/smart-contract/configure.md , …/configure/contract_addresses.md , changelog, ?ask responses

- **Current config contract is `ZamaEthereumConfig`** (in `@fhevm/solidity/config/ZamaConfig.sol`). **`SepoliaConfig` was REMOVED in FHEVM v0.9** ("⚠️ Removal: The `SepoliaConfig` contract is now removed", min `@fhevm/solidity` v0.9.1 — ?ask response citing the migration guide). Old tutorials using `SepoliaConfig` are outdated.
- configure.md (verbatim): "The `ZamaConfig` library exposes functions to retrieve FHEVM configuration structs and contract addresses for supported networks: Ethereum mainnet, Sepolia testnet, and local Hardhat environments. Under the hood, this library encapsulates the network-specific addresses of Zama's FHEVM infrastructure into a single struct (`CoprocessorConfig`)."
- "The `ZamaEthereumConfig` contract is designed to be inherited by a user contract. The constructor automatically sets up the FHEVM coprocessor… When a contract inherits from `ZamaEthereumConfig`, the constructor calls `FHE.setCoprocessor` with the appropriate addresses." It "supplies the necessary contract addresses for Zama's FHEVM components (`ACL`, `FHEVMExecutor`, `KMSVerifier`)… The `InputVerifier` is not part of the inherited config — it is resolved at runtime via `FHEVMExecutor.getInputVerifierAddress()`."
- Address resolution is automatic (verbatim hint): "You do not need to configure these addresses manually. Inheriting from `ZamaEthereumConfig` automatically resolves the correct addresses based on the current `block.chainid`."

Canonical skeleton (verbatim, configure.md + ?ask):

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is ZamaEthereumConfig {
  constructor() {
    // Additional initialization logic if needed
  }
}
```

Manual config signature (functions.md, verbatim): `function setCoprocessor(CoprocessorConfig memory coprocessorConfig) internal` — "The `CoprocessorConfig` struct contains the addresses of the ACL, Coprocessor (FHEVMExecutor), and KMSVerifier contracts. In most cases, you do not need to call this directly — inherit from `ZamaEthereumConfig` instead."

Init check (verbatim): `function isInitialized(T v) internal pure returns (bool)` — e.g. `require(FHE.isInitialized(counter), "Counter not initialized!");`

### Contract addresses (verbatim tables)

**Ethereum mainnet**

| Contract/Service          | Address                                    |
| ------------------------- | ------------------------------------------ |
| ACL\_CONTRACT             | 0xcA2E8f1F656CD25C01F05d0b243Ab1ecd4a8ffb6 |
| FHEVM\_EXECUTOR\_CONTRACT | 0xD82385dADa1ae3E969447f20A3164F6213100e75 |
| KMS\_VERIFIER\_CONTRACT   | 0x77627828a55156b04Ac0DC0eb30467f1a552BB03 |

**Sepolia testnet**

| Contract/Service             | Address/Value                              |
| ---------------------------- | ------------------------------------------ |
| ACL\_CONTRACT                | 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D |
| FHEVM\_EXECUTOR\_CONTRACT    | 0x92C920834Ec8941d2C77D188936E1f7A6f49c127 |
| KMS\_VERIFIER\_CONTRACT      | 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A |
| HCU\_LIMIT\_CONTRACT         | 0xa10998783c8CF88D886Bc30307e631D6686F0A22 |
| INPUT\_VERIFIER\_CONTRACT    | 0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0 |
| DECRYPTION\_ADDRESS          | 0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478 |
| INPUT\_VERIFICATION\_ADDRESS | 0x483b9dE06E4E4C7D35CCf5837A1668487406D955 |
| RELAYER\_URL                 | `https://relayer.testnet.zama.org`         |
| GATEWAY\_CHAIN\_ID           | 10901                                      |

Tooling (setup.md): start from the **FHEVM Hardhat template** (github.com/zama-ai/fhevm-hardhat-template); Node.js even-numbered LTS required; set `MNEMONIC` and `INFURA_API_KEY` via `npx hardhat vars set …` for Sepolia deployment.

### End-to-end shape of an FHEVM contract (transform guide)

Source: https://docs.zama.org/protocol/solidity-guides/development-guide/transform_smart_contract_with_fhevm.md — full `EncryptedSimpleVoting is ZamaEthereumConfig` example showing the complete lifecycle: trivially-encrypt initial state in the constructor + `FHE.allowThis`; take `externalEbool + inputProof`; update state with `FHE.select`; re-`allowThis` after every update; reveal via `FHE.makePubliclyDecryptable` → off-chain `publicDecrypt` → `FHE.checkSignatures(handles, abi.encode(...), decryptionProof)` with handle order matching the off-chain call. Take-away (verbatim): "working with FHEVM often requires re-architecting the original logic to support privacy… the logic becomes asynchronous: results are hidden until they are explicitly marked as publicly decryptable, decrypted off-chain, and verified back on-chain."
