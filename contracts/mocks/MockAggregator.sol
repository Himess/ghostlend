// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockAggregator — TEST-ONLY Chainlink AggregatorV3 stand-in (8 decimals).
contract MockAggregator {
    uint8 public constant decimals = 8;
    int256 public answer;
    uint256 public updatedAt;
    string public description;

    constructor(int256 answer_, string memory description_) {
        answer = answer_;
        updatedAt = block.timestamp;
        description = description_;
    }

    function setAnswer(int256 answer_) external {
        answer = answer_;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer_, uint256 startedAt, uint256 updatedAt_, uint80 answeredInRound)
    {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
