// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockYieldVault — minimal ERC-4626 over the mock USDC underlying (the ONLY mock in the Market 2
///        stack, honestly labeled).
/// @notice Yield is SIMULATED: a keeper periodically `underlying.mint(vault, drip)` (public mint on the mock
///         underlying) → `totalAssets()` rises → `convertToAssets()` rises over time. This is Market 2's
///         plaintext share-price oracle (no Chainlink; USDC ≈ USD assumption documented).
///         Stands in for Steakhouse Prime (mainnet-only); every other contract in this stack is the exact
///         production primitive.
contract MockYieldVault is ERC4626 {
    constructor(IERC20 asset_) ERC20("GhostLend Yield Vault Share", "gYVS") ERC4626(asset_) {}

    /// 6-dec asset (mock USDC) → 6-dec shares, no offset (keeps share-price math in plain integers).
    function _decimalsOffset() internal pure override returns (uint8) {
        return 0;
    }

    /// @dev Market 2 price source: USDC (6-dec) per 1e6 shares. Rises as yield is dripped in.
    function sharePrice6() external view returns (uint256) {
        return convertToAssets(1e6);
    }
}
