// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ERC7984Mock — TEST-ONLY confidential token.
/// @notice Mirrors the deployed cUSDC/cWETH ERC-7984 surface (setOperator, confidentialTransfer,
///         confidentialTransferFrom, confidentialBalanceOf) with a public cleartext `mint` so tests can
///         fund users directly. Uses the OZ v0.5.1 ERC7984 base, which CLAMPS insufficient transfers to 0
///         (the deployed Sepolia wrappers instead REVERT `ERC7984ZeroBalance` on a never-funded `from` —
///         see PROBE-RESULTS P4; the pool guards for both). NOT for production/Sepolia.
contract ERC7984Mock is ERC7984, ZamaEthereumConfig {
    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC7984(name_, symbol_, uri_) {}

    function mint(address to, uint64 amount) public returns (euint64) {
        return _mint(to, FHE.asEuint64(amount));
    }

    function mintEncrypted(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public returns (euint64) {
        return _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
    }
}
