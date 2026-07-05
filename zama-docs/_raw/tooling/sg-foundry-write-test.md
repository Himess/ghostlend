> For the complete documentation index, see [llms.txt](https://docs.zama.org/protocol/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md).

# Write FHEVM tests in Foundry

This page shows how to write FHEVM tests in Foundry using [forge-fhevm](https://github.com/zama-ai/forge-fhevm).

### Inherit from FhevmTest

Every FHEVM test contract inherits from `FhevmTest`. Calling `super.setUp()` deploys the FHEVM host contracts at their canonical deterministic addresses.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import "encrypted-types/EncryptedTypes.sol";

contract MyTest is FhevmTest {
    MyContract myContract;

    function setUp() public override {
        super.setUp(); // deploy FHEVM host contracts
        myContract = new MyContract();
    }
}
```

{% hint style="warning" %}
The contract under test must inherit a Zama config (e.g. `ZamaEthereumConfig`) so `FHE.*` calls route to the FHEVM host contracts deployed by `setUp()`.
{% endhint %}

### Encrypt inputs

Use the `encrypt*` helpers to build a `(handle, proof)` pair for any contract that calls `FHE.fromExternal`.

{% stepper %}
{% step %}
**Encrypt a value**

The two-argument overload uses `address(this)` as the implicit user:

```solidity
(externalEuint64 amount, bytes memory proof) = encryptUint64(100, address(myContract));
```

{% endstep %}

{% step %}
**Encrypt for a specific user**

The three-argument overload binds the proof to a different user:

```solidity
address alice = address(0xA11CE);
(externalEuint64 amount, bytes memory proof) = encryptUint64(100, alice, address(myContract));
```

{% endstep %}

{% step %}
**Call the contract**

```solidity
vm.prank(alice);
myContract.deposit(amount, proof);
```

{% endstep %}
{% endstepper %}

#### Supported encrypt helpers

| Function         | Value type | Returned handle    |
| ---------------- | ---------- | ------------------ |
| `encryptBool`    | `bool`     | `externalEbool`    |
| `encryptUint8`   | `uint8`    | `externalEuint8`   |
| `encryptUint16`  | `uint16`   | `externalEuint16`  |
| `encryptUint32`  | `uint32`   | `externalEuint32`  |
| `encryptUint64`  | `uint64`   | `externalEuint64`  |
| `encryptUint128` | `uint128`  | `externalEuint128` |
| `encryptUint256` | `uint256`  | `externalEuint256` |
| `encryptAddress` | `address`  | `externalEaddress` |

{% hint style="info" %}
Each call to `encrypt*` increments an internal nonce, so encrypting the same value twice produces different handles.
{% endhint %}

### Decrypt results

`forge-fhevm` exposes three decryption modes that mirror production decryption flows. Pick the one that matches your contract's pattern.

#### `decrypt(handle)` — low-level lookup

Direct cleartext for the handle. No ACL or proof checks. Best for unit assertions:

```solidity
euint64 balance = myContract.balanceHandle(alice);
assertEq(decrypt(balance), 100);
```

`decrypt()` has typed overloads for every encrypted type:

```solidity
bool    a = decrypt(myEbool);
uint8   b = decrypt(myEuint8);
uint64  c = decrypt(myEuint64);
address d = decrypt(myEaddress);
```

#### `publicDecrypt(handles)` — KMS-signed public decryption

Use when your contract verifies decryption proofs on-chain via `FHE.checkSignatures()`. Returns cleartexts and a KMS-signed proof:

```solidity
bytes32[] memory handles = new bytes32[](1);
handles[0] = euint64.unwrap(balance);

(uint256[] memory cleartexts, bytes memory proof) = publicDecrypt(handles);
FHE.checkSignatures(handles, abi.encode(cleartexts), proof);
assertEq(cleartexts[0], 100);
```

{% hint style="warning" %}
`publicDecrypt()` reverts with `HandleNotAllowedForPublicDecryption` if the contract did not call `FHE.makePubliclyDecryptable()` on the handle.
{% endhint %}

#### `userDecrypt(handle, user, contract, signature)` — user-facing flow

The full user decryption flow with persistent ACL checks and EIP-712 signature verification:

```solidity
uint256 constant ALICE_PK = 0xA11CE;
address alice = vm.addr(ALICE_PK);

// (mint or transfer that grants ACL to alice through business logic)

bytes memory sig = signUserDecrypt(ALICE_PK, address(myContract));
uint256 cleartext = userDecrypt(
    euint64.unwrap(myContract.balanceHandle(alice)),
    alice,
    address(myContract),
    sig
);
assertEq(cleartext, 100);
```

| Error                              | Cause                                        |
| ---------------------------------- | -------------------------------------------- |
| `UserAddressEqualsContractAddress` | `userAddress == contractAddress`             |
| `UserNotAuthorizedForDecrypt`      | User lacks **persistent** ACL permission     |
| `ContractNotAuthorizedForDecrypt`  | Contract lacks **persistent** ACL permission |
| `InvalidUserDecryptSignature`      | Signature does not recover to `userAddress`  |

{% hint style="info" %}
ACL permissions are granted by the contract under test as part of its business logic — for example, when a token's `mint` calls `FHE.allow(balance, owner)`. You don't need to grant permissions manually in tests.
{% endhint %}

### Full counter test example

A complete counter test is shipped in [`fhevm-foundry-template/test/FHECounter.t.sol`](https://github.com/zama-ai/fhevm-foundry-template/blob/main/test/FHECounter.t.sol):

```solidity
contract FHECounterTest is FhevmTest {
    FHECounter counter;
    uint256 internal constant ALICE_PK = 0xA11CE;
    address alice;

    function setUp() public override {
        super.setUp();
        counter = new FHECounter();
        alice = vm.addr(ALICE_PK);
    }

    function test_incrementTheCounterByOne() public {
        (externalEuint32 encOne, bytes memory proof) = encryptUint32(1, alice, address(counter));

        vm.prank(alice);
        counter.increment(encOne, proof);

        bytes memory sig = signUserDecrypt(ALICE_PK, address(counter));
        uint256 clear = userDecrypt(euint32.unwrap(counter.getCount()), alice, address(counter), sig);
        assertEq(clear, 1);
    }
}
```

### Run the tests

```bash
forge test -vvv
forge test --match-test test_incrementTheCounterByOne -vvv  # single test
```

### Where to go next

🟨 Go to [**Deploy FHEVM contracts with Foundry**](/protocol/solidity-guides/development-guide/foundry/deploy.md) to deploy your contract to a local Anvil node or to Sepolia.

🟨 Go to [**forge-fhevm API reference**](/protocol/solidity-guides/development-guide/foundry/api.md) for the full `FhevmTest` API.


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter, and the optional `goal` query parameter:

```
GET https://docs.zama.org/protocol/solidity-guides/development-guide/foundry/write_test.md?ask=<question>&goal=<endgoal>
```

`ask` is the immediate question: it should be specific, self-contained, and written in natural language.
`goal` is optional and describes the broader end goal you are ultimately trying to accomplish on behalf of the user. GitBook uses it to tailor the answer towards what is most useful for that goal.

The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
