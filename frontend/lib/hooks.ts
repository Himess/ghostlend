"use client";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { poolAbi, oracleAbi, gateAbi, vaultAbi } from "./abis";
import { ADDR, MARKETS } from "./addresses";

const POOL = { address: ADDR.pool as `0x${string}`, abi: poolAbi };

// ---- InterestRateModel replicated from contracts/libraries/InterestRateModel.sol (util is a real read) ----
// base 2% + slope1 4% to the 80% kink, then slope2 60% to 100%.
export function borrowAprPct(utilBps: number): number {
  const u = Math.min(10000, Math.max(0, utilBps));
  const aprBps = u <= 8000 ? 200 + (400 * u) / 8000 : 200 + 400 + (6000 * (u - 8000)) / 2000;
  return aprBps / 100;
}
export function supplyApyPct(utilBps: number, reserveBps = 1000): number {
  return (borrowAprPct(utilBps) * utilBps * (10000 - reserveBps)) / 1e8;
}

// ---- ETH/USD from the on-chain OracleAdapter (8 decimals) ----
export function useEthPrice(): number | null {
  const { data } = useReadContract({ address: ADDR.oracle as `0x${string}`, abi: oracleAbi, functionName: "priceE8" });
  return data != null ? Number(data) / 1e8 : null;
}

// USD value of ONE 6-dec confidential unit of `token`. cUSDC = $1; cWETH via ETH price; csteakcUSDC via share price.
export function tokenUsdPerUnit(token: string, ethUsd: number | null, sharePrice6: bigint | null): number {
  if (token === "cUSDC") return 1e-6;
  if (token === "cWETH") return (ethUsd ?? 0) * 1e-6; // 1 cWETH unit = 1e-6 WETH
  if (token === "csteakcUSDC") return (sharePrice6 != null ? Number(sharePrice6) / 1e6 : 1) * 1e-6;
  return 1e-6;
}

// ---- market data (real marketInfo + epoch) for all markets ----
export type MarketLive = {
  id: number; util: number; lltv: number; apr: number; apy: number;
  epochId: number; borrowIndex: bigint; supplyIndex: bigint;
};

export function useMarketsLive() {
  const contracts = MARKETS.flatMap((m) => [
    { ...POOL, functionName: "marketInfo", args: [m.id] } as const,
    { ...POOL, functionName: "currentEpochId", args: [m.id] } as const,
    { ...POOL, functionName: "leverageCarry", args: [m.id, 2, 0] } as const, // effective borrow APR source
  ]);
  const { data, isLoading, refetch } = useReadContracts({ contracts, query: { refetchInterval: 15000 } });
  const markets: MarketLive[] = MARKETS.map((m, i) => {
    const info = data?.[i * 3]?.result as any;
    const epochId = data?.[i * 3 + 1]?.result as any;
    const carry = data?.[i * 3 + 2]?.result as any;
    const util = info ? Number(info[7]) : 0; // lastUtilizationBps
    const reserveBps = info ? Number(info[4]) : 1000;
    // Effective on-chain borrow APR = what the pool actually accrues (leverageCarry annualizes the STORED
    // 1e9 per-sec rate; it truncates vs the nominal IRM curve). Show this consistently — never the nominal.
    const apr = carry ? Number(carry[0]) / 100 : borrowAprPct(util);
    const apy = (apr * util * (10000 - reserveBps)) / 1e8; // supply APY derived from the effective borrow rate
    return {
      id: m.id, util, lltv: m.lltv, apr, apy,
      epochId: epochId != null ? Number(epochId) : 0,
      borrowIndex: info ? (info[5] as bigint) : 1_000_000n,
      supplyIndex: info ? (info[6] as bigint) : 1_000_000n,
    };
  });
  return { markets, isLoading, refetch };
}

// Effective on-chain borrow APR (%) for a market. The pool's leverageCarry() annualizes the STORED
// per-second rate (1e9 fixed-point), which truncates vs the nominal IRM curve — this is what interest
// actually accrues at on-chain. lev/vaultApy args don't affect the returned borrowAprBps, so pass (2, 0).
export function useEffectiveBorrowApr(marketId: number): number {
  const { data } = useReadContract({
    ...POOL,
    functionName: "leverageCarry",
    args: [marketId, 2, 0],
    query: { refetchInterval: 15000 },
  });
  return data ? Number((data as any)[0]) / 100 : 0;
}

// ---- GhostGate current window ----
export function useGhostGate() {
  const gate = { address: ADDR.gate as `0x${string}`, abi: gateAbi };
  const { data: cw } = useReadContract({ ...gate, functionName: "currentWindow", query: { refetchInterval: 5000 } });
  const w = cw != null ? Number(cw) : 1;
  const { data: info } = useReadContract({ ...gate, functionName: "windowInfo", args: [BigInt(w)], query: { refetchInterval: 5000 } });
  const { data: disp } = useReadContract({ ...gate, functionName: "dispatchableIn", query: { refetchInterval: 3000 } });
  const status = info ? Number((info as any)[2]) : 0; // enum
  return {
    window: w,
    pinRate6: info ? (info as any)[0] as bigint : 1_000_000n,
    status,
    statusLabel: ["None", "Pending", "Dispatched", "Routing", "Finalized", "Canceled"][status] || "—",
    dispatchableIn: disp != null ? Number(disp) : 0,
  };
}

// ---- vault stats (real share price + totals) ----
export function useVaultStats() {
  const v = { address: ADDR.vault as `0x${string}`, abi: vaultAbi };
  const { data } = useReadContracts({
    contracts: [
      { ...v, functionName: "sharePrice6" },
      { ...v, functionName: "totalAssets" },
      { ...v, functionName: "totalSupply" },
    ],
    query: { refetchInterval: 15000 },
  });
  const sharePrice6 = (data?.[0]?.result as bigint) ?? 1_000_000n;
  const totalAssets = (data?.[1]?.result as bigint) ?? 0n;
  const totalSupply = (data?.[2]?.result as bigint) ?? 0n;
  // vault APY proxy from share price appreciation vs 1.0 (demo: keeper drips yield). Floor at a small base.
  const apy = Math.max(0, (Number(sharePrice6) / 1e6 - 1) * 100);
  return { sharePrice6, totalAssets, totalSupply, apy };
}

// ---- encrypted position handles (decrypt on-click) ----
export function usePositionHandles(marketId: number) {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    ...POOL, functionName: "positionOf", args: [marketId, (address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 20000 },
  });
  const r = data as any;
  return {
    scaledSupply: r?.[0] as `0x${string}` | undefined,
    collateral: r?.[1] as `0x${string}` | undefined,
    scaledDebt: r?.[2] as `0x${string}` | undefined,
    lastError: r?.[3] as `0x${string}` | undefined,
    nonce: r?.[4] != null ? Number(r[4]) : 0,
    refetch,
  };
}
