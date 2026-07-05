# 07 — Zama FHEVM: ALL Official Code Examples (verbatim)

> Compiled 2026-07-03 from docs.zama.org (`/protocol/examples/...` raw markdown). Raw dumps: `zama-docs/_raw/addresses-examples/`.
> Every example page is reproduced **IN FULL, VERBATIM** (complete Solidity contracts + TypeScript tests as published). Only the GitBook page boilerplate (llms.txt banner, "Agent Instructions" footer) was removed.
> Each example is prefaced by its source URL and a short note on the pattern it demonstrates and its relevance to a confidential lending protocol.
> Order: decryption examples → OpenZeppelin/token examples → auction → basics.
> Note: `{% tabs %}` / `{% tab title="X.sol" %}` / `{% hint %}` markers are GitBook syntax from the source pages; the code inside the fences is the canonical content. All example tests run only in the FHEVM Hardhat **mock** environment (`hre.fhevm.isMock`), not on Sepolia.

---

# PART A — Decryption examples

## A.0 Decryption — section index

Source: https://docs.zama.org/protocol/examples/basic/decryption.md
Pattern: index of the four official decryption examples (user decrypt single/multiple, public decrypt single/multiple).
Lending relevance: decryption is the only way cleartext leaves FHE state — a lending protocol needs *user* decryption for private balance/debt dashboards and *public* decryption for liquidation flags and settlement amounts.

# Decryption

- [User decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md)
- [User decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md)
- [Public Decrypt single value](https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md)
- [Public Decrypt multiple values](https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md)

---

## A.1 User decrypt — single value (`UserDecryptSingleValue`)

Source: https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-single-value.md
Pattern: the FHE ACL dual-permission rule — after every state update you must call BOTH `FHE.allowThis(handle)` (contract) and `FHE.allow(handle, user)` (caller) or off-chain user decryption fails; includes a deliberately wrong variant and the failing test that proves it.
Lending relevance: every encrypted collateral/debt handle your lending contract stores must get this dual grant on each update, otherwise the borrower cannot read their own position. This is the single most common FHEVM bug.

# User decrypt single value

This example demonstrates the FHE user decryption mechanism with a single value.

User decryption is a mechanism that allows specific users to decrypt encrypted values while keeping them hidden from others. Unlike public decryption where decrypted values become visible to everyone, user decryption maintains privacy by only allowing authorized users with the proper permissions to view the data. While permissions are granted onchain through smart contracts, the actual **decryption call occurs off-chain in the frontend application**.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="UserDecryptSingleValue.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * This trivial example demonstrates the FHE decryption mechanism
 * and highlights common pitfalls developers may encounter.
 */
contract UserDecryptSingleValue is ZamaEthereumConfig {
  euint32 private _trivialEuint32;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initializeUint32(uint32 value) external {
    // Compute a trivial FHE formula _trivialEuint32 = value + 1
    _trivialEuint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));

    // Grant FHE permissions to:
    // ✅ The contract caller (`msg.sender`): allows them to decrypt `_trivialEuint32`.
    // ✅ The contract itself (`address(this)`): allows it to operate on `_trivialEuint32` and
    //    also enables the caller to perform user decryption.
    //
    // Note: If you forget to call `FHE.allowThis(_trivialEuint32)`, the user will NOT be able
    //       to user decrypt the value! Both the contract and the caller must have FHE permissions
    //       for user decryption to succeed.
    FHE.allowThis(_trivialEuint32);
    FHE.allow(_trivialEuint32, msg.sender);
  }

  function initializeUint32Wrong(uint32 value) external {
    // Compute a trivial FHE formula _trivialEuint32 = value + 1
    _trivialEuint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));

    // ❌ Common FHE permission mistake:
    // ================================================================
    // We grant FHE permissions to the contract caller (`msg.sender`),
    // expecting they will be able to user decrypt the encrypted value later.
    //
    // However, this will fail! 💥
    // The contract itself (`address(this)`) also needs FHE permissions to allow user decryption.
    // Without granting the contract access using `FHE.allowThis(...)`,
    // the user decryption attempt by the user will not succeed.
    FHE.allow(_trivialEuint32, msg.sender);
  }

  function encryptedUint32() public view returns (euint32) {
    return _trivialEuint32;
  }
}
```

{% endtab %}

{% tab title="UserDecryptSingleValue.ts" %}

```ts
import { UserDecryptSingleValue, UserDecryptSingleValue__factory } from "../../../types";
import type { Signers } from "../../../types";
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("UserDecryptSingleValue")) as UserDecryptSingleValue__factory;
  const userUserDecryptSingleValue = (await factory.deploy()) as UserDecryptSingleValue;
  const userUserDecryptSingleValue_address = await userUserDecryptSingleValue.getAddress();

  return { userUserDecryptSingleValue, userUserDecryptSingleValue_address };
}

/**
 * This trivial example demonstrates the FHE user decryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("UserDecryptSingleValue", function () {
  let contract: UserDecryptSingleValue;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.userUserDecryptSingleValue_address;
    contract = deployment.userUserDecryptSingleValue;
  });

  // ✅ Test should succeed
  it("user decryption should succeed", async function () {
    const tx = await contract.connect(signers.alice).initializeUint32(123456);
    await tx.wait();

    const encryptedUint32 = await contract.encryptedUint32();

    // The FHEVM Hardhat plugin provides a set of convenient helper functions
    // that make it easy to perform FHEVM operations within your Hardhat environment.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const clearUint32 = await fhevm.userDecryptEuint(
      FhevmType.euint32, // Specify the encrypted type
      encryptedUint32,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    expect(clearUint32).to.equal(123456 + 1);
  });

  // ❌ Test should fail
  it("user decryption should fail", async function () {
    const tx = await contract.connect(signers.alice).initializeUint32Wrong(123456);
    await tx.wait();

    const encryptedUint32 = await contract.encryptedUint32();

    await expect(
      hre.fhevm.userDecryptEuint(FhevmType.euint32, encryptedUint32, contractAddress, signers.alice),
    ).to.be.rejectedWith(new RegExp("^dapp contract (.+) is not authorized to user decrypt handle (.+)."));
  });
});
```

{% endtab %}
{% endtabs %}

---

## A.2 User decrypt — multiple values (`UserDecryptMultipleValues`)

Source: https://docs.zama.org/protocol/examples/basic/decryption/fhe-user-decrypt-multiple-values.md
Pattern: granting ACL on several handles (ebool/euint32/euint64) and performing one off-chain `userDecrypt` batch call with a generated keypair + EIP-712 `UserDecryptRequestVerification` signature (the raw relayer-SDK flow, not just the Hardhat helper).
Lending relevance: this is exactly how a lending dApp frontend fetches a user's whole private position (collateral, debt, health flag) in one signed request; the EIP-712 flow is what you implement in production frontends.

# User decrypt multiple values

This example demonstrates the FHE user decryption mechanism with multiple values.

User decryption is a mechanism that allows specific users to decrypt encrypted values while keeping them hidden from others. Unlike public decryption where decrypted values become visible to everyone, user decryption maintains privacy by only allowing authorized users with the proper permissions to view the data. While permissions are granted onchain through smart contracts, the actual **decryption call occurs off-chain in the frontend application**.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="UserDecryptMultipleValues.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint32, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract UserDecryptMultipleValues is ZamaEthereumConfig {
  ebool private _encryptedBool; // = 0 (uninitizalized)
  euint32 private _encryptedUint32; // = 0 (uninitizalized)
  euint64 private _encryptedUint64; // = 0 (uninitizalized)

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(bool a, uint32 b, uint64 c) external {
    // Compute 3 trivial FHE formulas

    // _encryptedBool = a ^ false
    _encryptedBool = FHE.xor(FHE.asEbool(a), FHE.asEbool(false));

    // _encryptedUint32 = b + 1
    _encryptedUint32 = FHE.add(FHE.asEuint32(b), FHE.asEuint32(1));

    // _encryptedUint64 = c + 1
    _encryptedUint64 = FHE.add(FHE.asEuint64(c), FHE.asEuint64(1));

    // see `DecryptSingleValue.sol` for more detailed explanations
    // about FHE permissions and asynchronous user decryption requests.
    FHE.allowThis(_encryptedBool);
    FHE.allowThis(_encryptedUint32);
    FHE.allowThis(_encryptedUint64);

    FHE.allow(_encryptedBool, msg.sender);
    FHE.allow(_encryptedUint32, msg.sender);
    FHE.allow(_encryptedUint64, msg.sender);
  }

  function encryptedBool() public view returns (ebool) {
    return _encryptedBool;
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedUint32;
  }

  function encryptedUint64() public view returns (euint64) {
    return _encryptedUint64;
  }
}
```

{% endtab %}

{% tab title="UserDecryptMultipleValues.ts" %}

```ts
import { UserDecryptMultipleValues, UserDecryptMultipleValues__factory } from "../../../types";
import type { Signers } from "../../types";
import { HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { utils as fhevm_utils } from "@fhevm/mock-utils";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DecryptedResults } from "@zama-fhe/relayer-sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("UserDecryptMultipleValues")) as UserDecryptMultipleValues__factory;
  const userDecryptMultipleValues = (await factory.deploy()) as UserDecryptMultipleValues;
  const userDecryptMultipleValues_address = await userDecryptMultipleValues.getAddress();

  return { userDecryptMultipleValues, userDecryptMultipleValues_address };
}

/**
 * This trivial example demonstrates the FHE user decryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("UserDecryptMultipleValues", function () {
  let contract: UserDecryptMultipleValues;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.userDecryptMultipleValues_address;
    contract = deployment.userDecryptMultipleValues;
  });

  // ✅ Test should succeed
  it("user decryption should succeed", async function () {
    const tx = await contract.connect(signers.alice).initialize(true, 123456, 78901234567);
    await tx.wait();

    const encryptedBool = await contract.encryptedBool();
    const encryptedUint32 = await contract.encryptedUint32();
    const encryptedUint64 = await contract.encryptedUint64();

    // The FHEVM Hardhat plugin provides a set of convenient helper functions
    // that make it easy to perform FHEVM operations within your Hardhat environment.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const aliceKeypair = fhevm.generateKeypair();

    const startTimestamp = fhevm_utils.timestampNow();
    const durationDays = 365;

    const aliceEip712 = fhevm.createEIP712(aliceKeypair.publicKey, [contractAddress], startTimestamp, durationDays);
    const aliceSignature = await signers.alice.signTypedData(
      aliceEip712.domain,
      { UserDecryptRequestVerification: aliceEip712.types.UserDecryptRequestVerification },
      aliceEip712.message,
    );

    const decrytepResults: DecryptedResults = await fhevm.userDecrypt(
      [
        { handle: encryptedBool, contractAddress: contractAddress },
        { handle: encryptedUint32, contractAddress: contractAddress },
        { handle: encryptedUint64, contractAddress: contractAddress },
      ],
      aliceKeypair.privateKey,
      aliceKeypair.publicKey,
      aliceSignature,
      [contractAddress],
      signers.alice.address,
      startTimestamp,
      durationDays,
    );

    expect(decrytepResults[encryptedBool]).to.equal(true);
    expect(decrytepResults[encryptedUint32]).to.equal(123456 + 1);
    expect(decrytepResults[encryptedUint64]).to.equal(78901234567 + 1);
  });
});
```

{% endtab %}
{% endtabs %}

---

## A.3 Public decrypt — single value (`HeadsOrTails`)

Source: https://docs.zama.org/protocol/examples/basic/decryption/heads-or-tails.md
Pattern: the full public-decryption callback lifecycle — on-chain `FHE.makePubliclyDecryptable(ct)` + event with the handle → off-chain `fhevm.publicDecrypt([handle])` via the Zama Relayer → on-chain `FHE.checkSignatures(cts, abiEncodedClearValues, decryptionProof)` which reverts (`KMSInvalidSigner`) on forged proofs, forged cleartexts, or results swapped between requests.
Lending relevance: the same request/verify lifecycle a lending protocol uses to publicly reveal a liquidation decision or settlement amount; the three negative tests show precisely which manipulations the KMS proof defends against.

# Public Decrypt single value

This example showcases the public decryption mechanism and its corresponding on-chain verification in the case of a single value. The core assertion is to guarantee that a single given cleartext is the cryptographically verifiable result of the decryption of a single original on-chain ciphertext.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="HeadsOrTails.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HeadsOrTails
 * @notice Implements a simple Heads or Tails game demonstrating public, permissionless decryption
 *         using the FHE.makePubliclyDecryptable feature.
 * @dev Inherits from ZamaEthereumConfig to access FHE functions like FHE.randEbool() and FHE.verifySignatures().
 */
