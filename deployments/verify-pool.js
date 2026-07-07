// Constructor args for GhostLendPool verification (Etherscan). Struct[] cfgs = [M0, M1, M2].
// Usage: npx hardhat verify --network sepolia --constructor-args deployments/verify-pool.js <pool>
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";
const cSHARE = "0x324A43A9269eB59f23713314df977272c2B8f8d8";
const vault = "0xfaC681ccB925863fa336F89aa81c272b97593838";
const oracle = "0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495";
const ZERO = "0x0000000000000000000000000000000000000000";
module.exports = [
  oracle,
  ZERO, // registry disabled
  [
    [cWETH, cUSDC, true, false, 8000, 500, 1000, ZERO], // M0
    [cUSDC, cWETH, false, true, 8000, 500, 1000, ZERO], // M1
    [cSHARE, cUSDC, false, false, 9000, 500, 1000, vault], // M2
  ],
];
