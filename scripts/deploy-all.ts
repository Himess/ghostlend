// CP6 — full PRODUCTION deploy of the GhostLend stack to Sepolia (core M0/M1 + Market 2 vault stack +
// GhostGate + batchers), reusing the live cUSDC/cWETH wrappers + Chainlink oracle. Registry validation is
// OFF for this pool because cSHARE (csteakcUSDC) is a fresh wrapper not in the Zama registry — documented
// deviation in ADDRESSES.md. Writes deployments/sepolia.json + generates deployments/ADDRESSES.md with the
// constructor args needed for Etherscan verification.
// Run: npx hardhat run scripts/deploy-all.ts --network sepolia
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// live, already-deployed pieces we reuse
const ORACLE = "0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495"; // OracleAdapter over Chainlink ETH/USD
const CHAINLINK = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";
const USDC_UNDERLYING = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF"; // cUSDC.underlying(), 6-dec
const WETH_UNDERLYING = "0xff54739b16576FA5402F211D0b938469Ab9A5f3F"; // cWETH.underlying(), 18-dec
const REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";
const MBA = 60; // batch/window minBatchAge (s)

async function main() {
  const [d] = await ethers.getSigners();
  console.log(`deployer ${d.address}  bal ${ethers.formatEther(await ethers.provider.getBalance(d.address))} ETH`);
  const args: Record<string, any[]> = {};

  // Market 2 vault + confidential share wrapper (csteakcUSDC)
  const vault = await (await ethers.getContractFactory("MockYieldVault")).deploy(USDC_UNDERLYING);
  await vault.waitForDeployment();
  const vaultA = await vault.getAddress();
  args.MockYieldVault = [USDC_UNDERLYING];
  console.log(`MockYieldVault ${vaultA}  sharePrice6=${await vault.sharePrice6()}`);

  const cSHARE = await (await ethers.getContractFactory("ConfidentialShareWrapper")).deploy(vaultA);
  await cSHARE.waitForDeployment();
  const cShareA = await cSHARE.getAddress();
  args.ConfidentialShareWrapper = [vaultA];
  console.log(`ConfidentialShareWrapper (csteakcUSDC) ${cShareA}`);

  // Pool with all three isolated markets. registry=0 (cSHARE not registered) — documented.
  const M0 = [cWETH, cUSDC, true, false, 8000, 500, 1000, ethers.ZeroAddress]; // borrow cUSDC vs cWETH
  const M1 = [cUSDC, cWETH, false, true, 8000, 500, 1000, ethers.ZeroAddress]; // borrow cWETH vs cUSDC
  const M2 = [cShareA, cUSDC, false, false, 9000, 500, 1000, vaultA]; // borrow cUSDC vs csteakcUSDC (90% LLTV, vault-priced)
  const pool = await (await ethers.getContractFactory("GhostLendPool")).deploy(ORACLE, ethers.ZeroAddress, [M0, M1, M2]);
  await pool.waitForDeployment();
  const poolA = await pool.getAddress();
  args.GhostLendPool = [ORACLE, ethers.ZeroAddress, [M0, M1, M2]];
  console.log(`GhostLendPool ${poolA}  markets=${await pool.marketCount()}`);

  // Market 2 batchers (vanilla pair) + GhostGate (netting)
  const dep = await (await ethers.getContractFactory("DepositBatcher")).deploy(cUSDC, cShareA, vaultA, MBA);
  await dep.waitForDeployment();
  const depA = await dep.getAddress();
  args.DepositBatcher = [cUSDC, cShareA, vaultA, MBA];
  console.log(`DepositBatcher ${depA}`);

  const wdr = await (await ethers.getContractFactory("WithdrawBatcher")).deploy(cShareA, cUSDC, vaultA, MBA);
  await wdr.waitForDeployment();
  const wdrA = await wdr.getAddress();
  args.WithdrawBatcher = [cShareA, cUSDC, vaultA, MBA];
  console.log(`WithdrawBatcher ${wdrA}`);

  const gate = await (await ethers.getContractFactory("GhostGate")).deploy(cUSDC, cShareA, vaultA, MBA);
  await gate.waitForDeployment();
  const gateA = await gate.getAddress();
  args.GhostGate = [cUSDC, cShareA, vaultA, MBA];
  console.log(`GhostGate ${gateA}`);

  const out = {
    network: "sepolia",
    chainId: 11155111,
    deployer: d.address,
    oracle: ORACLE,
    chainlinkEthUsd: CHAINLINK,
    registry: REGISTRY,
    registryEnforced: false,
    pool: poolA,
    markets: {
      "0": { name: "cWETH → cUSDC", collateral: cWETH, debt: cUSDC, lltvBps: 8000 },
      "1": { name: "cUSDC → cWETH", collateral: cUSDC, debt: cWETH, lltvBps: 8000 },
      "2": { name: "csteakcUSDC → cUSDC (vault)", collateral: cShareA, debt: cUSDC, lltvBps: 9000, vault: vaultA },
    },
    tokens: {
      cUSDC,
      cWETH,
      usdcUnderlying: USDC_UNDERLYING,
      wethUnderlying: WETH_UNDERLYING,
      cSHARE: cShareA,
    },
    market2: { vault: vaultA, cSHARE: cShareA, depositBatcher: depA, withdrawBatcher: wdrA },
    ghostGate: gateA,
    constructorArgs: args,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sepolia.json"), JSON.stringify(out, null, 2));
  console.log(`\nSaved → deployments/sepolia.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