contract HeadsOrTails is ZamaEthereumConfig {
    constructor() {}

    /**
     * @notice Simple counter to assign a unique ID to each new game.
     */
    uint256 private counter = 0;

    /**
     * @notice Defines the entire state for a single Heads or Tails game instance.
     */
    struct Game {
        /// @notice The address of the player who chose Heads.
        address headsPlayer;
        /// @notice The address of the player who chose Tails.
        address tailsPlayer;
        /// @notice The core encrypted result. This is a publicly decryptable ebool handle.
        //          true means Heads won; false means Tails won.
        ebool encryptedHasHeadsWon;
        /// @notice The clear address of the final winner, set after decryption and verification.
        address winner;
    }

    /**
     * @notice Mapping to store all game states, accessible by a unique game ID.
     */
    mapping(uint256 gameId => Game game) public games;

    /**
     * @notice Emitted when a new game is started, providing the encrypted handle required for decryption.
     * @param gameId The unique identifier for the game.
     * @param headsPlayer The address choosing Heads.
     * @param tailsPlayer The address choosing Tails.
     * @param encryptedHasHeadsWon The encrypted handle (ciphertext) storing the result.
     */
    event GameCreated(
        uint256 indexed gameId,
        address indexed headsPlayer,
        address indexed tailsPlayer,
        ebool encryptedHasHeadsWon
    );

    /**
     * @notice Initiates a new Heads or Tails game, generates the result using FHE,
     *         and makes the result publicly available for decryption.
     * @param headsPlayer The player address choosing Heads.
     * @param tailsPlayer The player address choosing Tails.
     */
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

        // You can catch the event to get the gameId and the encryptedHasHeadsWon handle
        // for further decryption requests, or create a view function.
        emit GameCreated(gameId, headsPlayer, tailsPlayer, games[gameId].encryptedHasHeadsWon);
    }

    /**
     * @notice Returns the number of games created so far.
     * @return The number of games created.
     */
    function getGamesCount() public view returns (uint256) {
        return counter;
    }

    /**
     * @notice Returns the encrypted ebool handle that stores the game result.
     * @param gameId The ID of the game.
     * @return The encrypted result (ebool handle).
     */
    function hasHeadsWon(uint256 gameId) public view returns (ebool) {
        return games[gameId].encryptedHasHeadsWon;
    }

    /**
     * @notice Returns the address of the game winner.
     * @param gameId The ID of the game.
     * @return The winner's address (address(0) if not yet revealed).
     */
    function getWinner(uint256 gameId) public view returns (address) {
        require(games[gameId].winner != address(0), "Game winner not yet revealed");
        return games[gameId].winner;
    }

    /**
     * @notice Verifies the provided (decryption proof, ABI-encoded clear value) pair against the stored ciphertext,
     *         and then stores the winner of the game.
     * @param gameId The ID of the game to settle.
     * @param abiEncodedClearGameResult The ABI-encoded clear value (bool) associated to the `decryptionProof`.
     * @param decryptionProof The proof that validates the decryption.
     */
    function recordAndVerifyWinner(
        uint256 gameId,
        bytes memory abiEncodedClearGameResult,
        bytes memory decryptionProof
    ) public {
        require(games[gameId].winner == address(0), "Game winner already revealed");

        // 1. FHE Verification: Build the list of ciphertexts (handles) and verify the proof.
        //    The verification checks that 'abiEncodedClearGameResult' is the true decryption
        //    of the 'encryptedHasHeadsWon' handle using the provided 'decryptionProof'.

        // Creating the list of handles in the right order! In this case the order does not matter since the proof
        // only involves 1 single handle.
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(games[gameId].encryptedHasHeadsWon);

        // This FHE call reverts the transaction if the decryption proof is invalid.
        FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

        // 2. Decode the clear result and determine the winner's address.
        //    In this very specific case, the function argument `abiEncodedClearGameResult` could have been a simple
        //    `bool` instead of an abi-encoded bool. In this case, we should have compute abi.encode on-chain
        bool decodedClearGameResult = abi.decode(abiEncodedClearGameResult, (bool));
        address winner = decodedClearGameResult ? games[gameId].headsPlayer : games[gameId].tailsPlayer;

        // 3. Store the winner
        games[gameId].winner = winner;
    }
}
```

{% endtab %}

{% tab title="HeadsOrTails.ts" %}

```ts
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { HeadsOrTails, HeadsOrTails__factory } from "../../../typechain-types";
import { Signers } from "../signers";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("HeadsOrTails")) as HeadsOrTails__factory;
  const headsOrTails = (await factory.deploy()) as HeadsOrTails;
  const headsOrTails_address = await headsOrTails.getAddress();

  return { headsOrTails, headsOrTails_address };
}

