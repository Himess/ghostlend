"use client";
import { useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { css, cssm } from "@/lib/css";
import { NavProvider, useNav } from "@/lib/nav";
import { ToastProvider } from "@/components/Toast";
import { Sidebar } from "@/components/Sidebar";
import { Wizard } from "@/components/Wizard";
import { shortAddr } from "@/lib/format";
import { CHAIN_ID } from "@/lib/addresses";
import { Dashboard } from "@/components/screens/Dashboard";
import { Markets } from "@/components/screens/Markets";
import { Position } from "@/components/screens/Position";
import { Balances } from "@/components/screens/Balances";
import { Leverage } from "@/components/screens/Leverage";
import { Vault } from "@/components/screens/Vault";
import { GhostGate } from "@/components/screens/GhostGate";
import { Faucet } from "@/components/screens/Faucet";
import { Status } from "@/components/screens/Status";

const CHAIN_NAMES: Record<number, string> = { 1: "Ethereum Mainnet", 11155111: "Sepolia", 137: "Polygon", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 56: "BNB Chain" };
const chainLabel = (id?: number) => (id ? CHAIN_NAMES[id] || `chain ${id}` : "");

// GhostLend is a Sepolia-only dApp. The connected wallet can be on any network; reflect the REAL chain
// (not a hardcoded chip) and, when it's wrong, auto-prompt a switch to Sepolia + offer a manual button.
function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const autoTried = useRef(false);
  const wrong = isConnected && chainId !== undefined && chainId !== CHAIN_ID;

  useEffect(() => {
    if (wrong && !autoTried.current) {
      autoTried.current = true; // one-shot: prompt once, then leave it to the manual button (no loop on reject)
      switchChain({ chainId: CHAIN_ID });
    }
    if (!wrong) autoTried.current = false; // re-arm once back on Sepolia
  }, [wrong, switchChain]);

  if (!wrong) return null;
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:#fbe9e7;border:1px solid #f0b5ad;border-radius:14px;padding:12px 16px;margin-bottom:14px")}>
      <span style={css("display:inline-flex;align-items:center;gap:9px;font:600 13px var(--display);color:#8a2a1c")}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none")}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
        Wrong network — your wallet is on <b style={css("color:#7a1f12")}>{chainLabel(chainId)}</b>. GhostLend runs on Sepolia.
      </span>
      <button
        onClick={() => switchChain({ chainId: CHAIN_ID })}
        disabled={isPending}
        style={cssm("padding:8px 16px;border-radius:999px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 12.5px var(--display);cursor:pointer;white-space:nowrap", isPending ? { opacity: 0.6, cursor: "not-allowed" } : undefined)}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </button>
    </div>
  );
}

function StatusStrip() {
  const { address, isConnected, chainId } = useAccount();
  const onSepolia = chainId === CHAIN_ID;
  const wrong = isConnected && !onSepolia;
  return (
    <div style={css("display:flex;justify-content:flex-end;align-items:center;gap:9px;padding:2px 2px 18px")}>
      <span style={cssm("display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--display);color:var(--ink-2)", wrong ? { background: "#fbe9e7", borderColor: "#f0b5ad", color: "#8a2a1c" } : undefined)}>
        <span style={cssm("width:7px;height:7px;border-radius:50%;background:#8a63d2;box-shadow:0 0 0 3px rgba(138,99,210,.14)", wrong ? { background: "#c0392b", boxShadow: "0 0 0 3px rgba(192,57,43,.14)" } : undefined)} />
        {wrong ? chainLabel(chainId) : "Sepolia testnet"}
      </span>
      {isConnected && (
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--mono);color:var(--ink)")}>
          <span style={css("width:7px;height:7px;border-radius:50%;background:var(--green)")} />{shortAddr(address)}
        </span>
      )}
    </div>
  );
}

function Screen() {
  const { route } = useNav();
  switch (route) {
    case "dashboard": return <Dashboard />;
    case "markets": return <Markets />;
    case "position": return <Position />;
    case "balances": return <Balances />;
    case "leverage": return <Leverage />;
    case "vault": return <Vault />;
    case "ghostgate": return <GhostGate />;
    case "faucet": return <Faucet />;
    case "status": return <Status />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <ToastProvider>
      <NavProvider>
        <div style={css("display:flex;min-height:100vh;background:var(--bg);padding:14px;gap:14px")}>
          <Sidebar />
          <main style={css("flex:1;min-width:0;display:flex;flex-direction:column")}>
            <StatusStrip />
            <NetworkBanner />
            <Screen />
          </main>
        </div>
        <Wizard />
      </NavProvider>
    </ToastProvider>
  );
}
