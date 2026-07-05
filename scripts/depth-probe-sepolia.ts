// CP2 ruling condition #2: one-time LIVE worst-case borrow-with-interest depth check against the
// deployed HCULimit v0.3.0. Deploys a THROWAWAY probe pool, seeds a position, forces index → MAX_INDEX,
// runs one borrow, and reports depth headroom (or flags if v0.3.0 enforces tighter than 5M). Then abandon.
// Run: npx hardhat run scripts/depth-probe-sepolia.ts --network sepolia
import { ethers, fhevm } from "hardhat";

const CHAINLINK = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const REGISTRY = "0x2f0750Bbb0A246059d80e94c454586a7F27a128e";
const cUSDC = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const cUSDCu = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";
const cWETH = "0x46208622DA27d91db4f0393733C8BA082ed83158";
const cWETHu = "0xff54739b16576FA5402F211D0b938469Ab9A5f3F";
const MAX_INDEX = 4_000_000n;
const UNTIL = 4_000_000_000;
const ERC20 = ["function mint(address,uint256)", "function approve(address,uint256) returns (bool)"];
const WRAP = ["function wrap(address,uint256) returns (bytes32)", "function setOperator(address,uint48)"];

async function main() {
  await fhevm.initializeCLIApi();
  const [me] = await ethers.getSigners();
  const enc = (amt: bigint, to: string) => fhevm.createEncryptedInput(to, me.address).add64(amt).encrypt();

  const Probe = await ethers.getContractFactory("ThrowawayDepthProbe");
  const oracle = await (await ethers.getContractFactory("OracleAdapter")).deploy(CHAINLINK);
  await oracle.waitForDeployment();
  const pool = await Probe.deploy(await oracle.getAddress(), REGISTRY, [
    [cWETH, cUSDC, true, false, 8000, 500, 1000, ethers.ZeroAddress],
    [cUSDC, cWETH, false, true, 8000, 500, 1000, ethers.ZeroAddress],
  ]);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`ThrowawayDepthProbe: ${poolAddr}`);

  // seed: supply cUSDC liquidity + deposit cWETH collateral + one borrow (creates debt)
  const usdc = new ethers.Contract(cUSDCu, ERC20, me);
  const usdcW = new ethers.Contract(cUSDC, WRAP, me);
  const weth = new ethers.Contract(cWETHu, ERC20, me);
  const wethW = new ethers.Contract(cWETH, WRAP, me);
  await (await usdc.mint(me.address, 2_000_000n)).wait();
  await (await usdc.approve(cUSDC, 2_000_000n)).wait();
  await (await usdcW.wrap(me.address, 2_000_000n)).wait();
  await (await usdcW.setOperator(poolAddr, UNTIL)).wait();
  await (await weth.mint(me.address, 2_000_000n)).wait();
  await (await weth.approve(cWETH, 2_000_000n)).wait();
  await (await wethW.wrap(me.address, 2_000_000n)).wait();
  await (await wethW.setOperator(poolAddr, UNTIL)).wait();

  let e = await enc(1_500_000n, poolAddr);
  await (await pool.supply(0, e.handles[0], e.inputProof)).wait();
  e = await enc(1_000_000n, poolAddr);
  await (await pool.depositCollateral(0, e.handles[0], e.inputProof)).wait();
  e = await enc(200_000n, poolAddr);
  await (await pool.borrow(0, e.handles[0], e.inputProof)).wait();
  console.log("seeded position (supply/deposit/borrow at index 1e6)");

  // force index → MAX_INDEX so the borrow runs the full (non-fast-path) conversions
  await (await pool.setIndexForProbe(0, MAX_INDEX, MAX_INDEX)).wait();
  console.log(`forced borrowIndex=${(await pool.marketInfo(0))[5]}`);

  // THE MEASUREMENT: worst-case borrow-with-interest. If the deployed HCULimit v0.3.0 enforces < ~3.6M
  // depth, this tx REVERTS with HCUTransactionDepthLimitExceeded — which is the flag we're checking for.
  e = await enc(50_000n, poolAddr);
  try {
    const rc = await (await pool.borrow(0, e.handles[0], e.inputProof)).wait();
    let hcu: any = null;
    try {
      hcu = fhevm.computeTransactionHCU(rc);
    } catch {}
    console.log(`\n✅ LIVE DEPTH HEADROOM CONFIRMED — borrow-with-interest (index=MAX_INDEX) succeeded on Sepolia.`);
    console.log(`   tx=${rc.hash} gasUsed=${rc.gasUsed}${hcu ? ` HCU global=${hcu.globalHCU} depth=${hcu.maxHCUDepth}` : ""}`);
    console.log(`   → deployed HCULimit v0.3.0 does NOT enforce tighter than our ~3.57M-depth borrow.`);
  } catch (err: any) {
    const msg = err.shortMessage || err.message?.split("\n")[0] || String(err);
    console.log(`\n⚠ FLAG: worst-case borrow REVERTED on Sepolia — ${msg}`);
    console.log(`   → deployed HCULimit v0.3.0 may enforce a tighter cap than the 5M mock. Investigate before CP3 relies on borrow-with-interest.`);
  }
  console.log(`\n(Throwaway probe ${poolAddr} — abandon; not a production deploy.)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
