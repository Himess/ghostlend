# Decryption in Zama FHEVM — exhaustive reference (fetched 2026-07-03)

Everything below is copied or condensed from official Zama docs dumps in `zama-docs/_raw/decryption/` (see `_raw/decryption-manifest.md` for file↔URL map). Code blocks are **verbatim** from the docs unless marked otherwise. Items the docs do not state are marked **UNCERTAIN** or answered via `?ask=` responses (cited as "?ask response").

---

## 0. READ THIS FIRST — the decryption model changed (critical for our architecture)

**There is NO `FHE.requestDecryption` / Gateway-driven on-chain callback in the current FHEVM.** The old model (contract calls `requestDecryption(cts, selector)`, gets a `requestId`, and a Zama-operated oracle later calls your callback with cleartexts + signatures) is gone from ALL current and archived doc channels (current, v0.12, v0.11, v0.10 pages were all rewritten).

?ask response (against oracle.md, sources incl. the Zama Protocol Change Log):
> "`FHE.requestDecryption` (and `FHE.setDecryptionOracle`) do **not** remain as a supported 'on-chain oracle callback' API in current FHEVM. In **FHEVM v0.9**, they are explicitly **deprecated and must be removed** — contracts should migrate to the relayer-based public decryption flow instead. [...] The current public decryption docs describe handles/proofs and `FHE.checkSignatures`, but **do not document** any remaining **`DecryptionOracle` contract**, **request id**, or **automatic on-chain callback** mechanism in this flow."

The replacement is a **pull model**: the contract marks handles publicly decryptable; **any off-chain party** (your own bot, your frontend, anyone) calls the relayer's `publicDecrypt`, receives `(clearValues, abiEncodedClearValues, decryptionProof)`, and submits them in an ordinary transaction to a **contract function you define yourself** ("the callback" is now just your own permissionless finalize function) which verifies the proof with `FHE.checkSignatures`.

**Consequence for a lending protocol with epoch publishing / liquidation booleans:** you must run (or rely on anyone running) an off-chain finalizer that calls `publicDecrypt` and submits the results. The trust model is unchanged (KMS threshold signatures verified on-chain), but *liveness* of finalization is now on the dApp side, not on a Zama oracle. Design your finalize function to be permissionless, replay-guarded, and bound to stored handles.

Sources: https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md , ?ask q3 (`_raw/decryption/q3-requestdecryption.md`).

---

## 1. Architecture: who does what in a public decryption

From the protocol overview pages:

- **FHEVM Solidity library** (`@fhevm/solidity`) — encrypted types + `FHE.*` functions in your contract.
- **Host contracts** (on Sepolia/Ethereum) — ACL, FHEVMExecutor (Coprocessor), **KMSVerifier** (checks KMS signatures on-chain). Configured automatically by inheriting `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` (it calls `FHE.setCoprocessor(CoprocessorConfig)` with the ACL/Coprocessor/KMSVerifier addresses for the current chain id).
- **Coprocessors** — off-chain services that run the FHE computation and replicate ACL updates to the Gateway.
- **Gateway** — "a specialized blockchain component (implemented as an Arbitrum rollup)". For decryption: "1. The Gateway verifies ACL permissions. 2. It then triggers the KMS to decrypt (either publicly or privately). 3. Once the KMS returns signed results, the Gateway emits events that can be picked up by an oracle (for smart contract decryption) or returned to the user (for private decryption)." It keeps a synchronized copy of host-chain ACLs ("allow", "allowForDecryption").
- **KMS** — decentralized MPC network (currently **13 nodes**, threshold decryption "e.g., 9 out of 13", honest-majority ≤1/3 malicious, AWS Nitro Enclaves). "All decryption operation outputs are signed by each node and the output can be verified on-chain for full auditability."
- **Relayer** — "lightweight off-chain service that helps users interact with the Gateway by forwarding encryption or decryption requests." Untrusted; the SDK talks to it over HTTP.

Trust model: the relayer and any submitter are **untrusted** — they "can only delay a request, not falsify it" (v0.10 architecture page, still accurate in spirit). Authenticity comes from the **KMS threshold signatures** carried in the `decryptionProof` and verified on-chain by `FHE.checkSignatures` against the registered KMS signers in the KMSVerifier contract. The KMS never sees user plaintext for user decryption (re-encryption property; SDK security-model page), and for public decryption a quorum signs the plaintext result.

Sources: https://docs.zama.org/protocol/protocol/overview.md , .../overview/gateway.md , .../overview/kms.md , https://docs.zama.org/protocol/solidity-guides/v0.10/docs/protocol/architecture/relayer_oracle.md (ARCHIVED v0.10, for oracle/relayer roles), https://docs.zama.org/protocol/sdk/concepts/security-model.md

---

## 2. PUBLIC (async) decryption — the full current API

### 2.1 The three-step flow (verbatim summary from oracle.md)

1. **On-chain setup:** `FHE.makePubliclyDecryptable` — "sets the ciphertext handle's status as publicly decryptable, **globally and permanently** authorizing any entity to request its off-chain cleartext value."
2. **Off-chain decryption:** SDK `publicDecrypt` — "the off-chain client submits the ciphertext handle to the Zama Relayer's Key Management System (KMS)"; returns cleartext, its ABI encoding, and a Decryption Proof.
3. **On-chain verification:** `FHE.checkSignatures` — "reverts the transaction if the proof is invalid or does not match the cleartext/ciphertext pair." Then your business logic runs.

There is **no request id, no fee, no on-chain pending request object** in this model.

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md

