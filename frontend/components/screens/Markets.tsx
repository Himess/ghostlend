"use client";
import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useConfidentialSetOperator, useEncrypt } from "@zama-fhe/react-sdk";
import { css } from "@/lib/css";
import { useNav, MarketAction } from "@/lib/nav";
import { useEthPrice, useMarketsLive, useVaultStats, tokenUsdPerUnit } from "@/lib/hooks";
import { compact, shortAddr, DOTS } from "@/lib/format";
import { ADDR, MARKETS } from "@/lib/addresses";
import { poolAbi } from "@/lib/abis";
import { useToast } from "@/components/Toast";

// ---- shared token → color/initial (matches the design's colorFor/initFor) ----
const TOKEN_COLOR: Record<string, string> = { cWETH: "#3a3f4a", cUSDC: "#2775ca", csteakcUSDC: "#1c8f5a" };
const colorFor = (t: string) => TOKEN_COLOR[t] || "#8a867c";
const initFor = (t: string) => (t === "csteakcUSDC" ? "S" : t && t.length > 1 ? t[1].toUpperCase() : "?");

function TokenDuo({ coll, borrow, size }: { coll: string; borrow: string; size: "sm" | "lg" }) {
  const lg = size === "lg";
  const base: React.CSSProperties = {
    width: lg ? 44 : 30, height: lg ? 44 : 30, borderRadius: "50%",
    border: `${lg ? "2.5px" : "2px"} solid var(--surface)`, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--mono)", fontWeight: 700, fontSize: lg ? 15 : 11,
  };
  return (
    <span style={css("display:inline-flex;align-items:center;flex:none")}>
      <span style={{ ...base, background: colorFor(coll), position: "relative", zIndex: 2 }}>{initFor(coll)}</span>
      <span style={{ ...base, background: colorFor(borrow), marginLeft: lg ? -15 : -10 }}>{initFor(borrow)}</span>
    </span>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    background: "none", border: "none", cursor: "pointer", padding: "0 0 12px",
    fontFamily: "var(--display)", fontSize: "14.5px", fontWeight: active ? 700 : 500,
    color: active ? "var(--ink)" : "var(--ink-3)",
    borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
    marginBottom: "-1px",
  };
}
function segStyle(active: boolean): React.CSSProperties {
  return {
    flex: "1 1 auto", textAlign: "center", cursor: "pointer", whiteSpace: "nowrap",
    padding: "7px 6px", borderRadius: "9px",
    fontFamily: "var(--display)", fontSize: "12px", fontWeight: active ? 700 : 550,
    color: active ? "#1a1a1a" : "var(--ink-2)",
    backgroundColor: active ? "#fff" : "transparent",
    border: active ? "1px solid var(--line-2)" : "1px solid transparent",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,.06)" : "none",
  };
}

const VERB: Record<MarketAction, string> = { supply: "Supply", withdraw: "Withdraw", deposit: "Deposit collateral", borrow: "Borrow", repay: "Repay" };
const PREV_LABEL: Partial<Record<MarketAction, string>> = { supply: "Supplied", withdraw: "Supplied", deposit: "Collateral", repay: "Debt" };
const OP_MAP: Record<MarketAction, "supply" | "withdrawSupply" | "depositCollateral" | "borrow" | "repay"> = {
  supply: "supply", withdraw: "withdrawSupply", deposit: "depositCollateral", borrow: "borrow", repay: "repay",
};
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// Illustrative deployment dates — the pool contract exposes no market-creation timestamp on-chain.
const CREATED: Record<number, string> = { 0: "2026-05-12", 1: "2026-05-12", 2: "2026-06-19" };