describe("HeadsOrTails", function () {
  let contract: HeadsOrTails;
  let contractAddress: string;
  let signers: Signers;
  let playerA: HardhatEthersSigner;
  let playerB: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };

    playerA = signers.alice;
    playerB = signers.bob;
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.headsOrTails_address;
    contract = deployment.headsOrTails;
  });

  /**
   * Helper: Parses the GameCreated event from a transaction receipt.
   * WARNING: This function is for illustrative purposes only and is not production-ready
   * (it does not handle several events in same tx).
   */
  function parseGameCreatedEvent(txReceipt: EthersT.ContractTransactionReceipt | null): {
    txHash: `0x${string}`;
    gameId: number;
    headsPlayer: `0x${string}`;
    tailsPlayer: `0x${string}`;
    encryptedHasHeadsWon: `0x${string}`;
  } {
    const gameCreatedEvents: Array<{
      txHash: `0x${string}`;
      gameId: number;
      headsPlayer: `0x${string}`;
      tailsPlayer: `0x${string}`;
      encryptedHasHeadsWon: `0x${string}`;
    }> = [];

    if (txReceipt) {
      const logs = Array.isArray(txReceipt.logs) ? txReceipt.logs : [txReceipt.logs];
      for (let i = 0; i < logs.length; ++i) {
        const parsedLog = contract.interface.parseLog(logs[i]);
        if (!parsedLog || parsedLog.name !== "GameCreated") {
          continue;
        }
        const ge = {
          txHash: txReceipt.hash as `0x${string}`,
          gameId: Number(parsedLog.args[0]),
          headsPlayer: parsedLog.args[1],
          tailsPlayer: parsedLog.args[2],
          encryptedHasHeadsWon: parsedLog.args[3],
        };
        gameCreatedEvents.push(ge);
      }
    }

    // In this example, we expect on one single GameCreated event
    expect(gameCreatedEvents.length).to.eq(1);

    return gameCreatedEvents[0];
  }

  // ✅ Test should succeed
  it("decryption should succeed", async function () {
    console.log(``);
    console.log(`🎲 HeadsOrTails Game contract address: ${contractAddress}`);
    console.log(`   🤖 playerA.address: ${playerA.address}`);
    console.log(`   🎃 playerB.address: ${playerB.address}`);
    console.log(``);

    // Starts a new Heads or Tails game. This will emit a `GameCreated` event
    const tx = await contract.connect(signers.owner).headsOrTails(playerA, playerB);

    // Parse the `GameCreated` event
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait());

    // GameId is 1 since we are playing the first game
    expect(gameCreatedEvent.gameId).to.eq(1);
    expect(gameCreatedEvent.headsPlayer).to.eq(playerA.address);
    expect(gameCreatedEvent.tailsPlayer).to.eq(playerB.address);
    expect(await contract.getGamesCount()).to.eq(1);

    console.log(`✅ New game #${gameCreatedEvent.gameId} created!`);
    console.log(JSON.stringify(gameCreatedEvent, null, 2));

    const gameId = gameCreatedEvent.gameId;
    const encryptedBool: string = gameCreatedEvent.encryptedHasHeadsWon;

    // Call the Zama Relayer to compute the decryption
    const publicDecryptResults = await fhevm.publicDecrypt([encryptedBool]);

    // The Relayer returns a `PublicDecryptResults` object containing:
    // - the ORDERED clear values (here we have only one single value)
    // - the ORDERED clear values in ABI-encoded form
    // - the KMS decryption proof associated with the ORDERED clear values in ABI-encoded form
    const abiEncodedClearGameResult = publicDecryptResults.abiEncodedClearValues;
    const decryptionProof = publicDecryptResults.decryptionProof;

    // Let's forward the `PublicDecryptResults` content to the on-chain contract whose job
    // will simply be to verify the proof and declare the final winner of the game
    await contract.recordAndVerifyWinner(gameId, abiEncodedClearGameResult, decryptionProof);

    const winner = await contract.getWinner(gameId);

    expect(winner === playerA.address || winner === playerB.address).to.eq(true);

    console.log(``);
    if (winner === playerA.address) {
      console.log(`🤖 playerA is the winner 🥇🥇`);
    } else if (winner === playerB.address) {
      console.log(`🎃 playerB is the winner 🥇🥇`);
    }
  });

  // ❌ The test must fail if the decryption proof is invalid
  it("should fail when the decryption proof is invalid", async function () {
    const tx = await contract.connect(signers.owner).headsOrTails(playerA, playerB);
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait());

    const publicDecryptResults = await fhevm.publicDecrypt([gameCreatedEvent.encryptedHasHeadsWon]);
    await expect(
      contract.recordAndVerifyWinner(
        gameCreatedEvent.gameId,
        publicDecryptResults.abiEncodedClearValues,
        publicDecryptResults.decryptionProof + "dead",
      ),
    ).to.be.revertedWithCustomError(
      { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
      "KMSInvalidSigner",
    );
  });

  // ❌ The test must fail if a malicious operator attempts to use a decryption proof
  // with a forged game result.
  it("should fail when using a decryption proof with a forged game result", async function () {
    const tx = await contract.connect(signers.owner).headsOrTails(playerA, playerB);
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait());

    const publicDecryptResults = await fhevm.publicDecrypt([gameCreatedEvent.encryptedHasHeadsWon]);
    const clearHeadsHasWon = publicDecryptResults.clearValues[gameCreatedEvent.encryptedHasHeadsWon];

    // The clear value is also ABI-encoded
    const decodedHeadsHasWon = EthersT.AbiCoder.defaultAbiCoder().decode(
      ["bool"],
      publicDecryptResults.abiEncodedClearValues,
    )[0];
    expect(decodedHeadsHasWon).to.eq(clearHeadsHasWon);

    // Let's try to forge the game result
    const forgedABIEncodedClearValues = EthersT.AbiCoder.defaultAbiCoder().encode(["bool"], [!clearHeadsHasWon]);

    await expect(
      contract.recordAndVerifyWinner(
        gameCreatedEvent.gameId,
        forgedABIEncodedClearValues,
        publicDecryptResults.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(
      { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
      "KMSInvalidSigner",
    );
  });

  // ❌ Two games (Game1 and Game2) are played between playerA and playerB.
  // The test must fail if a malicious operator attempts to forge the result of Game1
  // with the result of Game2
  it("should fail when using the result of a different game", async function () {
    // Game 1
    const tx1 = await contract.connect(signers.owner).headsOrTails(playerA, playerB);
    const gameCreatedEvent1 = parseGameCreatedEvent(await tx1.wait());

    // Game 2
    const tx2 = await contract.connect(signers.owner).headsOrTails(playerA, playerB);
    const gameCreatedEvent2 = parseGameCreatedEvent(await tx2.wait());

    // Let's try to forge the Game1's winner using the result of Game2
    const publicDecryptResults2 = await fhevm.publicDecrypt([gameCreatedEvent2.encryptedHasHeadsWon]);

    await expect(
      contract.recordAndVerifyWinner(
        gameCreatedEvent1.gameId,
        publicDecryptResults2.abiEncodedClearValues,
        publicDecryptResults2.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(
      { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
      "KMSInvalidSigner",
    );
  });
});
```

{% endtab %}
{% endtabs %}

---

## A.4 Public decrypt — multiple values (`HighestDieRoll`)

Source: https://docs.zama.org/protocol/examples/basic/decryption/highest-die-roll.md
Pattern: public decryption of MULTIPLE ciphertexts in one proof — the `bytes32[] cts` handle array order MUST match the ABI-encoding order of the clear values, or `FHE.checkSignatures` reverts (demonstrated by the wrong-order test); also shows `FHE.randEuint8()` and draw handling.
Lending relevance: reveal several settlement values atomically (e.g., clamped repay amount + seized collateral) with one proof; the strict ordering requirement is a real trap when a liquidation callback decodes multiple values.

# Public Decrypt multiple values

This example showcases the public decryption mechanism and its corresponding on-chain verification in the case of multiple values. The core assertion is to guarantee that multiple given cleartexts are the cryptographically verifiable results of the decryption of multiple original on-chain ciphertexts.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="HighestDieRoll.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HighestDieRoll
 * @notice Implements a simple 8-sided Die Roll game demonstrating public, permissionless decryption
 *         using the FHE.makePubliclyDecryptable feature.
 * @dev Inherits from ZamaEthereumConfig to access FHE functions like FHE.randEbool() and FHE.verifySignatures().
 */
contract HighestDieRoll is ZamaEthereumConfig {
    constructor() {}

    /**
     * @notice Simple counter to assign a unique ID to each new game.
     */
    uint256 private counter = 0;

    /**
     * @notice Defines the entire state for a single Heads or Tails game instance.
     */
    struct Game {
        /// @notice The address of the player who chose Heads.
        address playerA;
        /// @notice The address of the player who chose Tails.
        address playerB;
        /// @notice The core encrypted result. This is a publicly decryptable set of 4 handle.
        euint8 playerAEncryptedDieRoll;
        euint8 playerBEncryptedDieRoll;
        /// @notice The clear address of the final winne, address(0) if draw, set after decryption and verification.
        address winner;
        /// @notice true if the game result is revealed
        bool revealed;
    }

    /**
     * @notice Mapping to store all game states, accessible by a unique game ID.
     */
    mapping(uint256 gameId => Game game) public games;

    /**
     * @notice Emitted when a new game is started, providing the encrypted handle required for decryption.
     * @param gameId The unique identifier for the game.
     * @param playerA The address of playerA.
     * @param playerB The address of playerB.
     * @param playerAEncryptedDieRoll The encrypted die roll result of playerA.
     * @param playerBEncryptedDieRoll The encrypted die roll result of playerB.
     */
    event GameCreated(
        uint256 indexed gameId,
        address indexed playerA,
        address indexed playerB,
        euint8 playerAEncryptedDieRoll,
        euint8 playerBEncryptedDieRoll
    );

    /**
     * @notice Initiates a new highest die roll game, generates the result using FHE,
     *         and makes the result publicly available for decryption.
     * @param playerA The player address choosing Heads.
     * @param playerB The player address choosing Tails.
     */
    function highestDieRoll(address playerA, address playerB) external {
        require(playerA != address(0), "playerA is address zero");
        require(playerB != address(0), "playerB player is address zero");
        require(playerA != playerB, "playerA and playerB should be different");

        euint8 playerAEncryptedDieRoll = FHE.randEuint8();
        euint8 playerBEncryptedDieRoll = FHE.randEuint8();

        counter++;

        // gameId > 0
        uint256 gameId = counter;
        games[gameId] = Game({
            playerA: playerA,
            playerB: playerB,
            playerAEncryptedDieRoll: playerAEncryptedDieRoll,
            playerBEncryptedDieRoll: playerBEncryptedDieRoll,
            winner: address(0),
            revealed: false
        });

        // We make the results publicly decryptable.
        FHE.makePubliclyDecryptable(playerAEncryptedDieRoll);
        FHE.makePubliclyDecryptable(playerBEncryptedDieRoll);

        // You can catch the event to get the gameId and the die rolls handles
        // for further decryption requests, or create a view function.
        emit GameCreated(gameId, playerA, playerB, playerAEncryptedDieRoll, playerBEncryptedDieRoll);
    }

    /**
     * @notice Returns the number of games created so far.
     * @return The number of games created.
     */
    function getGamesCount() public view returns (uint256) {
        return counter;
    }

    /**
     * @notice Returns the encrypted euint8 handle that stores the playerA die roll.
     * @param gameId The ID of the game.
     * @return The encrypted result (euint8 handle).
     */
    function getPlayerADieRoll(uint256 gameId) public view returns (euint8) {
        return games[gameId].playerAEncryptedDieRoll;
    }

    /**
     * @notice Returns the encrypted euint8 handle that stores the playerB die roll.
     * @param gameId The ID of the game.
     * @return The encrypted result (euint8 handle).
     */
    function getPlayerBDieRoll(uint256 gameId) public view returns (euint8) {
        return games[gameId].playerBEncryptedDieRoll;
    }

    /**
     * @notice Returns the address of the game winner. If the game is finalized, the function returns `address(0)`
     *         if the game is a draw.
     * @param gameId The ID of the game.
     * @return The winner's address (address(0) if not yet revealed or draw).
     */
    function getWinner(uint256 gameId) public view returns (address) {
        require(games[gameId].revealed, "Game winner not yet revealed");
        return games[gameId].winner;
    }

    /**
     * @notice Returns `true` if the game result is publicly revealed, `false` otherwise.
     * @param gameId The ID of the game.
     * @return true if the game is publicly revealed.
     */
    function isGameRevealed(uint256 gameId) public view returns (bool) {
        return games[gameId].revealed;
    }

    /**
     * @notice Verifies the provided (decryption proof, ABI-encoded clear values) pair against the stored ciphertext,
     *         and then stores the winner of the game.
     * @param gameId The ID of the game to settle.
     * @param abiEncodedClearGameResult The ABI-encoded clear values (uint8, uint8) associated to the `decryptionProof`.
     * @param decryptionProof The proof that validates the decryption.
     */
    function recordAndVerifyWinner(
        uint256 gameId,
        bytes memory abiEncodedClearGameResult,
        bytes memory decryptionProof
    ) public {
        require(!games[gameId].revealed, "Game already revealed");

        // 1. FHE Verification: Build the list of ciphertexts (handles) and verify the proof.
        //    The verification checks that 'abiEncodedClearGameResult' is the true decryption
        //    of the '(playerAEncryptedDieRoll, playerBEncryptedDieRoll)' handle pair using
        //    the provided 'decryptionProof'.

        // Creating the list of handles in the right order! In this case the order does not matter since the proof
        // only involves 1 single handle.
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(games[gameId].playerAEncryptedDieRoll);
        cts[1] = FHE.toBytes32(games[gameId].playerBEncryptedDieRoll);

        // This FHE call reverts the transaction if the decryption proof is invalid.
        FHE.checkSignatures(cts, abiEncodedClearGameResult, decryptionProof);

        // 2. Decode the clear result and determine the winner's address.
        //    In this very specific case, the function argument `abiEncodedClearGameResult` could have been replaced by two
        //    `uint8` instead of an abi-encoded uint8 pair. In this case, we should have to compute abi.encode on-chain
        (uint8 decodedClearPlayerADieRoll, uint8 decodedClearPlayerBDieRoll) = abi.decode(
            abiEncodedClearGameResult,
            (uint8, uint8)
        );

        // The die is an 8-sided die (d8) (1..8)
        decodedClearPlayerADieRoll = (decodedClearPlayerADieRoll % 8) + 1;
        decodedClearPlayerBDieRoll = (decodedClearPlayerBDieRoll % 8) + 1;

        address winner = decodedClearPlayerADieRoll > decodedClearPlayerBDieRoll
            ? games[gameId].playerA
            : (decodedClearPlayerADieRoll < decodedClearPlayerBDieRoll ? games[gameId].playerB : address(0));

        // 3. Store the revealed flag
        games[gameId].revealed = true;
        games[gameId].winner = winner;
    }
}
```

{% endtab %}

{% tab title="HighestDieRoll.ts" %}

```ts
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ClearValueType } from "@zama-fhe/relayer-sdk/node";
import { expect } from "chai";
import { ethers as EthersT } from "ethers";
import { ethers, fhevm } from "hardhat";
import * as hre from "hardhat";

import { HighestDieRoll, HighestDieRoll__factory } from "../../../typechain-types";
import { Signers } from "../signers";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("HighestDieRoll")) as HighestDieRoll__factory;
  const highestDiceRoll = (await factory.deploy()) as HighestDieRoll;
  const highestDiceRoll_address = await highestDiceRoll.getAddress();

  return { highestDiceRoll, highestDiceRoll_address };
}

describe("HighestDieRoll", function () {
  let contract: HighestDieRoll;
  let contractAddress: string;
  let signers: Signers;
  let playerA: HardhatEthersSigner;
  let playerB: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };

    playerA = signers.alice;
    playerB = signers.bob;
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.highestDiceRoll_address;
    contract = deployment.highestDiceRoll;
  });

  /**
   * Helper: Parses the GameCreated event from a transaction receipt.
   * WARNING: This function is for illustrative purposes only and is not production-ready
   * (it does not handle several events in same tx).
   */
  function parseGameCreatedEvent(txReceipt: EthersT.ContractTransactionReceipt | null): {
    txHash: `0x${string}`;
    gameId: number;
    playerA: `0x${string}`;
    playerB: `0x${string}`;
    playerAEncryptedDiceRoll: `0x${string}`;
    playerBEncryptedDiceRoll: `0x${string}`;
  } {
    const gameCreatedEvents: Array<{
      txHash: `0x${string}`;
      gameId: number;
      playerA: `0x${string}`;
      playerB: `0x${string}`;
      playerAEncryptedDiceRoll: `0x${string}`;
      playerBEncryptedDiceRoll: `0x${string}`;
    }> = [];

    if (txReceipt) {
      const logs = Array.isArray(txReceipt.logs) ? txReceipt.logs : [txReceipt.logs];
      for (let i = 0; i < logs.length; ++i) {
        const parsedLog = contract.interface.parseLog(logs[i]);
        if (!parsedLog || parsedLog.name !== "GameCreated") {
          continue;
        }
        const ge = {
          txHash: txReceipt.hash as `0x${string}`,
          gameId: Number(parsedLog.args[0]),
          playerA: parsedLog.args[1],
          playerB: parsedLog.args[2],
          playerAEncryptedDiceRoll: parsedLog.args[3],
          playerBEncryptedDiceRoll: parsedLog.args[4],
        };
        gameCreatedEvents.push(ge);
      }
    }

    // In this example, we expect on one single GameCreated event
    expect(gameCreatedEvents.length).to.eq(1);

    return gameCreatedEvents[0];
  }

  // ✅ Test should succeed
  it("decryption should succeed", async function () {
    console.log(``);
    console.log(`🎲 HighestDieRoll Game contract address: ${contractAddress}`);
    console.log(`   🤖 playerA.address: ${playerA.address}`);
    console.log(`   🎃 playerB.address: ${playerB.address}`);
    console.log(``);

    // Starts a new Heads or Tails game. This will emit a `GameCreated` event
    const tx = await contract.connect(signers.owner).highestDieRoll(playerA, playerB);

    // Parse the `GameCreated` event
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait())!;

    // GameId is 1 since we are playing the first game
    expect(gameCreatedEvent.gameId).to.eq(1);
    expect(gameCreatedEvent.playerA).to.eq(playerA.address);
    expect(gameCreatedEvent.playerB).to.eq(playerB.address);
    expect(await contract.getGamesCount()).to.eq(1);

    console.log(`✅ New game #${gameCreatedEvent.gameId} created!`);
    console.log(JSON.stringify(gameCreatedEvent, null, 2));

    const gameId = gameCreatedEvent.gameId;
    const playerADiceRoll = gameCreatedEvent.playerAEncryptedDiceRoll;
    const playerBDiceRoll = gameCreatedEvent.playerBEncryptedDiceRoll;

    // Call the Zama Relayer to compute the decryption
    const publicDecryptResults = await fhevm.publicDecrypt([playerADiceRoll, playerBDiceRoll]);

    // The Relayer returns a `PublicDecryptResults` object containing:
    // - the ORDERED clear values (here we have only one single value)
    // - the ORDERED clear values in ABI-encoded form
    // - the KMS decryption proof associated with the ORDERED clear values in ABI-encoded form
    const abiEncodedClearGameResult = publicDecryptResults.abiEncodedClearValues;
    const decryptionProof = publicDecryptResults.decryptionProof;

    const clearValueA: ClearValueType = publicDecryptResults.clearValues[playerADiceRoll];
    const clearValueB: ClearValueType = publicDecryptResults.clearValues[playerBDiceRoll];

    expect(typeof clearValueA).to.eq("bigint");
    expect(typeof clearValueB).to.eq("bigint");

    // playerA's 8-sided die roll result (between 1 and 8)
    const a = (Number(clearValueA) % 8) + 1;
    // playerB's 8-sided die roll result (between 1 and 8)
    const b = (Number(clearValueB) % 8) + 1;

    const isDraw = a === b;
    const playerAWon = a > b;
    const playerBWon = a < b;

    console.log(``);
    console.log(`🎲 playerA's 8-sided die roll is ${a}`);
    console.log(`🎲 playerB's 8-sided die roll is ${b}`);

    // Let's forward the `PublicDecryptResults` content to the on-chain contract whose job
    // will simply be to verify the proof and store the final winner of the game
    await contract.recordAndVerifyWinner(gameId, abiEncodedClearGameResult, decryptionProof);

    const isRevealed = await contract.isGameRevealed(gameId);
    const winner = await contract.getWinner(gameId);

    expect(isRevealed).to.eq(true);
    expect(winner === playerA.address || winner === playerB.address || winner === EthersT.ZeroAddress).to.eq(true);

    expect(isDraw).to.eq(winner === EthersT.ZeroAddress);
    expect(playerAWon).to.eq(winner === playerA.address);
    expect(playerBWon).to.eq(winner === playerB.address);

    console.log(``);
    if (winner === playerA.address) {
      console.log(`🤖 playerA is the winner 🥇🥇`);
    } else if (winner === playerB.address) {
      console.log(`🎃 playerB is the winner 🥇🥇`);
    } else if (winner === EthersT.ZeroAddress) {
      console.log(`Game is a draw!`);
    }
  });

  // ❌ Test should fail because clear values are ABI-encoded in the wrong order.
  it("decryption should fail when ABI-encoding is wrongly ordered", async function () {
    // Test Case: Verify strict ordering is enforced for cryptographic proof generation.
    // The `decryptionProof` is generated based on the expected order (A, B). By ABI-encoding
    // the clear values in the **reverse order** (B, A), we create a mismatch when the contract
    // internally verifies the proof (e.g., checks a signature against a newly computed hash).
    // This intentional failure is expected to revert with the `KMSInvalidSigner` error,
    // confirming the proof's order dependency.
    const tx = await contract.connect(signers.owner).highestDieRoll(playerA, playerB);
    const gameCreatedEvent = parseGameCreatedEvent(await tx.wait())!;
    const gameId = gameCreatedEvent.gameId;
    const playerADiceRoll = gameCreatedEvent.playerAEncryptedDiceRoll;
    const playerBDiceRoll = gameCreatedEvent.playerBEncryptedDiceRoll;
    // Call `fhevm.publicDecrypt` using order (A, B)
    const publicDecryptResults = await fhevm.publicDecrypt([playerADiceRoll, playerBDiceRoll]);
    const clearValueA: ClearValueType = publicDecryptResults.clearValues[playerADiceRoll];
    const clearValueB: ClearValueType = publicDecryptResults.clearValues[playerBDiceRoll];
    const decryptionProof = publicDecryptResults.decryptionProof;
    expect(typeof clearValueA).to.eq("bigint");
    expect(typeof clearValueB).to.eq("bigint");
    expect(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [clearValueA, clearValueB])).to.eq(
      publicDecryptResults.abiEncodedClearValues,
    );
    const wrongOrderBAInsteadOfABAbiEncodedValues = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [clearValueB, clearValueA],
    );
    // ❌ Call `contract.recordAndVerifyWinner` using order (B, A)
    await expect(
      contract.recordAndVerifyWinner(gameId, wrongOrderBAInsteadOfABAbiEncodedValues, decryptionProof),
    ).to.be.revertedWithCustomError(
      { interface: new EthersT.Interface(["error KMSInvalidSigner(address invalidSigner)"]) },
      "KMSInvalidSigner",
    );
  });
});
```

{% endtab %}
{% endtabs %}

---

# PART B — OpenZeppelin confidential contracts / token examples

## B.0 Library installation and overview

Source: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md
Pattern: project bootstrap — clone `zama-ai/fhevm-hardhat-template`, `npm i @openzeppelin/confidential-contracts`; prerequisites Node >= 20, Hardhat ^2.24.
Lending relevance: this is the canonical repo setup for the lending protocol; ERC7984 (the standard of cUSDCMock/cWETHMock), the ERC20 wrapper, and vesting utilities all come from this library.

# Library installation and overview

This section contains comprehensive guides and examples for using [OpenZeppelin's confidential smart contracts library](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts) with FHEVM. The library provides contracts and utilities that utilize the FHE (Fully Homomorphic Encryption) capabilities of the Zama Protocol to perform confidential transactions.

The library includes the ERC7984 confidential fungible token standard, an ERC20-to-ERC7984 wrapper, confidential vesting wallets, and encrypted voting utilities. See the [official OpenZeppelin documentation](https://docs.openzeppelin.com/confidential-contracts) for more details.

### Getting Started

This guide will help you set up a development environment for working with OpenZeppelin's confidential contracts and FHEVM.

#### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js** >= 20
* **Hardhat** ^2.24
* **Access to an FHEVM-enabled network** and the Zama gateway/relayer

#### Project Setup

1. **Clone the FHEVM Hardhat template repository:**

   ```bash
   git clone https://github.com/zama-ai/fhevm-hardhat-template conf-token
   cd conf-token
   ```
2. **Install project dependencies:**

   ```bash
   npm ci
   ```
3. **Install OpenZeppelin's confidential contracts library:**

   ```bash
   npm i @openzeppelin/confidential-contracts
   ```
4. **Compile the contracts:**

   ```bash
   npm run compile
   ```
5. **Run the test suite:**

   ```bash
   npm test
   ```

### Available Guides

Explore the following guides to learn how to implement confidential contracts using OpenZeppelin's library:

* [**ERC7984 Standard**](/protocol/examples/openzeppelin-confidential-contracts/erc7984.md) - Learn about the ERC7984 standard for confidential tokens
* [**ERC-20 to Wrapped ERC-7984**](/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md) - Wrap ERC-20 tokens into confidential ERC-7984 tokens
* [**Swap ERC7984 to ERC20**](/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md) - Unwrap confidential tokens back to ERC-20
* [**Vesting Wallet**](/protocol/examples/openzeppelin-confidential-contracts/vesting-wallet.md) - Implement confidential token vesting mechanisms

---

## B.1 ERC7984 Standard (`ERC7984Example`) — confidential fungible token

Source: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984.md
Pattern: minimal ERC7984 token (ZamaEthereumConfig + ERC7984 + Ownable2Step), encrypted `confidentialTransfer(address,bytes32,bytes)` with input proofs, plus extension recipes: visible/confidential mint & burn, and owner-visible total supply via an `_update` override with `FHE.allow(confidentialTotalSupply(), owner())`.
Lending relevance: cUSDCMock/cWETHMock implement this exact standard — the transfer/mint/burn signatures here are what your lending pool calls; the mint/burn recipes map directly to issuing/burning confidential receipt (aToken-style) or debt tokens.

# ERC7984 Standard

This tutorial explains how to create a confidential fungible token using Fully Homomorphic Encryption (FHE) and the OpenZeppelin smart contract library. By following this guide, you will learn how to build a token where balances and transactions remain encrypted while maintaining full functionality.

### Why FHE for confidential tokens?

Confidential tokens make sense in many real-world scenarios:

* **Privacy**: Users can transact without revealing their exact balances or transaction amounts
* **Regulatory Compliance**: Maintains privacy while allowing for selective disclosure when needed
* **Business Intelligence**: Companies can keep their token holdings private from competitors
* **Personal Privacy**: Individuals can participate in DeFi without exposing their financial position
* **Audit Trail**: All transactions are still recorded on-chain, just in encrypted form

FHE enables these benefits by allowing computations on encrypted data without decryption, ensuring privacy while maintaining the security and transparency of blockchain.

## Project Setup

Before starting this tutorial, ensure you have:

1. Installed the [FHEVM Hardhat template](https://github.com/zama-ai/fhevm-hardhat-template)
2. Set up the [OpenZeppelin confidential contracts library](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts). (For guidance on this, follow the [Setting up OpenZeppelin confidential contracts tutorial](/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md).)

### Understanding the architecture

Our confidential token will inherit from several key contracts:

1. **`ERC7984`** - OpenZeppelin's base for confidential tokens
2. **`Ownable2Step`** - Access control for minting and administrative functions
3. **`ZamaEthereumConfig`** - FHE configuration for the Ethereum mainnet or Ethereum Sepolia testnet networks

### The base smart contract

Let's create our confidential token contract in `contracts/ERC7984Example.sol`. This contract will demonstrate the core functionality of ERC7984 tokens.

A few key points about this implementation:

* The contract mints an initial supply with a clear (non-encrypted) amount during deployment
* The initial mint is done once during construction, establishing the token's total supply
* All subsequent transfers will be fully encrypted, preserving privacy
* The contract inherits from ERC7984 for confidential token functionality and Ownable2Step for secure access control

While this example uses a clear initial mint for simplicity, in production you may want to consider:

* Using encrypted minting for complete privacy from genesis
* Implementing a more sophisticated minting schedule
* Overriding some privacy assumptions

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="ERC7984Example.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

contract ERC7984Example is ZamaEthereumConfig, ERC7984, Ownable2Step {
    constructor(
        address owner,
        uint64 amount,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) Ownable(owner) {
        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(owner, encryptedAmount);
    }
}

```

