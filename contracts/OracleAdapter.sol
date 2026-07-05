// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal Chainlink aggregator interface.
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function decimals() external view returns (uint8);

    function description() external view returns (string memory);
}

/// @title OracleAdapter — Chainlink price wrapper (no FHE).
/// @notice Returns an 8-decimal price, reverting on non-positive or stale answers.
///         Staleness window is 2h (PROBE-RESULTS P9: Sepolia ETH/USD heartbeat ≈ 1h; ADDENDUM A.2).
contract OracleAdapter {
    AggregatorV3Interface public immutable feed;
    uint256 public constant STALE_AFTER = 2 hours;

    error NonPositivePrice(int256 answer);
    error StalePrice(uint256 updatedAt, uint256 nowTs);
    error UnexpectedDecimals(uint8 decimals);

    constructor(address feed_) {
        feed = AggregatorV3Interface(feed_);
        // Pin the 8-decimal assumption at deploy (ARCHITECTURE §0 / ADDENDUM A.2).
        uint8 d = feed.decimals();
        if (d != 8) revert UnexpectedDecimals(d);
    }

    /// @return priceE8 latest price with 8 decimals (uint64 is ample: 1e8 * $1.8e11 < 2^64).
    function priceE8() external view returns (uint64) {
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
        if (answer <= 0) revert NonPositivePrice(answer);
        if (block.timestamp > updatedAt + STALE_AFTER) revert StalePrice(updatedAt, block.timestamp);
        return uint64(uint256(answer));
    }
}