// Illustrative only. A production build reads the pool's OpExecuted(user, marketId, nonce) events
// (see poolAbi) per marketId to populate this feed — amounts stay encrypted end-to-end either way.
const ACTIVITY_FEED: { type: string; addr: string; time: string }[] = [
  { type: "Borrow", addr: "0x3a7e19c4b2f68d05a1e93c7f4b6a8d2e5c0f9b31", time: "2m ago" },
  { type: "Supply", addr: "0x91c4a27f8e3b5d0c6a9f1e4b7d2c8a5f3e0b6d19", time: "9m ago" },
  { type: "Deposit collateral", addr: "0x5e21b8f4a2d69c0e3f7b1a5d8c2e6f0b4a9d3c71", time: "23m ago" },
  { type: "Repay", addr: "0xbe10f3c6a9e25d8b1f4a7c0e3d6b9a2f5c8e1b40", time: "41m ago" },
];

// ==================================================================================
// LIST
// ==================================================================================
function MarketList() {
  const { openMarket } = useNav();
  const { markets: live } = useMarketsLive();
  const vault = useVaultStats();

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Markets</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Isolated lending markets. Rates and utilization are public; individual positions never are.</p>
        </div>
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2);font:600 11.5px var(--display)")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
          Rates are public
        </span>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px")}>
        {MARKETS.map((m) => {
          const lv = live.find((l) => l.id === m.id);
          const util = lv?.util ?? 0;
          const apy = lv?.apy ?? 0;
          const apr = lv?.apr ?? 0;
          const suppliedStr = m.id === 2 ? compact(Number(vault.totalAssets) / 1e6) : "—";
          const suppliedTok = m.id === 2 ? "cUSDC" : "";
          return (
            <div key={m.id} onClick={() => openMarket(m.id, "borrow")} style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);cursor:pointer;display:flex;flex-direction:column;transition:box-shadow .16s,border-color .16s")}>
                <div style={css("padding:22px 22px 0;display:flex;align-items:center;gap:11px")}>
                  <TokenDuo coll={m.coll} borrow={m.borrow} size="sm" />
                  <span style={css("font:750 18px var(--display);letter-spacing:-.01em")}>{m.coll} / {m.borrow}</span>
                  <span style={css("margin-left:auto;padding:4px 9px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:700 10.5px var(--mono);color:var(--ink-2);white-space:nowrap")}>LLTV {m.lltv}%</span>
                </div>
                <div style={css("padding:9px 22px 0")}><span style={css("font:400 12.5px/1.4 var(--display);color:var(--ink-3)")}>{m.sub}</span></div>
                <div style={css("padding:20px 22px 0;display:flex;align-items:flex-end;gap:24px 28px;flex-wrap:wrap")}>
                  <div style={css("display:flex;flex-direction:column;gap:5px")}>
                    <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Supply APY</span>
                    <span style={css("font:800 30px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{apy.toFixed(2)}%</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:5px")}>
                    <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Borrow APR</span>
                    <span style={css("font:700 18px var(--display);color:var(--ink-2);font-variant-numeric:tabular-nums;line-height:1.2")}>{apr.toFixed(2)}%</span>
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:5px;margin-left:auto;align-items:flex-end")}>
                    <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Total supplied</span>
                    <span style={css("font:700 15px var(--mono);color:var(--ink-2);line-height:1.2")}>{suppliedStr} <span style={css("font:600 11px var(--mono);color:var(--ink-3)")}>{suppliedTok}</span></span>
                  </div>
                </div>
                <div style={css("padding:18px 22px 0")}>
                  <div style={css("display:flex;justify-content:space-between;margin-bottom:7px")}><span style={css("font:600 11.5px var(--display);color:var(--ink-2)")}>Utilization</span><span style={css("font:700 12px var(--mono);color:var(--ink)")}>{(util / 100).toFixed(0)}%</span></div>
                  <div style={css("height:7px;border-radius:999px;background:var(--line-2);overflow:hidden")}><div style={css(`height:100%;border-radius:999px;background:linear-gradient(90deg,#ffe680,#ffd208);width:${util / 100}%`)} /></div>
                  <p style={css("margin:9px 0 0;font:400 11.5px/1.45 var(--display);color:var(--ink-3)")}>Utilization is revealed per epoch — individual positions never.</p>
                </div>
                <div style={css("padding:14px 22px 0")}>
                  <span style={css("display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:600 11px var(--mono);color:var(--ink-2)")}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
                    rates update in ~5m
                  </span>
                </div>
                <div style={css("display:flex;gap:9px;padding:18px 22px 22px;margin-top:8px")}>
                  <button onClick={(e) => { e.stopPropagation(); openMarket(m.id, "supply"); }} style={css("flex:1;padding:11px;border-radius:12px;border:1px solid var(--line-2);background:#fff;font:650 13px var(--display);color:var(--ink);cursor:pointer")}>Supply</button>
                  <button onClick={(e) => { e.stopPropagation(); openMarket(m.id, "borrow"); }} style={css("flex:1;padding:11px;border-radius:12px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);font:700 13px var(--display);color:#1a1a1a;cursor:pointer;box-shadow:0 4px 12px rgba(255,210,8,.26)")}>Borrow</button>
                </div>
              </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================================================================================
// DETAIL
// ==================================================================================
function MarketDetail({ marketId }: { marketId: number }) {
  const { action, setAction, backToMarkets } = useNav();
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const { markets: live } = useMarketsLive();
  const { sharePrice6 } = useVaultStats();
  const ethUsd = useEthPrice();

  const md = MARKETS[marketId];
  const lv = live.find((l) => l.id === marketId);

  const [detailTab, setDetailTab] = useState<"overview" | "activity">("overview");
  const [collInput, setCollInput] = useState("");
  const [borrowInput, setBorrowInput] = useState("");
  const [actionAmt, setActionAmt] = useState("");
  const [expiry, setExpiry] = useState<"1h" | "24h" | "7d">("24h");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Design behavior: switching the action segment always drops back to step 1.
  useEffect(() => { setApproved(false); }, [action]);

  // The pool pulls the COLLATERAL token for supply/withdraw/deposit/borrow, the DEBT token for repay.
  const operatorToken = action === "repay" ? md.borrowAddr : md.collAddr;
  const { mutateAsync: setOperator } = useConfidentialSetOperator(operatorToken);
  const { mutateAsync: encrypt } = useEncrypt();
  const { writeContractAsync } = useWriteContract();

  const isBorrowAct = action === "borrow";
  const showSingle = !isBorrowAct;
  const util = lv?.util ?? 0;
  const apy = lv?.apy ?? 0;
  const apr = lv?.apr ?? 0;

  // ---- UNITS FIX: value both legs of the borrow preview in USD before comparing them ----
  const usdPerToken = (t: string) => tokenUsdPerUnit(t, ethUsd, sharePrice6) * 1e6;
  const ci = Number(collInput) || 0;
  const bi = Number(borrowInput) || 0;
  const collUsd = ci * usdPerToken(md.coll);
  const loanUsd = bi * usdPerToken(md.borrow);
  const dcAfter = collUsd > 0 ? Math.min(999, (loanUsd / collUsd) * 100) : 0;
  const dcHealthy = dcAfter < md.lltv;
  const dcBarW = `${Math.min(100, dcAfter)}%`;
  const lltvMarkW = `${Math.min(100, md.lltv)}%`;

  const actionToken = action === "deposit" ? md.coll : md.borrow;
  const amt = Number(actionAmt) || 0;
  const reduceAct = action === "withdraw" || action === "repay";
  const prevBefore = reduceAct ? DOTS : "0";
  const prevAfter = reduceAct ? DOTS : `${fmt(amt)} ${actionToken}`;
  const prevLabel = PREV_LABEL[action] || "Amount";

  async function submitOp(fn: "supply" | "withdrawSupply" | "depositCollateral" | "borrow" | "repay", amountStr: string) {
    const amt6 = BigInt(Math.floor((Number(amountStr) || 0) * 1e6));
    const enc = await encrypt({ values: [{ value: amt6, type: "euint64" }], contractAddress: ADDR.pool as `0x${string}`, userAddress: address as `0x${string}` });
    await writeContractAsync({ address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: fn, args: [marketId, enc.encryptedValues[0], enc.inputProof] });
  }

  async function handleApprove() {
    if (!isConnected) { toast("Connect your wallet first", "err"); return; }
    setBusy(true);
    try {
      const until = Math.floor(Date.now() / 1000) + (expiry === "1h" ? 3600 : expiry === "7d" ? 604800 : 86400);
      await setOperator({ operator: ADDR.pool as `0x${string}`, until });
      setApproved(true);
      toast(`Operator approved · expires in ${expiry}`);
    } catch {
      toast("Operator approval failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!isConnected || !address) { toast("Connect your wallet first", "err"); return; }
    setBusy(true);
    try {
      if (isBorrowAct) {
        if (ci > 0) await submitOp("depositCollateral", collInput);
        if (bi > 0) await submitOp("borrow", borrowInput);
      } else {
        await submitOp(OP_MAP[action], actionAmt);
      }
      toast(`${VERB[action]} submitted · clamped to your encrypted maximum`);
    } catch {
      toast("Transaction failed", "err");
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = approved ? `Confirm ${VERB[action]}` : "Approve operator";
  const ctaHandler = approved ? handleConfirm : handleApprove;

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <button onClick={backToMarkets} style={css("display:inline-flex;align-items:center;gap:7px;background:none;border:none;cursor:pointer;font:600 13px var(--display);color:var(--ink-2);padding:0;margin-bottom:20px")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>All markets
      </button>

      <div style={css("display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start")}>
        {/* MAIN COLUMN */}
        <div style={css("flex:1 1 500px;min-width:0")}>
          <div style={css("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
            <TokenDuo coll={md.coll} borrow={md.borrow} size="lg" />
            <h1 style={css("margin:0;font:800 38px/1 var(--display);letter-spacing:-.03em")}>{md.coll} / {md.borrow}</h1>
            <span style={css("padding:5px 11px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:700 12px var(--mono);color:var(--ink-2)")}>LLTV {md.lltv}%</span>
          </div>
          <p style={css("margin:12px 0 0;font:400 14.5px var(--display);color:var(--ink-2)")}>{md.sub}</p>
          <div style={css("display:flex;align-items:center;gap:9px;margin-top:14px;flex-wrap:wrap")}>
            <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--mono);color:var(--ink-2)")}>
              {shortAddr(ADDR.pool)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
            </span>
            <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--display);color:var(--ink-2)")}>
              <span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2")} />Sepolia
            </span>
          </div>

          <div style={css("display:flex;flex-wrap:wrap;gap:20px 40px;margin-top:28px")}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Supply APY</span><span style={css("font:800 30px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{apy.toFixed(2)}%</span></div>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Borrow APR</span><span style={css("font:800 30px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{apr.toFixed(2)}%</span></div>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Utilization</span><span style={css("font:800 30px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{(util / 100).toFixed(0)}%</span></div>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>LLTV</span><span style={css("font:800 30px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{md.lltv}%</span></div>
          </div>

          <div style={css("display:flex;gap:26px;margin-top:30px;border-bottom:1px solid var(--line)")}>
            <button style={tabStyle(detailTab === "overview")} onClick={() => setDetailTab("overview")}>Overview</button>
            <button style={tabStyle(detailTab === "activity")} onClick={() => setDetailTab("activity")}>Activity</button>
          </div>

          {detailTab === "overview" && (
            <>
              <div style={css("margin-top:26px")}>
                <h3 style={css("margin:0 0 6px;font:750 16px var(--display);letter-spacing:-.01em")}>Market Attributes</h3>
                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 44px")}>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Collateral</span><span style={css("font:650 13px var(--display);color:var(--ink);display:inline-flex;align-items:center;gap:7px")}><span style={css("width:18px;height:18px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 8px var(--mono)")}>c</span>{md.collLabel}</span></div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Oracle</span><span style={css("font:650 13px var(--display);color:var(--ink)")}>{md.oracle}</span></div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Loan</span><span style={css("font:650 13px var(--display);color:var(--ink);display:inline-flex;align-items:center;gap:7px")}><span style={css("width:18px;height:18px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 8px var(--mono)")}>c</span>{md.borrow}</span></div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Utilization</span><span style={css("font:650 13px var(--display);color:var(--ink)")}>{(util / 100).toFixed(0)}% <span style={css("font:400 11px var(--display);color:var(--ink-3)")}>· per-epoch</span></span></div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>LLTV</span><span style={css("font:650 13px var(--mono);color:var(--ink)")}>{md.lltv}%</span></div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Created on</span><span style={css("font:650 13px var(--mono);color:var(--ink)")}>{CREATED[md.id]}</span></div>
                </div>
              </div>
              <div style={css("margin-top:24px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px 24px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
                <div style={css("display:flex;flex-direction:column;gap:9px")}>
                  <span style={css("display:inline-flex;align-items:center;gap:7px;font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                    Positions
                  </span>
                  <span style={css("font:800 30px var(--display);letter-spacing:.05em;color:var(--ink)")}>{DOTS}</span>
                </div>
                <p style={css("margin:0;flex:1;min-width:230px;font:400 13.5px/1.6 var(--display);color:var(--ink-3)")}>Individual positions are encrypted; only <b style={css("color:var(--ink-2);font-weight:600")}>per-epoch aggregates</b> are ever revealed. There is no public table of who holds what.</p>
              </div>
            </>
          )}

          {detailTab === "activity" && (
            <div style={css("margin-top:22px;background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
              <div style={css("display:grid;grid-template-columns:1.3fr 1.3fr 1fr .8fr;padding:13px 22px;border-bottom:1px solid var(--line);font:650 10px var(--display);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3)")}><span>Event</span><span>Address</span><span>Amount</span><span style={css("text-align:right")}>Time</span></div>
              {ACTIVITY_FEED.map((a, i) => (
                <div key={i} style={css("display:grid;grid-template-columns:1.3fr 1.3fr 1fr .8fr;padding:14px 22px;border-bottom:1px solid var(--line);align-items:center")}>
                  <span><span style={css("display:inline-flex;padding:4px 10px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:650 11.5px var(--display);color:var(--ink-2);white-space:nowrap")}>{a.type}</span></span>
                  <span style={css("font:600 12.5px var(--mono);color:var(--ink-2)")}>{shortAddr(a.addr)}</span>
                  <span style={css("display:inline-flex;align-items:center;gap:6px;font:700 13px var(--mono);color:var(--ink-3)")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>{DOTS}</span>
                  <span style={css("font:500 12px var(--display);color:var(--ink-3);text-align:right")}>{a.time}</span>
                </div>
              ))}
              <div style={css("padding:13px 22px;font:400 12px var(--display);color:var(--ink-3);display:flex;align-items:center;gap:8px")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                Amounts are encrypted on-chain — the feed shows only event type, address and time.
              </div>
            </div>
          )}
        </div>

        {/* STICKY ACTION PANEL */}
        <div style={css("flex:1 1 330px;max-width:392px;position:sticky;top:14px;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 2px rgba(20,18,12,.03),0 12px 34px rgba(20,18,12,.05);padding:16px")}>
          <div style={css("display:flex;gap:2px;padding:4px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px")}>
            <button style={segStyle(action === "supply")} onClick={() => setAction("supply")}>Supply</button>
            <button style={segStyle(action === "withdraw")} onClick={() => setAction("withdraw")}>Withdraw</button>
            <button style={segStyle(action === "deposit")} onClick={() => setAction("deposit")}>Deposit</button>
            <button style={segStyle(action === "borrow")} onClick={() => setAction("borrow")}>Borrow</button>
            <button style={segStyle(action === "repay")} onClick={() => setAction("repay")}>Repay</button>
          </div>

          {isBorrowAct && (
            <>
              <div style={css("margin-top:12px;border:1px solid var(--line);border-radius:14px;padding:14px 16px")}>
                <div style={css("display:flex;justify-content:space-between;align-items:center;margin-bottom:6px")}><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>Supply Collateral {md.coll}</span><span style={css("font:700 10px var(--mono);color:var(--ink-3);letter-spacing:.05em")}>MAX</span></div>
                <div style={css("display:flex;align-items:center;gap:10px")}>
                  <input value={collInput} onChange={(e) => setCollInput(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={css("border:none;outline:none;background:none;font:750 26px var(--display);color:var(--ink);flex:1;min-width:0;padding:0;font-variant-numeric:tabular-nums")} />
                  <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font:650 13px var(--display);color:var(--ink);white-space:nowrap;flex:none")}><span style={css("width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 9px var(--mono)")}>c</span>{md.coll}</span>
                </div>
              </div>
              <div style={css("margin-top:10px;border:1px solid var(--line);border-radius:14px;padding:14px 16px")}>
                <div style={css("display:flex;justify-content:space-between;align-items:center;margin-bottom:6px")}><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>Borrow {md.borrow}</span></div>
                <div style={css("display:flex;align-items:center;gap:10px")}>
                  <input value={borrowInput} onChange={(e) => setBorrowInput(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={css("border:none;outline:none;background:none;font:750 26px var(--display);color:var(--ink);flex:1;min-width:0;padding:0;font-variant-numeric:tabular-nums")} />
                  <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font:650 13px var(--display);color:var(--ink);white-space:nowrap;flex:none")}><span style={css("width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 9px var(--mono)")}>c</span>{md.borrow}</span>
                </div>
              </div>
            </>
          )}

          {showSingle && (
            <div style={css("margin-top:12px;border:1px solid var(--line);border-radius:14px;padding:14px 16px")}>
              <div style={css("display:flex;justify-content:space-between;align-items:center;margin-bottom:6px")}><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>{VERB[action]}</span><span style={css("font:700 10px var(--mono);color:var(--ink-3);letter-spacing:.05em")}>MAX</span></div>
              <div style={css("display:flex;align-items:center;gap:10px")}>
                <input value={actionAmt} onChange={(e) => setActionAmt(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={css("border:none;outline:none;background:none;font:750 26px var(--display);color:var(--ink);flex:1;min-width:0;padding:0;font-variant-numeric:tabular-nums")} />
                <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font:650 13px var(--display);color:var(--ink);white-space:nowrap;flex:none")}><span style={css("width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 9px var(--mono)")}>c</span>{actionToken}</span>
              </div>
            </div>
          )}

          <div style={css("margin-top:14px;border-top:1px solid var(--line);padding-top:14px;display:flex;flex-direction:column;gap:11px")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Network</span><span style={css("display:inline-flex;align-items:center;gap:7px;font:650 12.5px var(--display);color:var(--ink)")}><span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2")} />Sepolia</span></div>

            {isBorrowAct && (
              <>
                <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Collateral</span><span style={css("font:650 12.5px var(--mono);color:var(--ink)")}><span style={css("color:var(--ink-3)")}>0</span> → {collInput || "0"} {md.coll}</span></div>
                <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Loan</span><span style={css("font:650 12.5px var(--mono);color:var(--ink)")}><span style={css("color:var(--ink-3)")}>0</span> → {borrowInput || "0"} {md.borrow}</span></div>
                <div>
                  <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Debt / Collateral</span><span style={css(`font:650 12.5px var(--mono);color:${dcAfter > 0 && !dcHealthy ? "var(--red)" : "var(--ink)"}`)}><span style={css("color:var(--ink-3)")}>0%</span> → {dcAfter.toFixed(1)}%</span></div>
                  <div style={css("position:relative;height:7px;border-radius:999px;background:var(--line-2);margin-top:7px;overflow:visible")}>
                    <div style={css(`position:absolute;left:0;top:0;height:7px;border-radius:999px;background:linear-gradient(90deg,#2fbf7a,#1c8f5a);width:${dcBarW}`)} />
                    <div style={css(`position:absolute;top:-3px;width:2px;height:13px;background:var(--red);border-radius:2px;left:${lltvMarkW}`)} />
                  </div>
                  <div style={css("margin-top:5px;font:600 10px var(--mono);color:var(--ink-3);text-align:right")}>vs LLTV {md.lltv}%</div>
                </div>
              </>
            )}

            {showSingle && (
              <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>{prevLabel}</span><span style={css("font:650 12.5px var(--mono);color:var(--ink)")}><span style={css("color:var(--ink-3)")}>{prevBefore}</span> → {prevAfter}</span></div>
            )}

            <p style={css("margin:3px 0 0;font:400 11.5px/1.5 var(--display);color:var(--ink-3);display:flex;gap:7px;align-items:flex-start")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none;margin-top:1px")}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
              Preview computed locally — on-chain these values are encrypted.
            </p>
          </div>

          <div style={css("margin-top:14px;border-top:1px solid var(--line);padding-top:14px;display:flex;flex-direction:column;gap:11px")}>
            <div style={css("display:flex;align-items:center;gap:10px")}>
              {approved ? (
                <span style={css("width:22px;height:22px;flex:none;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                </span>
              ) : (
                <span style={css("width:22px;height:22px;flex:none;border-radius:50%;background:var(--accent-soft);border:1px solid #f0e08f;color:#8a6d00;display:flex;align-items:center;justify-content:center;font:700 11px var(--mono)")}>1</span>
              )}
              <span style={css("font:600 13px var(--display);color:var(--ink)")}>Approve operator</span>
              <select value={expiry} onChange={(e) => setExpiry(e.target.value as "1h" | "24h" | "7d")} style={css("margin-left:auto;border:1px solid var(--line-2);border-radius:8px;padding:5px 8px;font:600 11.5px var(--mono);background:#fff;color:var(--ink);cursor:pointer")}>
                <option value="1h">1h</option><option value="24h">24h</option><option value="7d">7d</option>
              </select>
            </div>
            <div style={css("display:flex;align-items:center;gap:10px")}>
              {approved ? (
                <span style={css("width:22px;height:22px;flex:none;border-radius:50%;background:var(--accent-soft);border:1px solid #f0e08f;color:#8a6d00;display:flex;align-items:center;justify-content:center;font:700 11px var(--mono)")}>2</span>
              ) : (
                <span style={css("width:22px;height:22px;flex:none;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-3);display:flex;align-items:center;justify-content:center;font:700 11px var(--mono)")}>2</span>
              )}
              <span style={css("font:600 13px var(--display);color:var(--ink-2)")}>Confirm transaction</span>
            </div>
          </div>

          <button onClick={ctaHandler} disabled={busy} style={{ ...css("width:100%;margin-top:14px;padding:14px;border-radius:13px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 14px var(--display);cursor:pointer;box-shadow:0 5px 15px rgba(255,210,8,.3)"), opacity: busy ? 0.65 : 1 }}>{ctaLabel}</button>
          <p style={css("margin:11px 4px 2px;font:400 11px/1.5 var(--display);color:var(--ink-3);text-align:center")}>Transactions never revert on amount checks — requests are clamped to your encrypted maximum. Check My Position for the result flag.</p>
        </div>
      </div>
    </div>
  );
}

// ==================================================================================
export function Markets() {
  const { marketId } = useNav();
  return marketId == null ? <MarketList /> : <MarketDetail key={marketId} marketId={marketId} />;
}