{% endtab %}

{% tab title="confToken.test.ts" %}

```typescript
import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';

describe('ERC7984Example', function () {
  let token: any;
  let owner: any;
  let recipient: any;
  let other: any;

  const INITIAL_AMOUNT = 1000;
  const TRANSFER_AMOUNT = 100;

  beforeEach(async function () {
    [owner, recipient, other] = await ethers.getSigners();

    // Deploy ERC7984Example contract
    token = await ethers.deployContract('ERC7984Example', [
      owner.address,
      INITIAL_AMOUNT,
      'Confidential Token',
      'CTKN',
      'https://example.com/token'
    ]);
  });

  describe('Initialization', function () {
    it('should set the correct name', async function () {
      expect(await token.name()).to.equal('Confidential Token');
    });

    it('should set the correct symbol', async function () {
      expect(await token.symbol()).to.equal('CTKN');
    });

    it('should set the correct contract URI', async function () {
      expect(await token.contractURI()).to.equal('https://example.com/token');
    });

    it('should mint initial amount to owner', async function () {
      // Verify that the owner has a balance (without decryption for now)
      const balanceHandle = await token.confidentialBalanceOf(owner.address);
      expect(balanceHandle).to.not.be.undefined;
    });
  });

  describe('Transfer Process', function () {
    it('should transfer tokens from owner to recipient', async function () {
      // Create encrypted input for transfer amount
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      // Perform the transfer
      await expect(token
        .connect(owner)
        ['confidentialTransfer(address,bytes32,bytes)'](
          recipient.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )).to.not.be.reverted;

      // Check that both addresses have balance handles (without decryption for now)
      const recipientBalanceHandle = await token.confidentialBalanceOf(recipient.address);
      const ownerBalanceHandle = await token.confidentialBalanceOf(owner.address);
      expect(recipientBalanceHandle).to.not.be.undefined;
      expect(ownerBalanceHandle).to.not.be.undefined;
    });

    it('should allow recipient to transfer received tokens', async function () {
      // First transfer from owner to recipient
      const encryptedInput1 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      await expect(token
        .connect(owner)
        ['confidentialTransfer(address,bytes32,bytes)'](
          recipient.address,
          encryptedInput1.handles[0],
          encryptedInput1.inputProof
        )).to.not.be.reverted;

      // Second transfer from recipient to other
      const encryptedInput2 = await fhevm
        .createEncryptedInput(await token.getAddress(), recipient.address)
        .add64(50) // Transfer half of what recipient received
        .encrypt();

      await expect(token
        .connect(recipient)
        ['confidentialTransfer(address,bytes32,bytes)'](
          other.address,
          encryptedInput2.handles[0],
          encryptedInput2.inputProof
        )).to.not.be.reverted;

      // Check that all addresses have balance handles (without decryption for now)
      const otherBalanceHandle = await token.confidentialBalanceOf(other.address);
      const recipientBalanceHandle = await token.confidentialBalanceOf(recipient.address);
      expect(otherBalanceHandle).to.not.be.undefined;
      expect(recipientBalanceHandle).to.not.be.undefined;
    });

    it('should revert when trying to transfer more than balance', async function () {
      const excessiveAmount = INITIAL_AMOUNT + 100;
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), recipient.address)
        .add64(excessiveAmount)
        .encrypt();

      await expect(
        token
          .connect(recipient)
          ['confidentialTransfer(address,bytes32,bytes)'](
            other.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWithCustomError(token, 'ERC7984ZeroBalance')
        .withArgs(recipient.address);
    });

    it('should revert when transferring to zero address', async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      await expect(
        token
          .connect(owner)
          ['confidentialTransfer(address,bytes32,bytes)'](
            ethers.ZeroAddress,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWithCustomError(token, 'ERC7984InvalidReceiver')
        .withArgs(ethers.ZeroAddress);
    });
  });
});

```

{% endtab %}
{% endtabs %}

### Test workflow

To run the tests, use:

```bash
npx hardhat test test/ERC7984Example.test.ts
```

### Advanced features and extensions

The basic ERC7984Example contract provides core functionality, but you can extend it with additional features. For example:

#### Minting functions

**Visible Mint** - Allows the owner to mint tokens with a clear amount:

```solidity
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }
```

* **When to use**: Prefer this for public/tokenomics-driven mints where transparency is desired (e.g., scheduled emissions).
* **Privacy caveat**: The minted amount is visible in calldata and events; use `confidentialMint` for privacy.
* **Access control**: Consider replacing `onlyOwner` with role-based access via `AccessControl` (e.g., `MINTER_ROLE`) for multi-signer workflows.
* **Supply caps**: If you need a hard cap, add a check before `_mint` and enforce it consistently for both visible and confidential flows.

**Confidential Mint** - Allows minting with encrypted amounts for enhanced privacy:

```solidity
    function confidentialMint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 transferred) {
        return _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
    }
```

* **Inputs**: `encryptedAmount` and `inputProof` are produced off-chain with the SDK. Always validate and revert on malformed inputs.
* **Gas considerations**: Confidential operations cost more gas; batch mints sparingly and prefer fewer larger mints to reduce overhead.
* **Auditing**: While amounts stay private, you still get a verifiable audit trail of mints (timestamps, sender, recipient).
* **Example (Hardhat SDK)**:

```ts
const enc = await fhevm
  .createEncryptedInput(await token.getAddress(), owner.address)
  .add64(1_000)
  .encrypt();

await token.confidentialMint(recipient.address, enc.handles[0], enc.inputProof);
```

#### Burning functions

**Visible Burn** - Allows the owner to burn tokens with a clear amount:

```solidity
    function burn(address from, uint64 amount) external onlyOwner {
        _burn(from, FHE.asEuint64(amount));
    }
```

**Confidential Burn** - Allows burning with encrypted amounts:

```solidity
    function confidentialBurn(
        address from,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 transferred) {
        return _burn(from, FHE.fromExternal(encryptedAmount, inputProof));
    }
```

* **Authorization**: Burning from arbitrary accounts is powerful; consider stronger controls (roles, multisig, timelocks) or user-consented burns.
* **Event strategy**: Decide whether to emit custom events revealing intent (not amounts) for better observability and offchain indexing.
* **Error surfaces**: Expect balance/allowance-like failures if encrypted amount exceeds balance; test both success and revert paths.
* **Example (Hardhat SDK)**:

```ts
const enc = await fhevm
  .createEncryptedInput(await token.getAddress(), owner.address)
  .add64(250)
  .encrypt();

await token.confidentialBurn(holder.address, enc.handles[0], enc.inputProof);
```

#### Total supply visibility

If you want the owner to be able to view the total supply (useful for administrative purposes):

```solidity
    function _update(address from, address to, euint64 amount) internal virtual override returns (euint64 transferred) {
        transferred = super._update(from, to, amount);
        FHE.allow(confidentialTotalSupply(), owner());
    }
```

* **What this does**: Grants the `owner` permission to decrypt the latest total supply handle after every state-changing update.
* **Operational model**: The owner can call `confidentialTotalSupply()` and use their off-chain key material to decrypt the returned handle.
* **Security considerations**:
  * If ownership changes, ensure only the new owner can decrypt going forward. With `Ownable2Step`, this function will automatically allow the current `owner()`.
  * Be mindful of compliance: granting supply visibility may be considered privileged access; document who holds the key and why.
* **Alternatives**: If you want organization-wide access, grant via a dedicated admin contract that holds decryption authority instead of a single EOA.

---

## B.2 ERC-20 → Wrapped ERC-7984 (`ERC7984ERC20WrapperExample`)

Source: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/erc7984erc20wrappermock.md
Pattern: wrapping a public ERC-20 into a confidential ERC-7984 in two steps — `SafeERC20.safeTransferFrom` in, confidential mint out — via OZ's `ERC7984ERC20Wrapper` extension; test deploys an `ERC20Mock` underlying.
Lending relevance: this is the contract family behind the registry's cUSDCMock/cWETHMock (mint underlying mock → approve wrapper → wrap). Your users convert public test USDC/WETH into confidential form this way before depositing into the lending pool.

# ERC-20 to Wrapped ERC-7984

Swapping from a non-confidential ERC-20 to a confidential ERC-7984 is simple and actually done within the `ERC7984ERC20Wrapper`. The wrapper operates in two steps:

1. **Token transfer**: The ERC-20 tokens are transferred in from the caller using `SafeERC20.safeTransferFrom()`, reverting automatically if unsuccessful.
2. **Confidential minting**: The contract mints equivalent ERC-7984 tokens to the recipient, which is guaranteed to succeed.

This example demonstrates how to deploy and test the wrapper using OpenZeppelin's smart contract library powered by ZAMA's FHEVM.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="ERC7984ERC20WrapperExample.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984ERC20Wrapper, ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

contract ERC7984ERC20WrapperExample is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(
        IERC20 token,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984ERC20Wrapper(token) ERC7984(name, symbol, uri) {}
}

```

{% endtab %}

{% tab title="ERC7984Wrapper.test.ts" %}

```typescript
import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';

describe('ERC7984ERC20WrapperExample', function () {
  let wrapper: any;
  let erc20: any;
  let owner: any;
  let user: any;

  const WRAP_AMOUNT = 1000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token (OZ ERC20Mock takes name, symbol, decimals)
    erc20 = await ethers.deployContract('ERC20Mock', ['Test ERC20', 'TERC', 18]);

    // Deploy the wrapper
    wrapper = await ethers.deployContract('ERC7984ERC20WrapperExample', [
      await erc20.getAddress(),
      'Confidential Token',
      'cTKN',
      'https://example.com/wrapped'
    ]);
  });

  describe('Initialization', function () {
    it('should set the correct name', async function () {
      expect(await wrapper.name()).to.equal('Confidential Token');
    });

    it('should set the correct symbol', async function () {
      expect(await wrapper.symbol()).to.equal('cTKN');
    });

    it('should reference the correct underlying token', async function () {
      expect(await wrapper.underlying()).to.equal(await erc20.getAddress());
    });
  });
});

```

{% endtab %}
{% endtabs %}

---

## B.3 Swap ERC7984 → ERC20 (`SwapERC7984ToERC20`)

Source: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/erc7984/swaperc7984toerc20.md
Pattern: operator + `confidentialTransferFrom` composition — `FHE.fromExternal` the amount, `FHE.allowTransient(amount, token)` so the token contract may consume the ciphertext, pull tokens in, then a two-step async exit: `FHE.makePubliclyDecryptable(amountTransferred)` and key a `_receivers[handle]` mapping, finalized later with `FHE.checkSignatures` + `SafeERC20.safeTransfer` of the cleartext amount.
Lending relevance: the canonical withdrawal/redemption pattern from confidential to public tokens, and the general template for ANY contract that pulls user funds via `confidentialTransferFrom` — your lending pool's deposit and liquidation paths reuse this transient-allow + transferFrom composition.

# Swap ERC7984 to ERC20

Swapping from a confidential token to a non-confidential token is the most complex since the decrypted data must be accessed to accurately complete the request. This example demonstrates unwrapping a confidential ERC-7984 token back to a non-confidential ERC-20 token using a **1:1 exchange ratio** with OpenZeppelin's smart contract library powered by ZAMA's FHEVM.

{% hint style="info" %}
This is a simplified example using a 1:1 exchange ratio. The swap requires a two-step process: first the confidential transfer, then a finalization step after the encrypted amount has been decrypted.
{% endhint %}

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="SwapERC7984ToERC20.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

contract SwapERC7984ToERC20 {
    error SwapERC7984ToERC20InvalidFinalization(euint64 amount);

    mapping(euint64 amount => address) private _receivers;
    IERC7984 private _fromToken;
    IERC20 private _toToken;

    constructor(IERC7984 fromToken, IERC20 toToken) {
        _fromToken = fromToken;
        _toToken = toToken;
    }

    function swapConfidentialToERC20(externalEuint64 encryptedInput, bytes memory inputProof) public {
        euint64 amount = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowTransient(amount, address(_fromToken));
        euint64 amountTransferred = _fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.makePubliclyDecryptable(amountTransferred);
        _receivers[amountTransferred] = msg.sender;
    }

    function finalizeSwap(euint64 amount, uint64 cleartextAmount, bytes calldata decryptionProof) public virtual {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(amount);

        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);
        address to = _receivers[amount];
        require(to != address(0), SwapERC7984ToERC20InvalidFinalization(amount));
        delete _receivers[amount];

        if (cleartextAmount != 0) {
            SafeERC20.safeTransfer(_toToken, to, cleartextAmount);
        }
    }
}

```

