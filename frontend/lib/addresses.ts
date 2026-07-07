// GhostLend Sepolia production addresses (deployments/sepolia.json, CP6). Single source for the frontend.
export const CHAIN_ID = 11155111;

export const ADDR = {
  // PHASE-2 redeploy (audit-fixed GhostLendPool + fresh Market2 stack). oracle/cUSDC/cWETH/underlyings reused.
  pool: "0x1E7Bc12dD59600Ec5A801942e84B26c5ffe860b7",
  oracle: "0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495",
  chainlinkEthUsd: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  gate: "0xb3D9A7c8c8F0E721f9e69bb3eC08a0CB6a03cb95",
  vault: "0xfaC681ccB925863fa336F89aa81c272b97593838",
  depositBatcher: "0xc0C68055A20849ea3892E2343A8320A8A8E9FA43",
  withdrawBatcher: "0x97576Eb9b73B255fB1D813BA69D17E1E57941112",
  cUSDC: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
  cWETH: "0x46208622DA27d91db4f0393733C8BA082ed83158",
  cSHARE: "0x324A43A9269eB59f23713314df977272c2B8f8d8", // csteakcUSDC
  usdcUnderlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
  wethUnderlying: "0xff54739b16576FA5402F211D0b938469Ab9A5f3F",
} as const;

// ONE grantPermit covers every contract that holds encrypted state we ever decrypt for the user:
// the pool (positions), all three confidential tokens, the gate, and both batchers.
export const PERMIT_CONTRACTS: `0x${string}`[] = [
  ADDR.pool,
  ADDR.cUSDC,
  ADDR.cWETH,
  ADDR.cSHARE,
  ADDR.gate,
  ADDR.depositBatcher,
  ADDR.withdrawBatcher,
];

// Market table (matches on-chain market ids 0/1/2).
export type MarketDef = {
  id: number;
  coll: string;
  borrow: string;
  collAddr: `0x${string}`;
  borrowAddr: `0x${string}`;
  lltv: number;
  sub: string;
  oracle: string;
  vaultPriced: boolean;
  collLabel: string;
};

export const MARKETS: MarketDef[] = [
  { id: 0, coll: "cWETH", borrow: "cUSDC", collAddr: ADDR.cWETH, borrowAddr: ADDR.cUSDC, lltv: 80,
    sub: "Borrow cUSDC against cWETH", oracle: "Chainlink ETH / USD", vaultPriced: false, collLabel: "cWETH" },
  { id: 1, coll: "cUSDC", borrow: "cWETH", collAddr: ADDR.cUSDC, borrowAddr: ADDR.cWETH, lltv: 80,
    sub: "Borrow cWETH against cUSDC", oracle: "Chainlink ETH / USD", vaultPriced: false, collLabel: "cUSDC" },
  { id: 2, coll: "csteakcUSDC", borrow: "cUSDC", collAddr: ADDR.cSHARE, borrowAddr: ADDR.cUSDC, lltv: 90,
    sub: "Borrow cUSDC against your Earn (vault) position", oracle: "Vault share price", vaultPriced: true,
    collLabel: "csteakcUSDC — confidential vault share" },
];

export const EXPLORER = "https://sepolia.etherscan.io";
