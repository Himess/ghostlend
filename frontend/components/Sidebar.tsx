"use client";
import { css } from "@/lib/css";
import { useNav, Route } from "@/lib/nav";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddr } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { CSSProperties, ReactNode } from "react";

function navStyle(active: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "11px", width: "100%",
    padding: "9px 12px", borderRadius: "12px", cursor: "pointer",
    fontFamily: "var(--display)", fontSize: "14.5px", fontWeight: active ? 650 : 500,
    letterSpacing: "-0.01em", textAlign: "left", whiteSpace: "nowrap",
    color: active ? "#1a1a1a" : "#4a473e", backgroundColor: "transparent",
    backgroundImage: active ? "linear-gradient(180deg,#fff0a6,#ffda40)" : "none",
    border: active ? "1px solid rgba(0,0,0,.05)" : "1px solid transparent",
    boxShadow: active ? "0 6px 15px rgba(255,210,8,.28), inset 0 1px 0 rgba(255,255,255,.55)" : "none",
  };
}

const ICON: Record<Route, ReactNode> = {
  dashboard: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.7"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.7"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.7"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.7"/></svg>),
  markets: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3.5" y1="20.5" x2="20.5" y2="20.5"/><rect x="5" y="11" width="3.4" height="7.2" rx="1"/><rect x="10.3" y="5.5" width="3.4" height="12.7" rx="1"/><rect x="15.6" y="8.5" width="3.4" height="9.7" rx="1"/></svg>),
  position: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7.5 2.7v5.5c0 4.6-3.2 7.9-7.5 9.3-4.3-1.4-7.5-4.7-7.5-9.3V5.7z"/><path d="M9 12l2.2 2.2L15.2 10"/></svg>),
  leverage: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16.5l6-6 4 4 8-8.5"/><path d="M15 6h6v6"/></svg>),
  vault: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6.4" rx="7.3" ry="3.1"/><path d="M4.7 6.4v5.4c0 1.7 3.3 3.1 7.3 3.1s7.3-1.4 7.3-3.1V6.4"/><path d="M4.7 11.8v5.4c0 1.7 3.3 3.1 7.3 3.1s7.3-1.4 7.3-3.1v-5.4"/></svg>),
  ghostgate: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 20.5V11a7 7 0 0 1 14 0v9.5c0 1-1.15 1.55-1.9.85l-1.5-1.4a1.15 1.15 0 0 0-1.6 0l-1.15 1.1a1.15 1.15 0 0 1-1.6 0l-1.15-1.1a1.15 1.15 0 0 0-1.6 0l-1.5 1.4c-.75.7-1.9.15-1.9-.85Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="9.4" cy="10.8" r="1.15" fill="currentColor"/><circle cx="14.6" cy="10.8" r="1.15" fill="currentColor"/></svg>),
  faucet: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5s6 6.2 6 10.2a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5Z"/></svg>),
  status: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.5 7 4.5-15 2.5 8H21"/></svg>),
};

const ITEMS: { r: Route; label: ReactNode }[] = [
  { r: "dashboard", label: "Dashboard" }, { r: "markets", label: "Markets" },
  { r: "position", label: "My Position" }, { r: "leverage", label: "Leverage" },
  { r: "vault", label: (<span>Vault <span style={css("opacity:.5;font-weight:500")}>· Earn</span></span>) },
  { r: "ghostgate", label: "GhostGate" }, { r: "faucet", label: "Faucet" }, { r: "status", label: "Status" },
];

export function Sidebar() {
  const { route, go } = useNav();
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // wagmi v2: connect() needs a connector INSTANCE from the config (via useConnect().connectors), NOT a fresh
  // injected() factory. EIP-6963 discovery populates `connectors` with each detected wallet — prefer MetaMask.
  const doConnect = () => {
    if (isConnected) { disconnect(); return; }
    const injected = connectors.filter((c) => c.type === "injected" || /injected|metamask|rabby|coinbase|brave/i.test(c.name));
    const pick = injected.find((c) => /metamask/i.test(c.name)) ?? injected[0] ?? connectors[0];
    if (!pick) {
      toast("No wallet detected — install MetaMask, then reload", "err");
      return;
    }
    connect(
      { connector: pick },
      { onError: (e: any) => toast(e?.shortMessage || e?.message?.split("\n")[0] || "Wallet connection failed", "err") },
    );
  };

  return (
    <aside style={css("position:sticky;top:14px;align-self:flex-start;height:calc(100vh - 28px);width:264px;flex:none;background:var(--surface);border:1px solid var(--line);border-radius:24px;box-shadow:0 1px 2px rgba(20,18,12,.04),0 10px 30px rgba(20,18,12,.03)")}>
      <div style={css("display:flex;flex-direction:column;height:100%;padding:22px 15px 16px")}>
        <div style={css("display:flex;align-items:center;gap:9px;padding:2px 9px 22px")}>
          <svg width="23" height="25" viewBox="0 0 24 26" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12v11.4c0 1.3 1.5 2 2.5 1.1L6.6 22c.5-.5 1.4-.5 2 0l1.4 1.3c.6.5 1.4.5 2 0l1.4-1.3c.5-.5 1.4-.5 2 0l2.1 1.5c1 .9 2.5.2 2.5-1.1V12C22 6.48 17.52 2 12 2Z" fill="var(--ink)"/><circle cx="9" cy="12" r="1.55" fill="#fff"/><circle cx="15" cy="12" r="1.55" fill="#fff"/></svg>
          <span style={css("font:800 21px var(--display);letter-spacing:-.03em;color:var(--ink)")}>GHOSTLEND</span>
        </div>
        <nav style={css("display:flex;flex-direction:column;gap:3px")}>
          {ITEMS.map((it) => (
            <button key={it.r} style={navStyle(route === it.r)} onClick={() => go(it.r)}>
              {ICON[it.r]}<span>{it.label}</span>
            </button>
          ))}
        </nav>
        <div style={css("flex:1")} />
        <button
          onClick={doConnect}
          style={css("width:100%;display:flex;align-items:center;justify-content:center;gap:9px;padding:13px 14px;border-radius:14px;border:1px solid var(--line-2);background:#fff;cursor:pointer;font:650 12.5px var(--display);color:var(--ink);letter-spacing:.03em")}
        >
          {isConnected ? (
            <>
              <span style={css("width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(28,143,90,.16)")} />
              <span style={css("font-family:var(--mono);font-weight:600;font-size:12.5px;letter-spacing:0")}>{shortAddr(address)}</span>
            </>
          ) : isPending ? (
            <>
              <span style={css("width:14px;height:14px;border:2px solid var(--line-2);border-top-color:var(--ink);border-radius:50%;display:inline-block;animation:spin .7s linear infinite")} />
              <span>CONNECTING…</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M2.5 9.5h19"/><circle cx="17.5" cy="14" r="1.1" fill="currentColor" stroke="none"/></svg>
              <span>CONNECT WALLET</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