{% endtab %}

{% tab title="ERC7984Wrapper.test.ts" %}

```typescript
import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';

describe('ERC7984ERC20WrapperExample', function () {
  let wrapper: any;
  let erc20: any;
  let owner: any;
  let user: any;

  const WRAP_AMOUNT = 1000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token (OZ ERC20Mock takes name, symbol, decimals)
    erc20 = await ethers.deployContract('ERC20Mock', ['Test ERC20', 'TERC', 18]);

    // Deploy the wrapper
    wrapper = await ethers.deployContract('ERC7984ERC20WrapperExample', [
      await erc20.getAddress(),
      'Confidential Token',
      'cTKN',
      'https://example.com/wrapped'
    ]);
  });

  describe('Initialization', function () {
    it('should set the correct name', async function () {
      expect(await wrapper.name()).to.equal('Confidential Token');
    });

    it('should set the correct symbol', async function () {
      expect(await wrapper.symbol()).to.equal('cTKN');
    });

    it('should reference the correct underlying token', async function () {
      expect(await wrapper.underlying()).to.equal(await erc20.getAddress());
    });
  });
});

```

{% endtab %}
{% endtabs %}

---

## B.4 Vesting Wallet (`VestingWalletExample`)

Source: https://docs.zama.org/protocol/examples/openzeppelin-confidential-contracts/vesting-wallet.md
Pattern: time-based release of encrypted amounts — linear `_vestingSchedule` over cleartext timestamps applied to encrypted totals (`FHE.mul`/`FHE.div`), non-negative clamping via `FHE.ge` + `FHE.select` (releasable = max(vested − released, 0)), euint128 accounting with euint64 transfers, `FHE.allowTransient` before `confidentialTransfer`, and `ReentrancyGuardTransient`.
Lending relevance: the closest official template for interest-accrual math over time and for the "withdraw min(requested, available)" clamp every lending protocol needs — the select-clamp here is the same trick used to cap repayments and prevent encrypted-value underflow.

# Vesting Wallet

This example demonstrates how to create a vesting wallet using OpenZeppelin's smart contract library powered by ZAMA's FHEVM.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="VestingWalletExample.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/**
 * @title VestingWalletExample
 * @dev A simple example demonstrating how to create a vesting wallet for ERC7984 tokens
 *
 * This contract shows how to create a vesting wallet that receives ERC7984 tokens
 * and releases them to the beneficiary according to a confidential, linear vesting schedule.
 *
 * This is a non-upgradeable version for demonstration purposes.
 */