### 2.2 `FHE.makePubliclyDecryptable` (the "request" side)

```solidity
function makePubliclyDecryptable(ebool value) internal;
function makePubliclyDecryptable(euint8 value) internal;
function makePubliclyDecryptable(euint16 value) internal;
...
function makePubliclyDecryptable(euint256 value) internal;
```
(oracle.md; functions.md generalizes: `function makePubliclyDecryptable(T value) internal returns (T)` "Supported for all encrypted types (T can be ebool, euintX, eaddress)." — note the two pages disagree on a return value; the examples never use one. No return value per oracle.md.)

- "Note the calling contract must have ACL permission to access the handle in the first place." (oracle.md)
- ?ask q6: the prerequisite is ACL access for the calling contract — "typically satisfied by granting the handle to the current contract (e.g. via `FHE.allowThis(handle)`)"; **no `FHE.allow` to any oracle address is needed**. (In practice the docs' own examples call `makePubliclyDecryptable` directly on freshly computed handles in the same tx — e.g. `FHE.randEbool()` result in HeadsOrTails — without a prior `allowThis`.)
- Check helper: `function isPubliclyDecryptable(T value) internal view returns (bool)` (functions.md).
- It is a **state-changing** call (cannot be in a `view` function) and is **irrevocable/permanent**.

Sources: oracle.md, functions.md ( https://docs.zama.org/protocol/solidity-guides/smart-contract/functions.md ), ?ask q6.

### 2.3 Off-chain `publicDecrypt` (SDK) — exact type, verbatim

```typescript
export type PublicDecryptResults = {
  clearValues: Record<`0x${string}`, bigint | boolean | `0x${string}`>;
  abiEncodedClearValues: `0x${string}`;
  decryptionProof: `0x${string}`;
};
export type FhevmInstance = {
  //...
  publicDecrypt: (handles: (string | Uint8Array)[]) => Promise<PublicDecryptResults>;
  //...
};
```

| Property | Type | On-chain usage |
| --- | --- | --- |
| `clearValues` | map handle → raw clear value (`bigint`/`boolean`/hex-address) | N/A |
| `abiEncodedClearValues` | hex bytes, "preserving the exact order of the input handles list" | `abiEncodedCleartexts` arg of `FHE.checkSignatures` |
| `decryptionProof` | hex bytes: "KMS cryptographic signatures and necessary metadata" | `decryptionProof` arg of `FHE.checkSignatures` |

Constraint on `handles`: "These handles must correspond to ciphertexts that have been marked as publicly decryptable on-chain."

⚠️ Docs inconsistency: the oracle.md tutorial snippet reads `results.values[efoo]`, but the declared type and both example test suites use `results.clearValues[...]`. **Use `clearValues`.**

Where `publicDecrypt` lives:
- **Hardhat tests:** `hre.fhevm.publicDecrypt([handleA, handleB])` (`@fhevm/hardhat-plugin`; works in mock mode and returns a proof `FHE.checkSignatures` accepts — see §6).
- **oracle.md tutorial (client):** `const instance: FhevmInstance = await createInstance(); const results = await instance.publicDecrypt([efoo, ebar]);` — the `FhevmInstance`/`createInstance` API is the **relayer-sdk-style low-level API** ("Off-chain SDK Function: `publicDecrypt` (see Zama SDK for exact naming)").
- **`@zama-fhe/react-sdk` v3:** `useDecryptPublicValues()` mutation — `const result = await decryptPublicValues.mutateAsync(["0xEncryptedValue..."]); // result.clearValues: { "0xEncryptedValue...": 1000n }` — "For values marked as publicly decryptable on-chain, no transport key pair or signature is needed." (sdk-encrypt-decrypt.md §4). Core-SDK naming per migration guide: `usePublicDecrypt` → `useDecryptPublicValues`; type `PublicDecryptResult` → `DecryptPublicValuesResult`; zamasdk.md contrasts `decryptValues` with "`decryptPublicValues` (gateway-level decryption that happens on-chain without user authentication)". **UNCERTAIN:** the exact core method path (`sdk.decryption.decryptPublicValues(...)`) is implied by these names but its reference page was not dumped.

Sources: oracle.md, heads-or-tails.md, highest-die-roll.md, https://docs.zama.org/protocol/sdk/guides/encrypt-decrypt.md , https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md , https://docs.zama.org/protocol/sdk/api-references/sdk/zamasdk.md

### 2.4 `FHE.checkSignatures` (the verification the "callback" must call) — exact signature

```solidity
function checkSignatures(bytes32[] memory handlesList, bytes memory abiEncodedCleartexts, bytes memory decryptionProof) internal
```

- `handlesList` — bytes32 handles being verified; "Must contain the exact same number of elements as the cleartext values in abiEncodedCleartexts." Build with `FHE.toBytes32(...)`:
  ```solidity
  function toBytes32(T value) internal pure returns (bytes32)
  ```
- `abiEncodedCleartexts` — "The ABI encoding of the decrypted cleartext values associated with the handles. (Use abi.encode to prepare this argument.) [...] Order is critical: The i-th value in this encoding must be the cleartext that corresponds to the i-th handle in handlesList. Types must match."
- `decryptionProof` — from `publicDecrypt`.
- Return: none — "simply reverts if the proof verification failed."

**Revert conditions** (functions.md): "Reverts if: The `decryptionProof` is empty or has invalid length; The number of valid signatures is below the KMS signers threshold; Any signature is from a non-registered KMS signer." On success "Emits a `PublicDecryptionVerified(handlesList, abiEncodedCleartexts)` event". The observed custom error in all negative tests is `error KMSInvalidSigner(address invalidSigner)` (heads-or-tails.md, highest-die-roll.md tests).

View variant:
```solidity
function isPublicDecryptionResultValid(
    bytes32[] memory handlesList,
    bytes memory abiEncodedCleartexts,
    bytes memory decryptionProof
) internal view returns (bool)
```
"Prefer `checkSignatures` [...] optimized for gas via signature caching, emits a `PublicDecryptionVerified` event [...]. **Neither function provides replay protection on its own** [...] The callback that consumes the cleartexts must implement its own replay/state guard."

**Anti-spoofing / who may call** (?ask q2, verbatim): "**any address** can submit the cleartext and the KMS decryption proof [...] an attacker can't 'invent' cleartext values — **they need a proof that verifies for those exact handles + cleartext bytes**, or the call reverts. One caveat: `checkSignatures` **does not provide replay protection by itself**; the consuming contract should add its own 'finalize once' / state guard." The cross-game forgery test (using game 2's proof against game 1's handles) also reverts with `KMSInvalidSigner` — the proof is bound to the handles, so results cannot be transplanted between requests.

Sources: oracle.md, functions.md, ?ask q2, heads-or-tails.md/highest-die-roll.md tests.

### 2.5 Canonical tutorial contract (multi-value, ordering) — VERBATIM from oracle.md

(Note: this doc sample has two missing semicolons after the `require(...)` lines — compile-check before reuse. It is the pattern reference; the fully compiling examples are in §2.6/§2.7.)

```solidity
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract FooBarContract is ZamaEthereumConfig {
  ebool _encryptedFoo;
  euint8 _encryptedBar;
  bool _clearFoo;
  uint8 _clearBar;
  bool _isFinalized;

  event ClearFooBarRequested(ebool encryptedFoo, euint8 encryptedBar);

  constructor() {}

  function _isFooBarConfidentialLogicExecuted() private returns (bool) {
    return FHE.isInitialized(_encryptedFoo) && FHE.isInitialized(_encryptedBar);
  }

  modifier whenConfidentialLogicExecuted() {
    require(_isFooBarConfidentialLogicExecuted(), "foo confidential logic not yet executed!")
    _;
  }

  function runFooBarConfidentialLogic() external {
    require(!_isFooBarConfidentialLogicExecuted(), "foobar confidential logic already executed!")
    _encryptedFoo = FHE.randEbool();
    _encryptedBar = FHE.randEuint8();
  }

  function getEncryptedFoo() public whenConfidentialLogicExecuted returns (ebool) {
    return _encryptedFoo;
  }

  function getEncryptedBar() public whenConfidentialLogicExecuted returns (euint8) {
    return _encryptedBar;
  }

  function requestClearFooBar() external whenConfidentialLogicExecuted {
    FHE.makePubliclyDecryptable(_encryptedFoo);
    FHE.makePubliclyDecryptable(_encryptedBar);

    emit ClearFooBarRequested(_encryptedFoo, _encryptedBar);
  }

  function finalizeClearFooBar(bool clearFoo, uint8 clearBar, bytes memory publicDecryptionProof) external whenConfidentialLogicExecuted {
    require(!_isFinalized, "foo is already revealed");

    // ⚠️ Crucial Ordering Constraint
    // ==============================
    // The decryption proof is cryptographically bound to the specific ORDER of handles.
    // A proof computed for `[efoo, ebar]` will be different
    // from a proof computed for `[ebar, efoo]`.
    //
    // Here we expect a proof computed for `[efoo, ebar]`
    //
    bytes32[] memory ciphertextEfooEbar = new bytes32[](2);
    ciphertextEfooEbar[0] = FHE.toBytes32(_encryptedFoo);
    ciphertextEfooEbar[1] = FHE.toBytes32(_encryptedBar);

    // ⚠️ Once again, the order is critical to compute the ABI encoded array of clear values
    // The order must match the order in ciphertextEfooEbar: (efoo, ebar)
    bytes memory abiClearFooClearBar = abi.encode(clearFoo, clearBar);
    FHE.checkSignatures(ciphertextEfooEbar, abiClearFooClearBar, publicDecryptionProof);

    _isFinalized = true;

    _runFooBarClearBusinessLogicFinalization();
  }

  function _runFooBarClearBusinessLogicFinalization() private {
    // Business logic starts here.
    // Transfer ERC20, reveal price or winner etc.
  }
}
```

Client side (verbatim, oracle.md):

```typescript
const tx = await contract.requestClearFooBar();
const txReceipt = await tx.wait();
const { efoo, ebar } = parseClearFooBarRequestedEvent(contract, txReceipt);
```
```typescript
const instance: FhevmInstance = await createInstance();
const results: PublicDecryptResults = await instance.publicDecrypt([efoo, ebar]);
const clearFoo = results.values[efoo];
const clearBar = results.values[ebar];
// Warning! The decryption proof is computed for [efoo, ebar], NOT [ebar, efoo]!
const decryptionProof: `0x${string}` = results.decryptionProof;
```
(`results.values` here is the tutorial's typo — real property is `clearValues`.)
```typescript
const tx = await contract.finalizeClearFooBar(clearFoo, clearBar, results.decryptionProof);
const txReceipt = await tx.wait();
```

Source: https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md

### 2.6 Complete working example, single value — HeadsOrTails VERBATIM

Contract (`contracts/HeadsOrTails.sol`):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract HeadsOrTails is ZamaEthereumConfig {
    constructor() {}

    uint256 private counter = 0;

    struct Game {
        address headsPlayer;
        address tailsPlayer;
        ebool encryptedHasHeadsWon;
        address winner;
    }

    mapping(uint256 gameId => Game game) public games;

    event GameCreated(
        uint256 indexed gameId,
        address indexed headsPlayer,
        address indexed tailsPlayer,
        ebool encryptedHasHeadsWon
    );

    function headsOrTails(address headsPlayer, address tailsPlayer) external {
        require(headsPlayer != address(0), "Heads player is address zero");
        require(tailsPlayer != address(0), "Tails player is address zero");
        require(headsPlayer != tailsPlayer, "Heads player and Tails player should be different");

        // true: Heads
        // false: Tails
        ebool headsOrTailsResult = FHE.randEbool();

        counter++;

        // gameId > 0
        uint256 gameId = counter;
        games[gameId] = Game({
            headsPlayer: headsPlayer,
            tailsPlayer: tailsPlayer,
            encryptedHasHeadsWon: headsOrTailsResult,
            winner: address(0)
        });

        // We make the result publicly decryptable.
        FHE.makePubliclyDecryptable(headsOrTailsResult);

        emit GameCreated(gameId, headsPlayer, tailsPlayer, games[gameId].encryptedHasHeadsWon);
    }

    function getGamesCount() public view returns (uint256) {
        return counter;
    }

    function hasHeadsWon(uint256 gameId) public view returns (ebool) {
        return games[gameId].encryptedHasHeadsWon;
    }

    function getWinner(uint256 gameId) public view returns (address) {
        require(games[gameId].winner != address(0), "Game winner not yet revealed");
        return games[gameId].winner;
    }

    function recordAndVerifyWinner(
        uint256 gameId,
        bytes memory abiEncodedClearGameResult,
        bytes memory decryptionProof
    ) public {
        require(games[gameId].winner == address(0), "Game winner already revealed");

        // 1. FHE Verification: Build the list of ciphertexts (handles) and verify the proof.
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(games[gameId].encryptedHasHeadsWon);

        // This FHE call reverts the transaction if the decryption proof is invalid.
        FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

        // 2. Decode the clear result and determine the winner's address.
        bool decodedClearGameResult = abi.decode(abiEncodedClearGameResult, (bool));
        address winner = decodedClearGameResult ? games[gameId].headsPlayer : games[gameId].tailsPlayer;

        // 3. Store the winner
        games[gameId].winner = winner;
    }
}
```
(Comments abbreviated from the doc only where they were pure natspec prose; all code lines verbatim.)

Test essentials (`test/HeadsOrTails.ts`, verbatim core):

```ts
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

// before(): if (!hre.fhevm.isMock) { throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`); }

const tx = await contract.connect(signers.owner).headsOrTails(playerA, playerB);
const gameCreatedEvent = parseGameCreatedEvent(await tx.wait());
const gameId = gameCreatedEvent.gameId;
const encryptedBool: string = gameCreatedEvent.encryptedHasHeadsWon;

// Call the Zama Relayer to compute the decryption
const publicDecryptResults = await fhevm.publicDecrypt([encryptedBool]);

// - the ORDERED clear values / their ABI-encoded form / the KMS decryption proof
const abiEncodedClearGameResult = publicDecryptResults.abiEncodedClearValues;
const decryptionProof = publicDecryptResults.decryptionProof;

await contract.recordAndVerifyWinner(gameId, abiEncodedClearGameResult, decryptionProof);
const winner = await contract.getWinner(gameId);
```

Negative tests (verbatim expectations):
```ts
// corrupted proof:
await expect(contract.recordAndVerifyWinner(gameId, abiEncodedClearValues, decryptionProof + "dead"))
  .to.be.revertedWithCustomError({ interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) }, "KMSInvalidSigner");
// forged cleartext (flipped bool, valid proof): KMSInvalidSigner
// proof of game 2 used against game 1's handle: KMSInvalidSigner
```

Source: https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md

### 2.7 Multiple values + cleartext decoding — HighestDieRoll (key verbatim parts)

Contract core (two `euint8` handles, fixed order A then B):

```solidity
FHE.makePubliclyDecryptable(playerAEncryptedDieRoll);
FHE.makePubliclyDecryptable(playerBEncryptedDieRoll);
...
bytes32[] memory cts = new bytes32[](2);
cts[0] = FHE.toBytes32(games[gameId].playerAEncryptedDieRoll);
cts[1] = FHE.toBytes32(games[gameId].playerBEncryptedDieRoll);

FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

(uint8 decodedClearPlayerADieRoll, uint8 decodedClearPlayerBDieRoll) = abi.decode(
    abiEncodedClearGameResult,
    (uint8, uint8)
);
```

Test (verbatim, incl. how `abiEncodedClearValues` is actually encoded):

```ts
import type { ClearValueType } from "@zama-fhe/relayer-sdk/node";
...
const publicDecryptResults = await fhevm.publicDecrypt([playerADiceRoll, playerBDiceRoll]);
const clearValueA: ClearValueType = publicDecryptResults.clearValues[playerADiceRoll];
const clearValueB: ClearValueType = publicDecryptResults.clearValues[playerBDiceRoll];
expect(typeof clearValueA).to.eq("bigint");
expect(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [clearValueA, clearValueB])).to.eq(
  publicDecryptResults.abiEncodedClearValues,
);
// wrong order (B,A) instead of (A,B) → reverts KMSInvalidSigner
```

**Cleartext encoding rule (from this evidence):** each clear value occupies one 32-byte ABI word in handle order; the SDK's encoding for two euint8 values equals `encode(["uint256","uint256"], ...)`, and the contract may decode with the narrower matching types (`(uint8, uint8)`) or re-encode with `abi.encode(bool, uint8, ...)` (FooBar) — identical bytes because static ABI types are 32-byte padded. `ebool` → `bool` (decoded via `abi.decode(..., (bool))` in HeadsOrTails); `eaddress` → hex address string off-chain. When your finalize function takes raw typed args (e.g. `bool clearFoo, uint8 clearBar`) it must `abi.encode` them **in handle order with matching widths** before `checkSignatures`.

Source: https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md

### 2.8 Latency, limits, retries, failure modes

- **Latency (Sepolia): NOT documented.** ?ask q1: "I cannot find any docs value for the typical latency of `publicDecrypt` on Sepolia [...] the only reliable way [...] is to measure it". ?ask q8 (gateway page): no latency figures or block-count expectations anywhere; time is spent in Gateway ACL verification + KMS threshold MPC (e.g. 9-of-13). The only number in any dump: check-balances.md calls user-decryption "the 2-5 second FHE decryption" (that's userDecrypt, but it's the same relayer+KMS round-trip class). **Plan for seconds-to-minutes and measure empirically; there is no SLA.**
- **Max handles per request: NOT documented.** ?ask q4: "I cannot find any documented maximum number of ciphertext handles you can pass to a single SDK `publicDecrypt(handles)` call."
- **Rate limits:** relayer may return HTTP 429 → SDK v3 `RelayerRequestFailedError` with `.retryable === true` and `.retryAfter` (seconds, from `Retry-After`; may be missing in browsers due to CORS — implement your own backoff). (?ask q4; sdk-api-errors.md: `RELAYER_REQUEST_FAILED`.)
- **Unfulfilled/failed decryption:** nothing is pending on-chain, nothing expires, nothing to refund. ?ask q5: "`FHE.makePubliclyDecryptable` marks the ciphertext handle as publicly decryptable **globally and permanently** [...] the same handle can be requested and decrypted again later [...] No [expiry] [...] I cannot find information about any on-chain retry or refund mechanism" — just retry `publicDecrypt` and only flip your `finalized` flag after `checkSignatures` succeeds.
- **KMS/relayer downtime:** "The KMS must be available for decryption to work. If the relayer is down, users cannot read their balances [...] on-chain encrypted data remains safe [...] unreadable until the relayer returns." (sdk-security-model.md)

Sources: ?ask q1/q4/q5/q8, https://docs.zama.org/protocol/sdk/guides/check-balances.md , https://docs.zama.org/protocol/sdk/api-references/sdk/errors.md , https://docs.zama.org/protocol/sdk/concepts/security-model.md

---

## 3. On-chain vs off-chain public decryption

- **Off-chain only (display/index):** call `publicDecrypt` and use `clearValues` directly — no transaction needed. React v3: `useDecryptPublicValues()` (mutation, no permit/signature required — sdk-encrypt-decrypt.md §4, verbatim example in §2.3 above). Node/glossary name: `decryptPublicValues`. Legacy relayer-sdk equivalent (ARCHIVED v0.10, verbatim shape): `const values = instance.publicDecrypt(handles);` returning a plain `{handle: clearValue}` map, e.g. `true`, `242n`, `'0xfC43...95a8'`.
- **On-chain consumption (state change / "callback"):** same `publicDecrypt`, then submit `abiEncodedClearValues` + `decryptionProof` to your permissionless finalize function which calls `FHE.checkSignatures` (§2.4-2.7). This is the ONLY way a contract can consume a decrypted value in the current protocol.

Sources: sdk-encrypt-decrypt.md, https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/public-decryption.md (ARCHIVED v0.10), oracle.md.

---

## 4. USER decryption (private display, EIP-712)

### 4.1 On-chain ACL prerequisites (Solidity)

Both the **user** and the **owning contract** need persistent ACL permission:

```solidity
FHE.allowThis(_trivialEuint32);
FHE.allow(_trivialEuint32, msg.sender);
```
"Note: If you forget to call `FHE.allowThis(...)`, the user will NOT be able to user decrypt the value! Both the contract and the caller must have FHE permissions for user decryption to succeed." Failure message observed in tests: `dapp contract (.+) is not authorized to user decrypt handle (.+).`
Check helper: `FHE.isUserDecryptable(bytes32 handle, address user, address contractAddress) internal view returns (bool)` — "true only if both the user and the contract have persistent ACL permission on the handle." Expose the handle via a `view` function (e.g. `function encryptedUint32() public view returns (euint32)` / `confidentialBalanceOf`).

Sources: https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md , functions.md.

### 4.2 Current SDK v3 (`@zama-fhe/sdk` / `@zama-fhe/react-sdk`) — permit model

A decrypt needs (a) a **transport key pair** (ML-KEM; generated once per signer, stored plaintext in IndexedDB/memory/AsyncLocalStorage; TTL `transportKeyPairTTL`, default 2592000 s = 30 days) and (b) a **permit**: "an EIP-712 typed data signature from the user's wallet" binding: contract addresses (**up to 10 per permit**, chunked), chain ID, start timestamp + duration (`permitTTL`, default 30 days), signer address, optional delegator. "The relayer verifies this signature before re-encrypting any ciphertext." Permits are immutable, chain-scoped, **additive** (new contracts sign incremental permits only), pruned on expiry; wallet disconnect/account-switch clears them (chain switch keeps them).

Core API (verbatim signatures from zamasdk.md):
```ts
sdk.permits.grantPermit(contractAddresses: Address[]) => Promise<void>
sdk.permits.hasPermit(contractAddresses: Address[]) => Promise<boolean>
sdk.permits.revokePermits(contracts?: Address[]) => Promise<void>
sdk.permits.clear() => Promise<void>            // full logout: wipes transport key pair + all permits
sdk.decryption.decryptValues(inputs: DecryptInput[]) => Promise<Record<EncryptedValue, ClearValue>>
```
```ts
const values = await sdk.decryption.decryptValues([
  { encryptedValue: balance, contractAddress: cUSDT },
  { encryptedValue: flag, contractAddress: myContract },
]);
console.log(values[balance]); // 1000n
```
Behavior: cached results returned without relayer calls; inputs grouped by `contractAddress`, one relayer call per contract (up to 5 concurrent); zero handles (32 zero bytes) resolve to `0n` locally; permits signed on demand (first decrypt prompts the wallet) or pre-signed via `grantPermit`. Lifecycle events `DecryptStart`/`DecryptEnd`/`DecryptError` via `onEvent`. Cache cleared on `revokePermits()`, `clear()`, disconnect/account/chain change.

React hooks (verbatim usage):
```tsx
import { useGrantPermit, useHasPermit, useDecryptValues } from "@zama-fhe/react-sdk";

const { mutate: grantPermit, isPending: isGranting } = useGrantPermit();
const { data: hasPermit } = useHasPermit({ contractAddresses: [CONTRACT] });
const { data, isPending } = useDecryptValues(
  [{ encryptedValue, contractAddress: CONTRACT }],
  { enabled: !!hasPermit }, // gate: only decrypt once authorized
);
// data: Record<EncryptedValue, ClearValue>  e.g. { "0xvalue1...": 500n }
```
`useDecryptValues` is **disabled by default**; it does NOT gate on permits itself — always gate with `useHasPermit` to avoid unsolicited wallet popups (docs mark ungated use as **danger**: "unexpected MetaMask popup, user rejection, potential Blockaid flags"). `useGrantPermit` mutation variable: `Address[]`. Balances: `useConfidentialBalance({ address, account })` / `token.balanceOf(owner)`; distinguish `NoCiphertextError` (never shielded) from `0n`.
Decrypt-relevant errors (sdk-api-errors.md): `DecryptionFailedError` (`DECRYPTION_FAILED`), `InvalidTransportKeyPairError` (`INVALID_KEYPAIR`), `TransportKeyPairExpiredError` (`KEYPAIR_EXPIRED`), `SigningRejectedError`, `RelayerRequestFailedError`, `BalanceCheckUnavailableError`, `NoCiphertextError`.

Frontend requirements: COOP/COEP headers for multithreaded WASM (falls back to single-threaded without), client components only (no SSR), CSP `worker-src blob:`, `script-src 'wasm-unsafe-eval'`, `connect-src https://cdn.zama.org`; WASM SHA-384 integrity check on by default.

Sources: https://docs.zama.org/protocol/sdk/concepts/permit-model.md , .../api-references/sdk/zamasdk.md , .../api-references/react/usedecryptvalues.md , .../api-references/react/usegrantpermit.md , .../guides/encrypt-decrypt.md , .../guides/check-balances.md , .../api-references/sdk/errors.md , .../concepts/security-model.md

### 4.3 LEGACY relayer-sdk user decryption (labeled legacy; still the shape used by the Hardhat plugin)

ARCHIVED v0.10 flow (`@zama-fhe/relayer-sdk`), verbatim:

```ts
const keypair = instance.generateKeypair();
const handleContractPairs = [
  {
    handle: ciphertextHandle,
    contractAddress: contractAddress,
  },
];
const startTimeStamp = Math.floor(Date.now() / 1000).toString();
const durationDays = "10"; // String for consistency
const contractAddresses = [contractAddress];

const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

const signature = await signer.signTypedData(
  eip712.domain,
  {
    UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
  },
  eip712.message,
);

const result = await instance.userDecrypt(
  handleContractPairs,
  keypair.privateKey,
  keypair.publicKey,
  signature.replace("0x", ""),
  contractAddresses,
  signer.address,
  startTimeStamp,
  durationDays,
);

const decryptedValue = result[ciphertextHandle];
```
EIP-712 primary type: `UserDecryptRequestVerification`; validity window = start timestamp + duration in days. The CURRENT example test `UserDecryptMultipleValues.ts` uses the same 8-argument shape via the Hardhat plugin (`fhevm.generateKeypair()`, `fhevm.createEIP712(publicKey, [contractAddress], startTimestamp, durationDays)`, `fhevm.userDecrypt([...{handle, contractAddress}], privateKey, publicKey, signature, [contractAddress], userAddress, startTimestamp, durationDays)` → `DecryptedResults` imported from `@zama-fhe/relayer-sdk`).

Sources: https://docs.zama.org/protocol/solidity-guides/v0.10/docs/sdk-guides/user-decryption.md (ARCHIVED v0.10), https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md (current)

### 4.4 Delegated decryption (grant / revoke / read-as-delegate)

**Solidity side** (functions.md + acl-delegation.md; delegation transfers `(delegator, contractAddress)` user-decrypt rights to `(delegate, contractAddress)`):
```solidity
FHE.delegateUserDecryption(delegate, contractAddress, expirationDate);
FHE.delegateUserDecryptionWithoutExpiration(delegate, contractAddress);
FHE.delegateUserDecryptions(delegate, contractAddresses, expirationDate);            // batch
FHE.revokeUserDecryptionDelegation(delegate, contractAddress);
FHE.isDelegatedForUserDecryption(delegator, delegate, contractAddress, handle);
FHE.getDelegatedUserDecryptionExpirationDate(delegator, delegate, contractAddress);  // 0 = none, max = permanent
```
When called from a contract, **the contract is the delegator**; an **EOA must call the ACL directly**: `IACL(aclAddress).delegateForUserDecryption(relayer, vault, expirationDate);` (`IACL` from `@fhevm/solidity/lib/Impl.sol`). ACL invariants (revert otherwise): `contractAddress != address(this)`, `delegate != address(this)`, `delegate != contractAddress`, `expirationDate > block.timestamp`, and at most one delegate-or-revoke per block per `(delegator, delegate, contractAddress)` tuple.

**SDK v3 side:**
```ts
await sdk.delegations.delegateDecryption({ contractAddress, delegateAddress, expirationDate? }); // → { txHash, receipt }
await sdk.delegations.revokeDelegation({ contractAddress, delegateAddress });
await sdk.delegations.isActive({ contractAddress, delegatorAddress, delegateAddress });
await sdk.delegations.getExpiry({ contractAddress, delegatorAddress, delegateAddress });
await sdk.permits.grantDelegationPermit(delegator, [cUSDT]);   // delegate's own EIP-712 permit
await sdk.permits.hasDelegationPermit(delegator, [cUSDT]);
const balance = await token.decryptBalanceAs({ delegatorAddress, accountAddress? });
// alpha guide: sdk.decryption.delegatedDecryptValues(inputs, delegatorAddress)  [ALPHA]
```
Constraints: expiration must be ≥1 h in the future (`DelegationExpirationTooSoonError`); after the L1 tx, **wait 1-2 minutes** for the Gateway (Arbitrum) to sync ACL state or get `DelegationNotPropagatedError`; missing/revoked delegation → `DelegationNotActiveError`; expired → `DelegationExpiredError`. React hooks: `useDelegateDecryption`, `useRevokeDelegation`, `useDelegationStatus`, `useDecryptBalanceAs`, `useBatchDecryptBalancesAs`, `useDelegatedDecryptValues`.

Sources: functions.md, https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/delegation.md , https://docs.zama.org/protocol/sdk/guides/delegated-decryption.md , sdk-api-errors.md, sdk-alpha-decrypt-event-logs.md (ALPHA), sdk-migrate-v2-v3.md

---

## 5. Migration table (old → current)

### 5.1 Solidity (FHEVM library)
| Old (≤ FHEVM v0.8 era) | Current | Evidence |
| --- | --- | --- |
| `FHE.requestDecryption(cts, selector)` + `requestId` + oracle-invoked callback | **REMOVED** — `FHE.makePubliclyDecryptable(handle)` + off-chain `publicDecrypt` + self-defined finalize fn calling `FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof)` | ?ask q3 citing Zama Protocol Change Log: deprecated in FHEVM v0.9, "must be removed" |
| `FHE.setDecryptionOracle(addr)` | **REMOVED** (no DecryptionOracle contract in current flow) | ?ask q3 |
| callback signature-check `FHE.checkSignatures(requestId, ...)` (old form) | `FHE.checkSignatures(bytes32[] handlesList, bytes abiEncodedCleartexts, bytes decryptionProof)` — **UNCERTAIN:** old exact signature no longer documented anywhere | current: oracle.md/functions.md |
| `Gateway.requestDecryption` / `GatewayCaller` (even older era) | same replacement as above — **UNCERTAIN:** not documented in any fetched channel | — |
| `SepoliaConfig` base contract (older tutorials) | `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol` (auto-config per chain id) — **UNCERTAIN** on the old name; every current example uses `ZamaEthereumConfig` | all current examples |
| `allowForDecryption` (protocol/Gateway ACL term) | Solidity-level `makePubliclyDecryptable` (Gateway page still uses the term `allowForDecryption` for the ACL category) | gateway.md |

### 5.2 Frontend SDK packages
| Legacy `@zama-fhe/relayer-sdk` (low-level; `createInstance`/`initSDK`) | Current `@zama-fhe/sdk` v3 + `@zama-fhe/react-sdk` v3 (high-level) |
| --- | --- |
| `instance.publicDecrypt(handles)` → `PublicDecryptResults` | React `useDecryptPublicValues().mutateAsync(handles)` → `.clearValues`; core `decryptPublicValues` / `DecryptPublicValuesResult`; Hardhat `hre.fhevm.publicDecrypt` |
| `instance.generateKeypair()` + `instance.createEIP712(...)` + `instance.userDecrypt(8 args)` | `sdk.decryption.decryptValues([{encryptedValue, contractAddress}])` — keypair/EIP-712/permits fully managed by SDK |
NOTE: docs warn AI agents "routinely confuse `@zama-fhe/sdk` (this high-level SDK) with the legacy low-level `@zama-fhe/relayer-sdk`" (sdk-migrate-v2-v3.md). The Hardhat plugin still re-exports relayer-sdk types (`ClearValueType`, `DecryptedResults`).

### 5.3 `@zama-fhe/sdk` v2 → v3 decryption-related renames (verbatim from migration guide)
| 2.x | 3.x |
| --- | --- |
| `useUserDecrypt({ handles })` | `useDecryptValues(inputs)` (positional `{encryptedValue, contractAddress}[]`, `{enabled}` opt) |
| `usePublicDecrypt` | `useDecryptPublicValues` |
| `useAllow` / `useIsAllowed` | `useGrantPermit` / `useHasPermit` |
| `useGenerateKeypair`, `useCreateEIP712`, `useCreateDelegatedUserDecryptEIP712` | **removed** — SDK manages permits |
| `useDelegatedUserDecrypt` | `useDelegatedDecryptValues` |
| `useRevoke` / `useRevokeSession` | `useRevokePermits` / `useClearCredentials` |
| `usePublicKey`, `usePublicParams`, `useRequestZKProofVerification` | **removed** |
| `decryption.userDecrypt` → (briefly `decryptValuesFromPairs`) | `decryption.decryptValues` |
| `Handle` / `ClearValueType` | `EncryptedValue` / `ClearValue` |
| `ZERO_HANDLE` / `isZeroHandle()` | `ZERO_ENCRYPTED_VALUE` / `isEncryptedValueZero()` |
| `UserDecryptParams` / `PublicDecryptResult` / `DelegatedUserDecryptParams` / `DecryptHandle` | `DecryptValuesParams` / `DecryptPublicValuesResult` / `DelegatedDecryptValuesParams` / `DecryptInput` |
| `applyDecryptedValues`, `DecryptCache` | **removed** — internal cache, auto-invalidation |
| `KeypairType`/`Keypair`; `generateKeypair()`/`warmKeypair()`; `keypairTTL` | `TransportKeyPair`; `generateTransportKeyPair()`/`warmTransportKeyPair()`; `transportKeyPairTTL` |
| `KeypairExpiredError` / `InvalidKeypairError` | `TransportKeyPairExpiredError` / `InvalidTransportKeyPairError` (string codes `KEYPAIR_EXPIRED`/`INVALID_KEYPAIR` unchanged) |
| `CredentialsManager` / `DelegatedCredentialsManager` | `Permits` / `Delegations` / `Decryption` namespaces |
| `token.delegateDecryption({delegateAddress})` etc. | `sdk.delegations.delegateDecryption({contractAddress, delegateAddress})` etc.; `token.decryptBalanceAs` unchanged |
| `SepoliaConfig`/`MainnetConfig`/`HardhatConfig` from `@zama-fhe/sdk`; `.chainId` | `sepolia`/`mainnet`/`hardhat` from `@zama-fhe/sdk/chains`; `.id`; config via `createConfig({chains, ...client, relayers, storage})` |
| `new RelayerWeb/RelayerNode(...)` | `web()` from `@zama-fhe/sdk/web` / `node()` from `@zama-fhe/sdk/node` / `cleartext()` (new; local dev without KMS/gateway) |

Source: https://docs.zama.org/protocol/sdk/migration/migrate-v2-to-v3.md

---

## 6. Testing decryption in Hardhat (mock mode)

- Enable with `import "@fhevm/hardhat-plugin";` in `hardhat.config.ts`; API at `hre.fhevm` (or `import { fhevm } from "hardhat"`). Guard: `hre.fhevm.isMock` — example suites `throw` when not mock ("This hardhat test suite cannot run on Sepolia Testnet").
- **Public decryption:** `await fhevm.publicDecrypt([handle, ...])` returns `{clearValues, abiEncodedClearValues, decryptionProof}` and — confirmed by ?ask q7 and the HeadsOrTails/HighestDieRoll suites — **the mock proof is accepted by `FHE.checkSignatures` on-chain in the mock env**, and corrupted/forged/reordered submissions revert with `KMSInvalidSigner`. So the full 3-step flow is testable end-to-end locally. **No `awaitDecryptionOracle` helper exists** (?ask q7: "I cannot find any `awaitDecryptionOracle` helper mentioned in the docs.").
- **User decryption:** typed helpers `fhevm.userDecryptEuint(FhevmType.euintXX, handle, contractAddress, signer)`, `fhevm.userDecryptEbool(...)`, `fhevm.userDecryptEaddress(...)`; low-level 8-arg `fhevm.userDecrypt(...)` with `fhevm.generateKeypair()` + `fhevm.createEIP712(...)` (§4.3). Missing ACL → rejection `dapp contract ... is not authorized to user decrypt handle ...`.
- Full detail lives at https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat/write_test.md (dumped: `hardhat-write-test.md`); Foundry equivalent exists (`development-guide/foundry/write_test.md`, not dumped).
- SDK-side local dev without KMS/gateway: `cleartext()` relayer for Hardhat chains (sdk-migrate-v2-v3.md; guide: sdk/guides/local-development.md, not dumped).

Sources: hardhat-write-test.md, heads-or-tails.md, highest-die-roll.md, user-decrypt-single.md, user-decrypt-multiple.md, ?ask q7.

---

## 7. Design notes for our lending architecture (grounded in the above)

- **Epoch aggregate publishing:** compute encrypted aggregates → in the epoch-close tx call `FHE.makePubliclyDecryptable` on each aggregate handle and emit an event with the handles (FooBar pattern). Off-chain keeper calls `publicDecrypt(handles-in-fixed-order)`, then calls a permissionless `finalizeEpoch(epochId, abiEncodedClearValues, decryptionProof)` that: checks `!finalized[epochId]`, rebuilds `bytes32[]` from **stored** handles (never caller-supplied) in the same fixed order, calls `FHE.checkSignatures`, decodes with matching static types, applies logic, sets `finalized[epochId] = true`.
- **Boolean-only liquidation decisions:** make only the `ebool` decision handle publicly decryptable (values stay private); same finalize pattern with `abi.decode(..., (bool))`.
- Anyone may finalize (censorship-resistant); spoofing impossible (KMS threshold sigs, order-bound, handle-bound); replay must be prevented by your own state guard; retries are free and unlimited; latency unspecified — treat as async with no deadline.
