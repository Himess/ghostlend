// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title InterestRateModel — pure plaintext kinked IRM (no FHE).
/// @notice Two-slope model. All rates in "ray-lite" 1e9 fixed-point, per second.
///         APR(util) = base + slope1·(util/kink)                    for util ≤ kink
///                   = base + slope1 + slope2·((util-kink)/(1-kink)) for util > kink
///         Utilization is the LAST REVEALED value (rates lag one epoch by design — ARCHITECTURE §4.1).
library InterestRateModel {
    uint256 internal constant SECONDS_PER_YEAR = 365 days;
    uint256 internal constant WAD = 1e9; // ray-lite precision
    uint256 internal constant BPS = 10_000;

    // Curve parameters (bps of APR).
    uint256 internal constant BASE_APR_BPS = 200; // 2%
    uint256 internal constant SLOPE1_APR_BPS = 400; // +4% up to kink
    uint256 internal constant SLOPE2_APR_BPS = 6_000; // +60% from kink to 100%
    uint256 internal constant KINK_BPS = 8_000; // 80%

    /// @dev Per-second borrow rate in 1e9 precision, given utilization in bps [0..10000].
    function borrowRatePerSec(uint32 utilBps) internal pure returns (uint64) {
        uint256 u = utilBps > BPS ? BPS : utilBps;
        uint256 aprBps;
        if (u <= KINK_BPS) {
            aprBps = BASE_APR_BPS + (SLOPE1_APR_BPS * u) / KINK_BPS;
        } else {
            aprBps = BASE_APR_BPS + SLOPE1_APR_BPS + (SLOPE2_APR_BPS * (u - KINK_BPS)) / (BPS - KINK_BPS);
        }
        // aprBps/BPS is the annual fraction; convert to per-second and scale to 1e9.
        return uint64((aprBps * WAD) / BPS / SECONDS_PER_YEAR);
    }

    /// @dev Per-second supply rate = borrowRate · utilization · (1 - reserveFactor). 1e9 precision.
    function supplyRatePerSec(
        uint64 borrowRatePerSec_,
        uint32 utilBps,
        uint16 reserveBps
    ) internal pure returns (uint64) {
        uint256 u = utilBps > BPS ? BPS : utilBps;
        uint256 r = (uint256(borrowRatePerSec_) * u) / BPS;
        r = (r * (BPS - reserveBps)) / BPS;
        return uint64(r);
    }
}
