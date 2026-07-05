// Constructor args for GhostLendPool verification (Etherscan). Struct[] cfgs = [M0, M1, M2].
// Usage: npx hardhat verify --network sepolia --constructor-args deployments/verify-pool.js <pool>
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";
const cSHARE = "0x09959630F67a6b8818b464487877DbDd6f4B14aE";
const vault = "0x7B560a3EFD4568Ea92f77963125F1C350bc65547";
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
