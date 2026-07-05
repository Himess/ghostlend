// Deploy GhostLend core (OracleAdapter + GhostLendPool) to Sepolia.
// Run: npx hardhat run scripts/deploy-core.ts --network sepolia
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const CHAINLINK_ETHUSD = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`deployer: ${deployer.address}  balance: ${ethers.formatEther(bal)} ETH`);

  const Oracle = await ethers.getContractFactory("OracleAdapter");
  const oracle = await Oracle.deploy(CHAINLINK_ETHUSD);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log(`OracleAdapter: ${oracleAddr}  (price now = ${await oracle.priceE8()})`);

  const Pool = await ethers.getContractFactory("GhostLendPool");
  // Registry validation is ON (registry != 0): the constructor hard-requires isConfidentialTokenValid.
  const pool = await Pool.deploy(oracleAddr, REGISTRY, [
    // collateral, debt, collIsEth, debtIsEth, lltvBps, liqBonusBps, reserveBps
    [cWETH, cUSDC, true, false, 8000, 500, 1000, ethers.ZeroAddress], // M0: borrow cUSDC against cWETH
    [cUSDC, cWETH, false, true, 8000, 500, 1000, ethers.ZeroAddress], // M1: borrow cWETH against cUSDC
  ]);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`GhostLendPool: ${poolAddr}  (marketCount = ${await pool.marketCount()})`);

  const out = {
    network: "sepolia",
    chainId: 11155111,
    oracle: oracleAddr,
    pool: poolAddr,
    chainlinkEthUsd: CHAINLINK_ETHUSD,
    registry: REGISTRY,
    tokens: { cUSDC, cWETH },
    deployer: deployer.address,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sepolia-core.json"), JSON.stringify(out, null, 2));
  console.log(`\nSaved → deployments/sepolia-core.json`);
  console.log(`Verify: npx hardhat verify --network sepolia ${oracleAddr} ${CHAINLINK_ETHUSD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