contract VestingWalletExample is Ownable, ReentrancyGuardTransient, ZamaEthereumConfig {
    mapping(address token => euint128) private _tokenReleased;
    uint64 private _start;
    uint64 private _duration;

    /// @dev Emitted when releasable vested tokens are released.
    event VestingWalletConfidentialTokenReleased(address indexed token, euint64 amount);

    constructor(
        address beneficiary,
        uint48 startTimestamp,
        uint48 durationSeconds
    ) Ownable(beneficiary) {
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /// @dev Timestamp at which the vesting starts.
    function start() public view virtual returns (uint64) {
        return _start;
    }

    /// @dev Duration of the vesting in seconds.
    function duration() public view virtual returns (uint64) {
        return _duration;
    }

    /// @dev Timestamp at which the vesting ends.
    function end() public view virtual returns (uint64) {
        return start() + duration();
    }

    /// @dev Amount of token already released
    function released(address token) public view virtual returns (euint128) {
        return _tokenReleased[token];
    }

    /**
     * @dev Getter for the amount of releasable `token` tokens. `token` should be the address of an
     * {IERC7984} contract.
     */
    function releasable(address token) public virtual returns (euint64) {
        euint128 vestedAmount_ = vestedAmount(token, uint48(block.timestamp));
        euint128 releasedAmount = released(token);
        ebool success = FHE.ge(vestedAmount_, releasedAmount);
        return FHE.select(success, FHE.asEuint64(FHE.sub(vestedAmount_, releasedAmount)), FHE.asEuint64(0));
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {VestingWalletConfidentialTokenReleased} event.
     */
    function release(address token) public virtual nonReentrant {
        euint64 amount = releasable(token);
        FHE.allowTransient(amount, token);
        euint64 amountSent = IERC7984(token).confidentialTransfer(owner(), amount);

        // This could overflow if the total supply is resent `type(uint128).max/type(uint64).max` times. This is an accepted risk.
        euint128 newReleasedAmount = FHE.add(released(token), amountSent);
        FHE.allow(newReleasedAmount, owner());
        FHE.allowThis(newReleasedAmount);
        _tokenReleased[token] = newReleasedAmount;
        emit VestingWalletConfidentialTokenReleased(token, amountSent);
    }

    /**
     * @dev Calculates the amount of tokens that have been vested at the given timestamp.
     * Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint48 timestamp) public virtual returns (euint128) {
        return _vestingSchedule(FHE.add(released(token), IERC7984(token).confidentialBalanceOf(address(this))), timestamp);
    }

    /// @dev This returns the amount vested, as a function of time, for an asset given its total historical allocation.
    function _vestingSchedule(euint128 totalAllocation, uint48 timestamp) internal virtual returns (euint128) {
        if (timestamp < start()) {
            return euint128.wrap(0);
        } else if (timestamp >= end()) {
            return totalAllocation;
        } else {
            return FHE.div(FHE.mul(totalAllocation, (timestamp - start())), duration());
        }
    }
}

```

{% endtab %}

{% tab title="VestingWallet.test.ts" %}

```typescript
import { expect } from 'chai';
import { ethers, fhevm } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('VestingWalletExample', function () {
  let vestingWallet: any;
  let token: any;
  let owner: any;
  let beneficiary: any;
  let other: any;

  const VESTING_AMOUNT = 1000;
  const VESTING_DURATION = 60 * 60; // 1 hour in seconds

  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    [owner, beneficiary, other] = accounts;

    // Deploy ERC7984 mock token
    token = await ethers.deployContract('ERC7984Mock', [
      'TestToken',
      'TT',
      'https://example.com/metadata'
    ]);

    // Get current time and set vesting to start in 1 minute
    const currentTime = await time.latest();
    const startTime = currentTime + 60;

    // Deploy and initialize vesting wallet in one step
    vestingWallet = await ethers.deployContract('VestingWalletExample', [
      beneficiary.address,
      startTime,
      VESTING_DURATION
    ]);

    // Mint tokens to the vesting wallet
    const encryptedInput = await fhevm
      .createEncryptedInput(await token.getAddress(), owner.address)
      .add64(VESTING_AMOUNT)
      .encrypt();

    await token
      .connect(owner)
      ['mint(address,bytes32,bytes)'](
        vestingWallet.target,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
  });

  describe('Vesting Schedule', function () {
    it('should not release tokens before vesting starts', async function () {
      // Just verify the contract can be called without FHEVM decryption for now
      await expect(vestingWallet.connect(beneficiary).release(await token.getAddress()))
        .to.not.be.reverted;
    });

    it('should release half the tokens at midpoint', async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 60;
      const midpoint = startTime + (VESTING_DURATION / 2);

      await time.increaseTo(midpoint);
      // Just verify the contract can be called without FHEVM decryption for now
      await expect(vestingWallet.connect(beneficiary).release(await token.getAddress()))
        .to.not.be.reverted;
    });

    it('should release all tokens after vesting ends', async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 60;
      const endTime = startTime + VESTING_DURATION + 1000;

      await time.increaseTo(endTime);
      // Just verify the contract can be called without FHEVM decryption for now
      await expect(vestingWallet.connect(beneficiary).release(await token.getAddress()))
        .to.not.be.reverted;
    });
  });
});

```

{% endtab %}
{% endtabs %}

---

# PART C — Sealed-bid auction (full dApp example)

## C.1 Sealed-Bid Auction (`BlindAuction`) — contract + tests + fixture

Source: https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction.md
Pattern: a complete confidential dApp — encrypted deposits via operator (`setOperator`) + `confidentialTransferFrom` measured with balance-before/after (transfers of insufficient funds silently move 0, never revert), incremental encrypted bids, encrypted running max via `FHE.lt` + `FHE.select` over euint64/eaddress, then the decrypt-winner flow: `FHE.makePubliclyDecryptable` → relayer `publicDecrypt` → `resolveAuction` with `FHE.checkSignatures`, followed by claims/refunds that reset encrypted state and use `FHE.allowTransient` for payouts.
Lending relevance: the closest end-to-end analogue to a lending protocol — encrypted user deposits held by a pool contract, encrypted comparisons across users, a single public reveal, and refund paths; also demonstrates the operator-approval UX (`setOperator` with expiry timestamp) your depositors must perform.

# Sealed-Bid Auction

This contract is an example of a confidential sealed-bid auction built with FHEVM. Refer to the [Tutorial](/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md) to learn how it is implemented step by step.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="BlindAuction.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, eaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title BlindAuction
/// @notice A sealed-bid NFT auction using FHE. Bids remain encrypted during the auction,
///         and only the winner is revealed via public decryption after the auction ends.
contract BlindAuction is ZamaEthereumConfig, ReentrancyGuard, IERC721Receiver {
    /// @notice The recipient of the highest bid once the auction ends
    address public beneficiary;

    /// @notice Confidential payment token (ERC7984)
    IERC7984 public confidentialToken;

    /// @notice NFT prize for the auction
    IERC721 public nftContract;
    uint256 public tokenId;

    /// @notice Auction duration
    uint256 public auctionStartTime;
    uint256 public auctionEndTime;

    /// @notice Encrypted auction state
    euint64 private highestBid;
    eaddress private winningAddress;

    /// @notice Winner address, set after decryption and verification
    address public winnerAddress;

    /// @notice Whether the NFT prize has been claimed
    bool public isNftClaimed;

    /// @notice Whether decryption has been requested
    bool public decryptionRequested;

    /// @notice Mapping from bidder to their encrypted bid amount
    mapping(address account => euint64 bidAmount) private bids;

    // ========== Errors ==========

    error TooEarlyError(uint256 time);
    error TooLateError(uint256 time);
    error WinnerNotYetRevealed();

    // ========== Events ==========

    /// @notice Emitted when decryption of the winning address is requested.
    event AuctionDecryptionRequested(eaddress encryptedWinningAddress);

    // ========== Modifiers ==========

    modifier onlyDuringAuction() {
        if (block.timestamp < auctionStartTime) revert TooEarlyError(auctionStartTime);
        if (block.timestamp >= auctionEndTime) revert TooLateError(auctionEndTime);
        _;
    }

    modifier onlyAfterEnd() {
        if (block.timestamp < auctionEndTime) revert TooEarlyError(auctionEndTime);
        _;
    }

    modifier onlyAfterWinnerRevealed() {
        if (winnerAddress == address(0)) revert WinnerNotYetRevealed();
        _;
    }

    // ========== Views ==========

    function getEncryptedBid(address account) external view returns (euint64) {
        return bids[account];
    }

    function getEncryptedWinningAddress() external view returns (eaddress) {
        return winningAddress;
    }

    function getWinnerAddress() external view returns (address) {
        require(winnerAddress != address(0), "Winning address has not been decided yet");
        return winnerAddress;
    }

    // ========== Constructor ==========

    constructor(
        address _nftContractAddress,
        address _confidentialTokenAddress,
        uint256 _tokenId,
        uint256 _auctionStartTime,
        uint256 _auctionEndTime
    ) {
        beneficiary = msg.sender;
        confidentialToken = IERC7984(_confidentialTokenAddress);
        nftContract = IERC721(_nftContractAddress);
        tokenId = _tokenId;

        // Transfer the NFT to the contract for the auction
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        require(_auctionStartTime < _auctionEndTime, "INVALID_TIME");
        auctionStartTime = _auctionStartTime;
        auctionEndTime = _auctionEndTime;
    }

    /// @dev Required to receive ERC721 tokens via safeTransferFrom.
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ========== Auction Logic ==========

    /// @notice Place an encrypted bid. The caller must have set the auction contract as an operator
    ///         on the confidential token beforehand.
    function bid(externalEuint64 encryptedAmount, bytes calldata inputProof) public onlyDuringAuction nonReentrant {
        // Get and verify the amount from the user
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer the confidential token as payment
        euint64 balanceBefore = confidentialToken.confidentialBalanceOf(address(this));
        FHE.allowTransient(amount, address(confidentialToken));
        confidentialToken.confidentialTransferFrom(msg.sender, address(this), amount);
        euint64 balanceAfter = confidentialToken.confidentialBalanceOf(address(this));
        euint64 sentBalance = FHE.sub(balanceAfter, balanceBefore);

        // Update the bid balance (supports incremental bids)
        euint64 previousBid = bids[msg.sender];
        if (FHE.isInitialized(previousBid)) {
            euint64 newBid = FHE.add(previousBid, sentBalance);
            bids[msg.sender] = newBid;
        } else {
            bids[msg.sender] = sentBalance;
        }

        // Compare the total value of the user against the highest bid
        euint64 currentBid = bids[msg.sender];
        FHE.allowThis(currentBid);
        FHE.allow(currentBid, msg.sender);

        if (FHE.isInitialized(highestBid)) {
            ebool isNewWinner = FHE.lt(highestBid, currentBid);
            highestBid = FHE.select(isNewWinner, currentBid, highestBid);
            winningAddress = FHE.select(isNewWinner, FHE.asEaddress(msg.sender), winningAddress);
        } else {
            highestBid = currentBid;
            winningAddress = FHE.asEaddress(msg.sender);
        }
        FHE.allowThis(highestBid);
        FHE.allowThis(winningAddress);
    }

    // ========== Resolution ==========

    /// @notice Request decryption of the winning address. Can only be called after the auction ends.
    function decryptWinningAddress() public onlyAfterEnd {
        require(!decryptionRequested, "Decryption already requested");
        decryptionRequested = true;
        FHE.makePubliclyDecryptable(winningAddress);
        emit AuctionDecryptionRequested(winningAddress);
    }

    /// @notice Verify the decryption proof and store the winner.
    /// @param abiEncodedClearResult The ABI-encoded clear address from the decryption.
    /// @param decryptionProof The proof validating the decryption.
    function resolveAuction(bytes memory abiEncodedClearResult, bytes memory decryptionProof) public {
        require(decryptionRequested, "Decryption not requested");
        require(winnerAddress == address(0), "Winner already resolved");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(winningAddress);
        FHE.checkSignatures(cts, abiEncodedClearResult, decryptionProof);

        address resultWinnerAddress = abi.decode(abiEncodedClearResult, (address));
        winnerAddress = resultWinnerAddress;
    }

    // ========== Claims & Withdrawals ==========

    /// @notice Winner claims the NFT prize. Transfers the highest bid to the beneficiary.
    function winnerClaimPrize() public onlyAfterWinnerRevealed {
        require(winnerAddress == msg.sender, "Only winner can claim item");
        require(!isNftClaimed, "NFT has already been claimed");
        isNftClaimed = true;

        // Reset bid value
        bids[msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(bids[msg.sender]);
        FHE.allow(bids[msg.sender], msg.sender);

        // Transfer the highest bid to the beneficiary
        FHE.allowTransient(highestBid, address(confidentialToken));
        confidentialToken.confidentialTransfer(beneficiary, highestBid);

        // Send the NFT to the winner
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Non-winning bidders withdraw their bid. Cannot be called by the winner.
    function withdraw(address bidder) public onlyAfterWinnerRevealed {
        if (bidder == winnerAddress) revert TooLateError(auctionEndTime);

        euint64 amount = bids[bidder];
        FHE.allowTransient(amount, address(confidentialToken));

        // Reset user bid value
        euint64 newBid = FHE.asEuint64(0);
        bids[bidder] = newBid;
        FHE.allowThis(newBid);
        FHE.allow(newBid, bidder);

        // Refund the user with their bid amount
        confidentialToken.confidentialTransfer(bidder, amount);
    }
}

```

{% endtab %}

{% tab title="BlindAuction.ts" %}

```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import * as hre from "hardhat";

import { deployBlindAuctionFixture } from "./BlindAuction.fixture";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("BlindAuction", function () {
  let signers: Signers;
  let USDCc: any;
  let prizeItem: any;
  let blindAuction: any;
  let USDCcAddress: string;
  let prizeItemAddress: string;
  let blindAuctionAddress: string;

  // Helper: get decrypted USDCc balance for a signer
  async function getUSDCcBalance(signer: HardhatEthersSigner): Promise<number> {
    const encryptedBalance = await USDCc.confidentialBalanceOf(signer.address);
    return await hre.fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, USDCcAddress, signer);
  }

  // Helper: encrypt a bid amount
  async function encryptBid(targetContract: string, userAddress: string, amount: number) {
    const bidInput = hre.fhevm.createEncryptedInput(targetContract, userAddress);
    bidInput.add64(amount);
    return await bidInput.encrypt();
  }

  // Helper: approve the auction contract as an operator
  async function approve(signer: HardhatEthersSigner) {
    const approveTx = await USDCc.connect(signer).setOperator(
      blindAuctionAddress,
      Math.floor(Date.now() / 1000) + 60 * 60,
    );
    await approveTx.wait();
  }

  // Helper: place a bid
  async function placeBid(signer: HardhatEthersSigner, amount: number) {
    const encryptedBid = await encryptBid(blindAuctionAddress, signer.address, amount);
    const bidTx = await blindAuction.connect(signer).bid(encryptedBid.handles[0], encryptedBid.inputProof);
    await bidTx.wait();
  }

  // Helper: mint USDCc tokens
  async function mintUSDCc(signer: HardhatEthersSigner, amount: number) {
    const mintTx = await USDCc.mint(signer.address, amount);
    await mintTx.wait();
  }

  // Helper: resolve the auction using public decryption
  async function resolveAuctionViaPublicDecrypt() {
    // Request decryption of the winning address
    const tx = await blindAuction.decryptWinningAddress();
    const receipt = await tx.wait();

    // Parse the AuctionDecryptionRequested event to get the encrypted handle
    let encryptedWinningAddress: string | undefined;
    for (const log of receipt!.logs) {
      const parsed = blindAuction.interface.parseLog(log);
      if (parsed && parsed.name === "AuctionDecryptionRequested") {
        encryptedWinningAddress = parsed.args.encryptedWinningAddress;
        break;
      }
    }
    expect(encryptedWinningAddress).to.not.be.undefined;

    // Call the Zama Relayer to compute the decryption
    const publicDecryptResults = await fhevm.publicDecrypt([encryptedWinningAddress!]);

    // Forward the decryption result to the contract for on-chain verification
    await blindAuction.resolveAuction(
      publicDecryptResults.abiEncodedClearValues,
      publicDecryptResults.decryptionProof,
    );
  }

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    const deployment = await deployBlindAuctionFixture(signers.owner);

    USDCc = deployment.USDCc;
    prizeItem = deployment.prizeItem;
    blindAuction = deployment.blindAuction;

    USDCcAddress = deployment.USDCc_address;
    prizeItemAddress = deployment.prizeItem_address;
    blindAuctionAddress = deployment.blindAuction_address;
  });

  it("should mint confidential USDC", async function () {
    const aliceSigner = signers.alice;
    const aliceAddress = aliceSigner.address;

    // Check initial balance
    const initialEncryptedBalance = await USDCc.confidentialBalanceOf(aliceAddress);

    // Mint some confidential USDC
    await mintUSDCc(aliceSigner, 1_000_000);

    // Check balance after minting
    const finalEncryptedBalance = await USDCc.confidentialBalanceOf(aliceAddress);

    // The balance should be different (not zero)
    expect(finalEncryptedBalance).to.not.equal(initialEncryptedBalance);
  });

  it("should place an encrypted bid", async function () {
    const aliceSigner = signers.alice;
    const aliceAddress = aliceSigner.address;

    // Mint some confidential USDC
    await mintUSDCc(aliceSigner, 1_000_000);

    // Bid amount
    const bidAmount = 10_000;

    await approve(aliceSigner);
    await placeBid(aliceSigner, bidAmount);

    // Check payment transfer
    const aliceClearBalance = await getUSDCcBalance(aliceSigner);
    expect(aliceClearBalance).to.equal(1_000_000 - bidAmount);

    // Check bid value
    const aliceEncryptedBid = await blindAuction.getEncryptedBid(aliceAddress);
    const aliceClearBid = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceEncryptedBid,
      blindAuctionAddress,
      aliceSigner,
    );
    expect(aliceClearBid).to.equal(bidAmount);
  });

  it("bob should win auction", async function () {
    const aliceSigner = signers.alice;
    const bobSigner = signers.bob;
    const beneficiary = signers.owner;

    // Mint some confidential USDC
    await mintUSDCc(aliceSigner, 1_000_000);
    await mintUSDCc(bobSigner, 1_000_000);

    // Alice bids 10,000
    await approve(aliceSigner);
    await placeBid(aliceSigner, 10_000);

    // Bob bids 15,000
    await approve(bobSigner);
    await placeBid(bobSigner, 15_000);

    // Wait for auction to end
    await time.increase(3600);

    // Resolve the auction via public decryption
    await resolveAuctionViaPublicDecrypt();

    // Verify the winner is Bob
    expect(await blindAuction.getWinnerAddress()).to.be.equal(bobSigner.address);

    // Bob cannot withdraw (he is the winner)
    await expect(blindAuction.withdraw(bobSigner.address)).to.be.reverted;

    // Claim NFT Prize
    expect(await prizeItem.ownerOf(await blindAuction.tokenId())).to.be.equal(blindAuctionAddress);
    await blindAuction.connect(bobSigner).winnerClaimPrize();
    expect(await prizeItem.ownerOf(await blindAuction.tokenId())).to.be.equal(bobSigner.address);

    // Refund Alice
    const aliceBalanceBefore = await getUSDCcBalance(aliceSigner);
    await blindAuction.withdraw(aliceSigner.address);
    const aliceBalanceAfter = await getUSDCcBalance(aliceSigner);
    expect(aliceBalanceAfter).to.be.equal(aliceBalanceBefore + 10_000n);

    // Bob still cannot withdraw
    await expect(blindAuction.withdraw(bobSigner.address)).to.be.reverted;

    // Check beneficiary received the highest bid
    const beneficiaryBalance = await getUSDCcBalance(beneficiary);
    expect(beneficiaryBalance).to.be.equal(15_000);
  });
});

```

{% endtab %}

{% tab title="BlindAuction.fixture.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

import { ConfidentialTokenExample, PrizeItem, BlindAuction } from "../../../typechain-types";
import { ConfidentialTokenExample__factory, PrizeItem__factory, BlindAuction__factory } from "../../../typechain-types";

export async function deployBlindAuctionFixture(owner: HardhatEthersSigner) {
  const [deployer] = await ethers.getSigners();

  // Create Confidential ERC7984 token (used for bids)
  const USDCcFactory = (await ethers.getContractFactory(
    "ConfidentialTokenExample",
  )) as ConfidentialTokenExample__factory;
  const USDCc = (await USDCcFactory.deploy(0, "USDCc", "USDCc", "")) as ConfidentialTokenExample;
  const USDCc_address = await USDCc.getAddress();

  // Create NFT Prize
  const PrizeItemFactory = (await ethers.getContractFactory("PrizeItem")) as PrizeItem__factory;
  const prizeItem = (await PrizeItemFactory.deploy()) as PrizeItem;
  const prizeItem_address = await prizeItem.getAddress();

  // Mint a Prize NFT (tokenId = 0)
  const mintTx = await prizeItem.newItem();
  await mintTx.wait();

  const nonce = await deployer.getNonce();

  // Precompute the address of the BlindAuction contract so we can approve it
  const precomputedBlindAuctionAddress = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce + 1,
  });

  // Approve the BlindAuction to transfer the NFT
  const approveTx = await prizeItem.approve(precomputedBlindAuctionAddress, 0);
  await approveTx.wait();

  // Deploy BlindAuction (starts now, ends in 1 hour)
  const BlindAuctionFactory = (await ethers.getContractFactory("BlindAuction")) as BlindAuction__factory;
  const blindAuction = (await BlindAuctionFactory.deploy(
    prizeItem_address,
    USDCc_address,
    0,
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000) + 60 * 60,
  )) as BlindAuction;
  const blindAuction_address = await blindAuction.getAddress();

  return { USDCc, USDCc_address, prizeItem, prizeItem_address, blindAuction, blindAuction_address };
}

```

{% endtab %}
{% endtabs %}

---

## C.2 Sealed-Bid Auction — step-by-step tutorial

Source: https://docs.zama.org/protocol/examples/auctions/sealed-bid-auction/sealed-bid-auction-tutorial.md
Pattern: narrative walkthrough of BlindAuction explaining the WHY: ERC7984 instead of ERC20 so amounts never leak from calldata; FHE ops never revert on encrypted conditions — use `FHE.select` branching instead; the silent-zero-transfer design of `confidentialTransferFrom`; ACL semantics of `FHE.allow`/`FHE.allowThis`/`FHE.allowTransient`; and choosing small encrypted types (euint64) because FHE cost scales with bit-width.
Lending relevance: the design rationale transfers one-to-one to lending — never gate logic with reverts on encrypted comparisons (they leak), clamp with select, and keep reveal functions time/state-gated so calling them early cannot leak positions.

# Tutorial

This tutorial explains how to build a sealed-bid NFT auction using Fully Homomorphic Encryption (FHE). In this system, participants submit encrypted bids for a single NFT. Bids remain confidential during the auction, and only the winner's information is revealed at the end.

By following this guide, you will learn how to:

* Accept and process encrypted bids
* Compare bids securely without revealing their values
* Reveal the winner after the auction concludes
* Design an auction that is private, fair, and transparent

## Why FHE

In most onchain auctions, **bids are fully public**. Anyone can inspect the blockchain or monitor pending transactions to see how much each participant has bid. This breaks fairness as all it takes to win is to send a new bid with just one wei higher than the current highest.

Existing solutions like commit-reveal schemes attempt to hide bids during a preliminary commit phase. However, they come with several drawbacks: increased transaction overhead, poor user experience (e.g., requiring users to send funds to EOA via `CREATE2`), and delays caused by the need for multiple auction phases.

Fully Homomorphic Encryption (FHE) enables participants to submit encrypted bids directly to a smart contract in a single step, eliminating multi-phase complexity, improving user experience, and preserving bid secrecy without ever revealing or decrypting them.

## Project Setup

Before starting this tutorial, ensure you have:

1. Installed the FHEVM hardhat template
2. Set up the OpenZeppelin confidential contracts library
3. Deployed your confidential token

For help with these steps, refer to these tutorials:

* [Setting up OpenZeppelin confidential contracts](/protocol/examples/openzeppelin-confidential-contracts/openzeppelin.md)
* [Deploying a Confidential Token](/protocol/examples/openzeppelin-confidential-contracts/erc7984.md)

## Create the smart contracts

Let's now create a new contract called `BlindAuction.sol` in the `./contracts/` folder. To enable FHE operations in our contract, we will need to inherit our contract from `ZamaEthereumConfig`. This configuration provides the necessary parameters and network-specific settings required to interact with the Zama Protocol.

Let's also create some state variables that are going to be used in our auction. For the payment, we will rely on a confidential ERC7984 token. Indeed, we cannot use traditional ERC20, because even if the state in our auction is private, anyone can still monitor blockchain transactions and guess the bid value. By using an ERC7984 confidential token we ensure the amount stays hidden. Any ERC20 token can be wrapped into an ERC7984 token using the ERC7984ERC20Wrapper to hide future transfers.

Our contract will also include an `ERC721` token representing the NFT being auctioned and the address of the auction's beneficiary. Finally, we'll define some time-related parameters to control the auction's duration.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import { FHE, externalEuint64, euint64, eaddress, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC7984 } from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
// ...

contract BlindAuction is ZamaEthereumConfig, ReentrancyGuard, IERC721Receiver {
  /// @notice The recipient of the highest bid once the auction ends
  address public beneficiary;

  /// @notice Confidential payment token (ERC7984)
  IERC7984 public confidentialToken;

  /// @notice NFT prize for the auction
  IERC721 public nftContract;
  uint256 public tokenId;

  /// @notice Auction duration
  uint256 public auctionStartTime;
  uint256 public auctionEndTime;

  // ...

  constructor(
    address _nftContractAddress,
    address _confidentialTokenAddress,
    uint256 _tokenId,
    uint256 _auctionStartTime,
    uint256 _auctionEndTime
  ) {
    beneficiary = msg.sender;
    confidentialToken = IERC7984(_confidentialTokenAddress);
    nftContract = IERC721(_nftContractAddress);
    tokenId = _tokenId;

    // Transfer the NFT to the contract for the auction
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

    require(_auctionStartTime < _auctionEndTime, "INVALID_TIME");
    auctionStartTime = _auctionStartTime;
    auctionEndTime = _auctionEndTime;
  }

  // ...
}
```

Now, we need a way to store the highest bid and the potential winner. To store that information privately, we will use some tools provided by the FHE library. For storing an encrypted address, we can use `eaddress` type and for the highest bid, we can store the amount with `euint64`. Additionally, we can create a mapping to track the user bids.

```solidity
/// @notice Encrypted auction state
euint64 private highestBid;
eaddress private winningAddress;

/// @notice Mapping from bidder to their bid value
mapping(address account => euint64 bidAmount) private bids;
```

{% hint style="info" %}
As you may notice, in our code we are using euint64, which represents an encrypted 64-bit unsigned integer. Unlike standard Solidity type, where there is not that much difference between uint64 and uint256, in FHE the size of your data has a significant effect on performance. The larger the representation, the more expensive the computation becomes. That is for this reason, we recommend you to choose wisely your number representation based on your use case. Here for instance, euint64 is more than enough to handle token balance.
{% endhint %}

### Create our bid function

Let's now create our bid function, where the user will transfer a confidential amount and send it to the auction smart contract. Since we want bids to remain private, users must first encrypt their bid amount locally. This encrypted value will then be used to securely transfer funds from the ERC7984 confidential token that we've set as the payment method. We can create our function as follows:

```solidity
function bid(
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) public onlyDuringAuction nonReentrant {
    // Get and verify the amount from the user
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

    // ...
```

Here, we accept two parameters:

* Encrypted Amount: The user's bid amount, encrypted using FHE.
* Input Proof: A Zero-Knowledge Proof ensuring the validity of the encrypted data.

We can verify those parameters by using our helper function `FHE.fromExternal()` which gives us the reference to our encrypted amount.

Then, we need to transfer the confidential token to the contract.

```solidity
euint64 balanceBefore = confidentialToken.confidentialBalanceOf(address(this));
FHE.allowTransient(amount, address(confidentialToken));
confidentialToken.confidentialTransferFrom(msg.sender, address(this), amount);
euint64 balanceAfter = confidentialToken.confidentialBalanceOf(address(this));
euint64 sentBalance = FHE.sub(balanceAfter, balanceBefore);
```

Notice that here, we are not using the amount provided by the user as a source of trust. Indeed, in case the user does not have enough funds, when calling the `confidentialTransferFrom()`, **the transaction will not be reverted, but instead transfer silently a `0` value**. This design choice protects eventual leaks as reverted transactions can unintentionally reveal some information on the data.

> Note: To dive deeper into how FHE works, each FHE operation done on chain will emit an event used to construct a computation graph. This graph is then executed by the Zama Protocol. Thus, the FHE operation is not directly done on the smart contract side, but rather follows the source graph generated by it.

Once the payment is done, we need to update the bid balance of the user. Notice here that the user can increase his previous bid if he wants:

```solidity
euint64 previousBid = bids[msg.sender];
if (FHE.isInitialized(previousBid)) {  // The user increase his bid
    euint64 newBid = FHE.add(previousBid, sentBalance);
    bids[msg.sender] = newBid;
} else {
    // First bid for the user
    bids[msg.sender] = sentBalance;
}
```

And finally we can check if we need to update the encrypted winner:

```solidity
// Compare the total value of the user from the highest bid
euint64 currentBid = bids[msg.sender];
FHE.allowThis(currentBid);
FHE.allow(currentBid, msg.sender);

if (FHE.isInitialized(highestBid)) {
    ebool isNewWinner = FHE.lt(highestBid, currentBid);
    highestBid = FHE.select(isNewWinner, currentBid, highestBid);
    winningAddress = FHE.select(isNewWinner, FHE.asEaddress(msg.sender), winningAddress);
} else {
    highestBid = currentBid;
    winningAddress = FHE.asEaddress(msg.sender);
}
FHE.allowThis(highestBid);
FHE.allowThis(winningAddress);
```

As you can see here, we are using some FHE functions. Let's talk a bit about the `FHE.allow()` and `FHE.allowThis()`. Each encrypted value has a restriction on who can read this value. To be able to access this value or even do some computation on it, we need to explicitly request access. This is the reason why we need to explicitly request the access. Here for instance, we want the contract and the user to have access to the bid value. However, only the contract can have access to the highest bid value and winner address that will be revealed at the end of the auction.

Another point that we want to mention is the `FHE.select()` function. As mentioned previously, when using FHE, we do not want transactions to be reverted. Instead, when building our graph of FHE operation, we want to create two paths depending on an encrypted value. This is the reason we are using **branching** allowing us to define the type of process we want. Here for instance, if the bid value of the user is higher than the current one, we are going to change the amount and the address. However, if it is not the case, we are keeping the old one. This branching method is particularly useful, as on chain you cannot have access directly to encrypted data, but you still want to adapt your contract logic based on them.

Alright, it seems our bidding function is ready. Here is the full code we have seen so far:

```solidity
function bid(externalEuint64 encryptedAmount, bytes calldata inputProof) public onlyDuringAuction nonReentrant {
    // Get and verify the amount from the user
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

    // Transfer the confidential token as payment
    euint64 balanceBefore = confidentialToken.confidentialBalanceOf(address(this));
    FHE.allowTransient(amount, address(confidentialToken));
    confidentialToken.confidentialTransferFrom(msg.sender, address(this), amount);
    euint64 balanceAfter = confidentialToken.confidentialBalanceOf(address(this));
    euint64 sentBalance = FHE.sub(balanceAfter, balanceBefore);

    // Update the bid balance (supports incremental bids)
    euint64 previousBid = bids[msg.sender];
    if (FHE.isInitialized(previousBid)) {
        euint64 newBid = FHE.add(previousBid, sentBalance);
        bids[msg.sender] = newBid;
    } else {
        bids[msg.sender] = sentBalance;
    }

    // Compare the total value of the user against the highest bid
    euint64 currentBid = bids[msg.sender];
    FHE.allowThis(currentBid);
    FHE.allow(currentBid, msg.sender);

    if (FHE.isInitialized(highestBid)) {
        ebool isNewWinner = FHE.lt(highestBid, currentBid);
        highestBid = FHE.select(isNewWinner, currentBid, highestBid);
        winningAddress = FHE.select(isNewWinner, FHE.asEaddress(msg.sender), winningAddress);
    } else {
        highestBid = currentBid;
        winningAddress = FHE.asEaddress(msg.sender);
    }
    FHE.allowThis(highestBid);
    FHE.allowThis(winningAddress);
}
```

### Auction resolution phase

Once all participants have placed their bids, it's time to move to the resolution phase, where we will need to reveal the winner address. First, we will need to decrypt the winner's address as it is currently encrypted. To do so, we use public decryption — a two-step process where we first mark the value as publicly decryptable, then verify the decryption proof on-chain.

```solidity
function decryptWinningAddress() public onlyAfterEnd {
    require(!decryptionRequested, "Decryption already requested");
    decryptionRequested = true;
    FHE.makePubliclyDecryptable(winningAddress);
    emit AuctionDecryptionRequested(winningAddress);
}
```

Here, we call `FHE.makePubliclyDecryptable()` to mark the encrypted winning address as eligible for public decryption. The emitted event provides the encrypted handle that off-chain services (like the Zama Relayer) use to compute the decryption and generate a proof.

Notice that we have restricted this function to be called only when the auction has ended. We must not be able to call it while the auction is still running, else it will leak some information.

Once the off-chain decryption is computed, anyone can submit the result along with its proof for on-chain verification:

```solidity
function resolveAuction(bytes memory abiEncodedClearResult, bytes memory decryptionProof) public {
    require(decryptionRequested, "Decryption not requested");
    require(winnerAddress == address(0), "Winner already resolved");

    bytes32[] memory cts = new bytes32[](1);
    cts[0] = FHE.toBytes32(winningAddress);
    FHE.checkSignatures(cts, abiEncodedClearResult, decryptionProof);

    address resultWinnerAddress = abi.decode(abiEncodedClearResult, (address));
    winnerAddress = resultWinnerAddress;
}
```

`abiEncodedClearResult` is the ABI-encoded decrypted winning address, and `decryptionProof` is the KMS proof that validates the decryption. `FHE.checkSignatures()` verifies that the provided clear value is the true decryption of the stored ciphertext — if the proof is invalid, the transaction reverts.

### Claiming rewards & refunds

Alright, once the winner is revealed, we can now allow the winner to claim his reward and the other one to get refunded.

```solidity
function winnerClaimPrize() public onlyAfterWinnerRevealed {
    require(winnerAddress == msg.sender, "Only winner can claim item");
    require(!isNftClaimed, "NFT has already been claimed");
    isNftClaimed = true;

    // Reset bid value
    bids[msg.sender] = FHE.asEuint64(0);
    FHE.allowThis(bids[msg.sender]);
    FHE.allow(bids[msg.sender], msg.sender);

    // Transfer the highest bid to the beneficiary
    FHE.allowTransient(highestBid, address(confidentialToken));
    confidentialToken.confidentialTransfer(beneficiary, highestBid);

    // Send the NFT to the winner
    nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
}
```

```solidity
function withdraw(address bidder) public onlyAfterWinnerRevealed {
    if (bidder == winnerAddress) revert TooLateError(auctionEndTime);

    // Get the user bid value
    euint64 amount = bids[bidder];
    FHE.allowTransient(amount, address(confidentialToken));

    // Reset user bid value
    euint64 newBid = FHE.asEuint64(0);
    bids[bidder] = newBid;
    FHE.allowThis(newBid);
    FHE.allow(newBid, bidder);

    // Refund the user with their bid amount
    confidentialToken.confidentialTransfer(bidder, amount);
}
```

## Conclusion

In this guide, we have walked through how to build a sealed-bid NFT auction using Fully Homomorphic Encryption (FHE) onchain.

We demonstrated how FHE can be used to design a private and fair auction mechanism, keeping all bids encrypted and only revealing information when necessary.

Now it's your turn. Feel free to build on this code, extend it with more complex logic, or create your own decentralized application powered by FHE.

---

# PART D — Basics

## D.1 FHE counter (`Counter` vs `FHECounter`)

Source: https://docs.zama.org/protocol/examples/basic/fhe-counter.md
Pattern: the hello-world of FHEVM — side-by-side plain vs encrypted counter; `externalEuint32` + `inputProof` in, `FHE.fromExternal`, `FHE.add`/`FHE.sub` on state, `FHE.allowThis`+`FHE.allow` after every write; uninitialized encrypted state reads as `bytes32(0)`.
Lending relevance: an encrypted balance that is incremented/decremented is literally the core storage primitive of confidential lending (deposits, debts); also note the doc's warning that this example omits underflow/overflow range checks.

# FHE counter

This example demonstrates how to build an confidential counter using FHEVM, in comparison to a simple counter.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

### A simple counter

{% tabs %}
{% tab title="counter.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/// @title A simple counter contract
contract Counter {
  uint32 private _count;

  /// @notice Returns the current count
  function getCount() external view returns (uint32) {
    return _count;
  }

  /// @notice Increments the counter by a specific value
  function increment(uint32 value) external {
    _count += value;
  }

  /// @notice Decrements the counter by a specific value
  function decrement(uint32 value) external {
    require(_count >= value, "Counter: cannot decrement below zero");
    _count -= value;
  }
}
```

{% endtab %}

{% tab title="counter.ts" %}

```ts
import { Counter, Counter__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("Counter")) as Counter__factory;
  const counterContract = (await factory.deploy()) as Counter;
  const counterContractAddress = await counterContract.getAddress();

  return { counterContract, counterContractAddress };
}

describe("Counter", function () {
  let signers: Signers;
  let counterContract: Counter;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    ({ counterContract } = await deployFixture());
  });

  it("count should be zero after deployment", async function () {
    const count = await counterContract.getCount();
    console.log(`Counter.getCount() === ${count}`);
    // Expect initial count to be 0 after deployment
    expect(count).to.eq(0);
  });

  it("increment the counter by 1", async function () {
    const countBeforeInc = await counterContract.getCount();
    const tx = await counterContract.connect(signers.alice).increment(1);
    await tx.wait();
    const countAfterInc = await counterContract.getCount();
    expect(countAfterInc).to.eq(countBeforeInc + 1n);
  });

  it("decrement the counter by 1", async function () {
    // First increment, count becomes 1
    let tx = await counterContract.connect(signers.alice).increment(1);
    await tx.wait();
    // Then decrement, count goes back to 0
    tx = await counterContract.connect(signers.alice).decrement(1);
    await tx.wait();
    const count = await counterContract.getCount();
    expect(count).to.eq(0);
  });
});
```

{% endtab %}
{% endtabs %}

### An FHE counter

{% tabs %}
{% tab title="FHECounter.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A simple FHE counter contract
contract FHECounter is ZamaEthereumConfig {
  euint32 private _count;

  /// @notice Returns the current count
  function getCount() external view returns (euint32) {
    return _count;
  }

  /// @notice Increments the counter by a specified encrypted value.
  /// @dev This example omits overflow/underflow checks for simplicity and readability.
  /// In a production contract, proper range checks should be implemented.
  function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    _count = FHE.add(_count, encryptedEuint32);

    FHE.allowThis(_count);
    FHE.allow(_count, msg.sender);
  }

  /// @notice Decrements the counter by a specified encrypted value.
  /// @dev This example omits overflow/underflow checks for simplicity and readability.
  /// In a production contract, proper range checks should be implemented.
  function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    _count = FHE.sub(_count, encryptedEuint32);

    FHE.allowThis(_count);
    FHE.allow(_count, msg.sender);
  }
}
```

{% endtab %}

{% tab title="FHECounter.ts" %}

```ts
import { FHECounter, FHECounter__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECounter")) as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });

  it("encrypted count should be uninitialized after deployment", async function () {
    const encryptedCount = await fheCounterContract.getCount();
    // Expect initial count to be bytes32(0) after deployment,
    // (meaning the encrypted count value is uninitialized)
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("increment the counter by 1", async function () {
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.eq(ethers.ZeroHash);
    const clearCountBeforeInc = 0;

    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterInc = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(clearCountBeforeInc + clearOne);
  });

  it("decrement the counter by 1", async function () {
    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    // First increment by 1, count becomes 1
    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    // Then decrement by 1, count goes back to 0
    tx = await fheCounterContract.connect(signers.alice).decrement(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterDec = await fheCounterContract.getCount();
    const clearCountAfterDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterDec,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterDec).to.eq(0);
  });
});
```

{% endtab %}
{% endtabs %}

---

## D.2 FHE Operations — section index

Source: https://docs.zama.org/protocol/examples/basic/fhe-operations.md

# FHE Operations

- [Add](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md)
- [If then else](https://docs.zama.org/protocol/examples/basic/fhe-operations/fheifthenelse.md)

---

## D.3 Add (`FHEAdd`)

Source: https://docs.zama.org/protocol/examples/basic/fhe-operations/fheadd.md
Pattern: contract-side compute permissions — the CONTRACT (not the caller) needs ACL rights over operands to run `FHE.add`; results get an ephemeral permission that dies at function exit unless persisted with `FHE.allowThis`/`FHE.allow`; a third party (bob) can trigger computation over alice's inputs.
Lending relevance: your pool contract aggregates encrypted amounts deposited by many different users — this example proves the pool only needs its own `allowThis` grants on stored handles, regardless of who calls the accrual/update function (e.g., a keeper).

# Add

This example demonstrates how to perform addition operations on encrypted values.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="FHEAdd.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEAdd is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  // solhint-disable-next-line var-name-mixedcase
  euint8 private _a_plus_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeAPlusB() external {
    // The sum `a + b` is computed by the contract itself (`address(this)`).
    // Since the contract has FHE permissions over both `a` and `b`,
    // it is authorized to perform the `FHE.add` operation on these values.
    // It does not matter if the contract caller (`msg.sender`) has FHE permission or not.
    _a_plus_b = FHE.add(_a, _b);

    // At this point the contract itself (`address(this)`) has been granted ephemeral FHE permission
    // over `_a_plus_b`. This FHE permission will be revoked when the function exits.
    //
    // Now, to make sure `_a_plus_b` can be decrypted by the contract caller (`msg.sender`),
    // we need to grant permanent FHE permissions to both the contract itself (`address(this)`)
    // and the contract caller (`msg.sender`)
    FHE.allowThis(_a_plus_b);
    FHE.allow(_a_plus_b, msg.sender);
  }

  function result() public view returns (euint8) {
    return _a_plus_b;
  }
}
```

{% endtab %}

{% tab title="FHEAdd.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAdd, FHEAdd__factory } from "../../../types";
import type { Signers } from "../../types";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("FHEAdd")) as FHEAdd__factory;
  const fheAdd = (await factory.deploy()) as FHEAdd;
  const fheAdd_address = await fheAdd.getAddress();

  return { fheAdd, fheAdd_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("FHEAdd", function () {
  let contract: FHEAdd;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.fheAdd_address;
    contract = deployment.fheAdd;
  });

  it("a + b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;

    // Let's compute 80 + 123 = 203
    const a = 80;
    const b = 123;

    // Alice encrypts and sets `a` as 80
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Alice encrypts and sets `b` as 203
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Why Bob has FHE permissions to execute the operation in this case ?
    // See `computeAPlusB()` in `FHEAdd.sol` for a detailed answer
    tx = await contract.connect(bob).computeAPlusB();
    await tx.wait();

    const encryptedAplusB = await contract.result();

    const clearAplusB = await fhevm.userDecryptEuint(
      FhevmType.euint8, // Specify the encrypted type
      encryptedAplusB,
      contractAddress, // The contract address
      bob, // The user wallet
    );

    expect(clearAplusB).to.equal(a + b);
  });
});

```

{% endtab %}
{% endtabs %}

---

## D.4 If-then-else (`FHEIfThenElse`)

Source: https://docs.zama.org/protocol/examples/basic/fhe-operations/fheifthenelse.md
Pattern: branchless encrypted conditionals — `ebool cond = FHE.ge(a, b)` then `FHE.select(cond, a, b)` computes max(a,b) without revealing anything.
Lending relevance: `ge`/`lt` + `select` is THE workhorse of confidential lending: LTV checks, clamping withdraw/borrow amounts to available balance, and liquidation-eligibility flags are all built from exactly this two-op pattern.

# If then else

This example shows conditional operations on encrypted values using FHE.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="FHEIfThenElse.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEIfThenElse is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _max;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeMax() external {
    // a >= b
    // solhint-disable-next-line var-name-mixedcase
    ebool _a_ge_b = FHE.ge(_a, _b);

    // a >= b ? a : b
    _max = FHE.select(_a_ge_b, _a, _b);

    // For more information about FHE permissions in this case,
    // read the `computeAPlusB()` commentaries in `FHEAdd.sol`.
    FHE.allowThis(_max);
    FHE.allow(_max, msg.sender);
  }

  function result() public view returns (euint8) {
    return _max;
  }
}
```

{% endtab %}

{% tab title="FHEIfThenElse.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEIfThenElse, FHEIfThenElse__factory } from "../../../types";
import type { Signers } from "../../types";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("FHEIfThenElse")) as FHEIfThenElse__factory;
  const fheIfThenElse = (await factory.deploy()) as FHEIfThenElse;
  const fheIfThenElse_address = await fheIfThenElse.getAddress();

  return { fheIfThenElse, fheIfThenElse_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("FHEIfThenElse", function () {
  let contract: FHEIfThenElse;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.fheIfThenElse_address;
    contract = deployment.fheIfThenElse;
  });

  it("a >= b ? a : b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;

    // Let's compute `a >= b ? a : b`
    const a = 80;
    const b = 123;

    // Alice encrypts and sets `a` as 80
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Alice encrypts and sets `b` as 203
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Why Bob has FHE permissions to execute the operation in this case ?
    // See `computeAPlusB()` in `FHEAdd.sol` for a detailed answer
    tx = await contract.connect(bob).computeMax();
    await tx.wait();

    const encryptedMax = await contract.result();

    const clearMax = await fhevm.userDecryptEuint(
      FhevmType.euint8, // Specify the encrypted type
      encryptedMax,
      contractAddress, // The contract address
      bob, // The user wallet
    );

    expect(clearMax).to.equal(a >= b ? a : b);
  });
});

```

{% endtab %}
{% endtabs %}

---

## D.5 Encryption — section index

Source: https://docs.zama.org/protocol/examples/basic/encryption.md

# Encryption

- [Encrypt single value](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md)
- [Encrypt multiple values](https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-multiple-values.md)

---

## D.6 Encrypt single value (`EncryptSingleValue`)

Source: https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-single-value.md
Pattern: client-side encrypted inputs — `fhevm.createEncryptedInput(contractAddress, userAddress).add32(v).encrypt()` yields `handles[]` + one `inputProof` cryptographically BOUND to that (contract, user) pair; the failing test shows the classic pitfall of submitting the tx from a different signer than the one the input was bound to.
Lending relevance: every deposit/borrow/repay amount enters your lending contract through this exact flow; the binding rule means your frontend must encrypt against (poolAddress, connectedWallet) and send from that same wallet.

# Encrypt single value

This example demonstrates the FHE encryption mechanism and highlights a common pitfall developers may encounter.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="EncryptSingleValue.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint32, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * This trivial example demonstrates the FHE encryption mechanism.
 */
contract EncryptSingleValue is ZamaEthereumConfig {
  euint32 private _encryptedEuint32;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    _encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    // Grant FHE permission to both the contract itself (`address(this)`) and the caller (`msg.sender`),
    // to allow future decryption by the caller (`msg.sender`).
    FHE.allowThis(_encryptedEuint32);
    FHE.allow(_encryptedEuint32, msg.sender);
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedEuint32;
  }
}
```

{% endtab %}

{% tab title="EncryptSingleValue.ts" %}

```typescript
import { EncryptSingleValue, EncryptSingleValue__factory } from "../../../types";
import type { Signers } from "../../types";
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("EncryptSingleValue")) as EncryptSingleValue__factory;
  const encryptSingleValue = (await factory.deploy()) as EncryptSingleValue;
  const encryptSingleValue_address = await encryptSingleValue.getAddress();

  return { encryptSingleValue, encryptSingleValue_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("EncryptSingleValue", function () {
  let contract: EncryptSingleValue;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.encryptSingleValue_address;
    contract = deployment.encryptSingleValue;
  });

  // ✅ Test should succeed
  it("encryption should succeed", async function () {
    // Use the FHEVM Hardhat plugin runtime environment
    // to perform FHEVM input encryptions.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    // 🔐 Encryption Process:
    // Values are encrypted locally and bound to a specific contract/user pair.
    // This grants the bound contract FHE permissions to receive and process the encrypted value,
    // but only when it is sent by the bound user.
    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);

    // Add a uint32 value to the list of values to encrypt locally.
    input.add32(123456);

    // Perform the local encryption. This operation produces two components:
    // 1. `handles`: an array of FHEVM handles. In this case, a single handle associated with the
    //    locally encrypted uint32 value `123456`.
    // 2. `inputProof`: a zero-knowledge proof that attests the `handles` are cryptographically
    //    bound to the pair `[contractAddress, signers.alice.address]`.
    const enc = await input.encrypt();

    // a 32-bytes FHEVM handle that represents a future Solidity `euint32` value.
    const inputEuint32 = enc.handles[0];
    const inputProof = enc.inputProof;

    // Now `signers.alice.address` can send the encrypted value and its associated zero-knowledge proof
    // to the smart contract deployed at `contractAddress`.
    const tx = await contract.connect(signers.alice).initialize(inputEuint32, inputProof);
    await tx.wait();

    // Let's try to decrypt it to check that everything is ok!
    const encryptedUint32 = await contract.encryptedUint32();

    const clearUint32 = await fhevm.userDecryptEuint(
      FhevmType.euint32, // Specify the encrypted type
      encryptedUint32,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    expect(clearUint32).to.equal(123456);
  });

  // ❌ This test illustrates a very common pitfall
  it("encryption should fail", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const enc = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(123456).encrypt();

    const inputEuint32 = enc.handles[0];
    const inputProof = enc.inputProof;

    try {
      // Here is a very common error !
      // `contract.initialize` will sign the Ethereum transaction using user `signers.owner`
      // instead of `signers.alice`.
      //
      // In the Solidity contract the following is checked:
      // - Is the contract allowed to manipulate `inputEuint32`? Answer is: ✅ yes!
      // - Is the sender allowed to manipulate `inputEuint32`? Answer is: ❌ no! Only `signers.alice` is!
      const tx = await contract.initialize(inputEuint32, inputProof);
      await tx.wait();
    } catch {
      //console.log(e);
    }
  });
});
```

{% endtab %}
{% endtabs %}

---

## D.7 Encrypt multiple values (`EncryptMultipleValues`)

Source: https://docs.zama.org/protocol/examples/basic/encryption/fhe-encrypt-multiple-values.md
Pattern: packing heterogeneous values (ebool, euint32, eaddress) into ONE encrypted input and ONE proof, unpacked on-chain with successive `FHE.fromExternal` calls against the same `inputProof`; decrypted with type-specific helpers (`userDecryptEbool`/`userDecryptEuint`/`userDecryptEaddress`).
Lending relevance: lets a borrower submit amount + use-as-collateral flag (+ referrer address) in a single proof — cheaper and atomic, the standard way to shape multi-field lending transactions.

# Encrypt multiple values

This example shows how to encrypt and handle multiple values in a single transaction.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

* `.sol` file → `<your-project-root-dir>/contracts/`
* `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}
{% tab title="EncryptMultipleValues.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
  FHE,
  externalEbool,
  externalEuint32,
  externalEaddress,
  ebool,
  euint32,
  eaddress
} from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * This trivial example demonstrates the FHE encryption mechanism.
 */
