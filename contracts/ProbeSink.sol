// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// Minimal ERC-7984 surface the sink needs (no-proof transferFrom overload).
interface IERC7984Min {
    function confidentialTransferFrom(address from, address to, euint64 amount) external returns (euint64 transferred);
    function confidentialBalanceOf(address account) external view returns (euint64);
}

/// @title ProbeSink — throwaway Day-0 probe contract for GhostLend architecture validation.
/// @notice NOT a protocol contract. It exercises two primitives against the REAL deployed
///         Sepolia cToken mocks + KMS:
///         (P5) the deposit primitive: operator pull via confidentialTransferFrom + accounting on
///              the returned `transferred` handle (proves pool-as-`to` can consume it), and
///         (P6) the public-decryption round-trip: makePubliclyDecryptable -> off-chain publicDecrypt
///              -> self finalize() calling FHE.checkSignatures with a storage-rebuilt handle list.
contract ProbeSink is ZamaEthereumConfig {
    address public immutable token;

    // P5 accounting
    euint64 private _totalPulled;

    // P6 public-decryption round-trip
    euint64 private _stored;
    bytes32 public storedHandle;
    uint64 public finalizedValue;
    bool public finalized;

    event Pulled(address indexed from, euint64 transferred, euint64 newTotal);
    event StoredForPublicDecrypt(bytes32 handle, uint64 plaintextForAudit);
    event Finalized(uint64 value);

    constructor(address token_) {
        token = token_;
    }

    // ------------------------------------------------------------------
    // P5 — deposit primitive: pull `from`'s funds as an operator and account
    //      using the returned encrypted `transferred` amount.
    // Encrypted input must be bound to (address(this), from) off-chain.
    // ------------------------------------------------------------------
    function pull(address from, externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        // The token contract must be allowed to consume the amount handle in this tx.
        FHE.allowTransient(amount, token);
        euint64 transferred = IERC7984Min(token).confidentialTransferFrom(from, address(this), amount);
        // Prove the pool-as-`to` can CONSUME the returned handle (FHE.add into an aggregate).
        _totalPulled = FHE.add(_totalPulled, transferred);
        FHE.allowThis(_totalPulled);
        FHE.allow(_totalPulled, msg.sender); // so the caller can user-decrypt the running total
        emit Pulled(from, transferred, _totalPulled);
    }

    function totalPulledHandle() external view returns (euint64) {
        return _totalPulled;
    }

    // ------------------------------------------------------------------
    // P6 — public decryption. Store a trivially-encrypted constant, expose it
    //      for public decryption, and emit its handle for the off-chain relayer.
    // ------------------------------------------------------------------
    function storeForPublicDecrypt(uint64 value) external {
        _stored = FHE.asEuint64(value);
        FHE.allowThis(_stored);
        FHE.makePubliclyDecryptable(_stored);
        storedHandle = FHE.toBytes32(_stored);
        emit StoredForPublicDecrypt(storedHandle, value);
    }

    /// The "callback": permissionless, replay-guarded, rebuilds the handle list from STORAGE
    /// (never from calldata) and verifies the real KMS proof on-chain.
    function finalize(bytes calldata abiEncodedCleartexts, bytes calldata decryptionProof) external {
        require(!finalized, "already finalized"); // checkSignatures has NO replay protection
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_stored);
        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);
        finalizedValue = uint64(abi.decode(abiEncodedCleartexts, (uint256)));
        finalized = true;
        emit Finalized(finalizedValue);
    }

    /// View twin used to sanity-check a proof without flipping the replay guard.
    function verifyOnly(
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external view returns (bool) {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_stored);
        return FHE.isPublicDecryptionResultValid(handles, abiEncodedCleartexts, decryptionProof);
    }
}
