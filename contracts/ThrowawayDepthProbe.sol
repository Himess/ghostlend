// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {GhostLendPool} from "./GhostLendPool.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title ThrowawayDepthProbe — DEV-ONLY, NEVER a production deploy.
/// @notice Subclass of GhostLendPool that adds a dev-only index setter so we can force the interest index
///         to MAX_INDEX and measure the WORST-CASE borrow-with-interest depth against the LIVE deployed
///         HCULimit (v0.3.0) on Sepolia (CP2 ruling condition #2). It reuses the production `borrow` code
///         verbatim — only the setter is added. Abandon this instance after the one-time measurement.
contract ThrowawayDepthProbe is GhostLendPool {
    constructor(
        address oracle_,
        address registry_,
        MarketConfig[] memory cfgs
    ) GhostLendPool(oracle_, registry_, cfgs) {}

    /// DEV ONLY: force the plaintext indexes to exercise the non-fast-path conversion depth.
    function setIndexForProbe(uint8 marketId, uint64 borrowIdx, uint64 supplyIdx) external {
        markets[marketId].borrowIndex = borrowIdx;
        markets[marketId].supplyIndex = supplyIdx;
    }

    /// DEV ONLY: grant the caller decrypt-ACL on the internal availCash handle (for the M-1 invariant test).
    function debugGrantAvailCash(uint8 marketId) external {
        FHE.allow(markets[marketId].availCash, msg.sender);
    }

    /// DEV ONLY: read the current availCash handle (pair with debugGrantAvailCash, then userDecrypt it).
    function availCashHandle(uint8 marketId) external view returns (euint64) {
        return markets[marketId].availCash;
    }
}
