"use client";
import { useAccount } from "wagmi";
import { css } from "@/lib/css";
import { NavProvider, useNav } from "@/lib/nav";
import { ToastProvider } from "@/components/Toast";
import { Sidebar } from "@/components/Sidebar";
import { Wizard } from "@/components/Wizard";
import { shortAddr } from "@/lib/format";
import { Dashboard } from "@/components/screens/Dashboard";
import { Markets } from "@/components/screens/Markets";
import { Position } from "@/components/screens/Position";
import { Leverage } from "@/components/screens/Leverage";
import { Vault } from "@/components/screens/Vault";
import { GhostGate } from "@/components/screens/GhostGate";
import { Faucet } from "@/components/screens/Faucet";
import { Status } from "@/components/screens/Status";

function StatusStrip() {
  const { address, isConnected } = useAccount();
  return (
    <div style={css("display:flex;justify-content:flex-end;align-items:center;gap:9px;padding:2px 2px 18px")}>
      <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--display);color:var(--ink-2)")}>
        <span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2;box-shadow:0 0 0 3px rgba(138,99,210,.14)")} />Sepolia testnet
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
            <Screen />
          </main>
        </div>
        <Wizard />
      </NavProvider>
    </ToastProvider>
  );
}
