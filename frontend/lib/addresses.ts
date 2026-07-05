// GhostLend Sepolia production addresses (deployments/sepolia.json, CP6). Single source for the frontend.
export const CHAIN_ID = 11155111;

export const ADDR = {
  pool: "0x854E0b51e5b7F13386fFea353CF6275C4EE16B47",
  oracle: "0x0883620ac3cbfe3ff28efb52Ee2998418AAc8495",
  chainlinkEthUsd: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  gate: "0xE90c95e8d3D82D3Ba5d309a3a9BE7575478dCaBC",
  vault: "0x7B560a3EFD4568Ea92f77963125F1C350bc65547",
  depositBatcher: "0x0f425d953C7808DC7E1cD4D9Fa4c0e5faCaF5567",
  withdrawBatcher: "0x541979A755C4c31E828E9B9B6A2fD1b51845c5D3",
  cUSDC: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
  cWETH: "0x46208622DA27d91db4f0393733C8BA082ed83158",
  cSHARE: "0x09959630F67a6b8818b464487877DbDd6f4B14aE", // csteakcUSDC
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