contract EncryptMultipleValues is ZamaEthereumConfig {
  ebool private _encryptedEbool;
  euint32 private _encryptedEuint32;
  eaddress private _encryptedEaddress;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(
    externalEbool inputEbool,
    externalEuint32 inputEuint32,
    externalEaddress inputEaddress,
    bytes calldata inputProof
  ) external {
    _encryptedEbool = FHE.fromExternal(inputEbool, inputProof);
    _encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
    _encryptedEaddress = FHE.fromExternal(inputEaddress, inputProof);

    // For each of the 3 values:
    // Grant FHE permission to both the contract itself (`address(this)`) and the caller (`msg.sender`),
    // to allow future decryption by the caller (`msg.sender`).

    FHE.allowThis(_encryptedEbool);
    FHE.allow(_encryptedEbool, msg.sender);

    FHE.allowThis(_encryptedEuint32);
    FHE.allow(_encryptedEuint32, msg.sender);

    FHE.allowThis(_encryptedEaddress);
    FHE.allow(_encryptedEaddress, msg.sender);
  }

  function encryptedBool() public view returns (ebool) {
    return _encryptedEbool;
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedEuint32;
  }

  function encryptedAddress() public view returns (eaddress) {
    return _encryptedEaddress;
  }
}
```

{% endtab %}

{% tab title="EncryptMultipleValues.ts" %}

```typescript
//TODO;
import { EncryptMultipleValues, EncryptMultipleValues__factory } from "../../../types";
import type { Signers } from "../../types";
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("EncryptMultipleValues")) as EncryptMultipleValues__factory;
  const encryptMultipleValues = (await factory.deploy()) as EncryptMultipleValues;
  const encryptMultipleValues_address = await encryptMultipleValues.getAddress();

  return { encryptMultipleValues, encryptMultipleValues_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("EncryptMultipleValues", function () {
  let contract: EncryptMultipleValues;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.encryptMultipleValues_address;
    contract = deployment.encryptMultipleValues;
  });

  // ✅ Test should succeed
  it("encryption should succeed", async function () {
    // Use the FHEVM Hardhat plugin runtime environment
    // to perform FHEVM input encryptions.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);

    input.addBool(true);
    input.add32(123456);
    input.addAddress(signers.owner.address);

    const enc = await input.encrypt();

    const inputEbool = enc.handles[0];
    const inputEuint32 = enc.handles[1];
    const inputEaddress = enc.handles[2];
    const inputProof = enc.inputProof;

    // Don't forget to call `connect(signers.alice)` to make sure
    // the Solidity `msg.sender` is `signers.alice.address`.
    const tx = await contract.connect(signers.alice).initialize(inputEbool, inputEuint32, inputEaddress, inputProof);
    await tx.wait();

    const encryptedBool = await contract.encryptedBool();
    const encryptedUint32 = await contract.encryptedUint32();
    const encryptedAddress = await contract.encryptedAddress();

    const clearBool = await fhevm.userDecryptEbool(
      encryptedBool,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    const clearUint32 = await fhevm.userDecryptEuint(
      FhevmType.euint32, // Specify the encrypted type
      encryptedUint32,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    const clearAddress = await fhevm.userDecryptEaddress(
      encryptedAddress,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    expect(clearBool).to.equal(true);
    expect(clearUint32).to.equal(123456);
    expect(clearAddress).to.equal(signers.owner.address);
  });
});
```

{% endtab %}
{% endtabs %}
