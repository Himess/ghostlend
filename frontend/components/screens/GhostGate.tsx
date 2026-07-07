"use client";
import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { css } from "@/lib/css";
import { useGhostGate } from "@/lib/hooks";
import { fmtUnits6, mmss } from "@/lib/format";
import { ADDR } from "@/lib/addresses";
import { gateAbi } from "@/lib/abis";

const GATE = { address: ADDR.gate as `0x${string}`, abi: gateAbi };

const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
);
const EyeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>
);

// A single "Deposit"/"Withdraw" row inside a confidential zone — identical markup, reused in both lanes.
function FlowRow({ dir, amount }: { dir: "Deposit" | "Withdraw"; amount: string }) {
  const isDeposit = dir === "Deposit";
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:11px;background:var(--surface);border:1px solid var(--line)")}>
      <span style={css("display:flex;align-items:center;gap:8px;font:600 12.5px var(--display);color:var(--ink-2)")}>
        {isDeposit ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
        )}
        {dir}
      </span>
      <span style={css("font:700 13px var(--mono);color:var(--ink)")}>{amount}</span>
    </div>
  );
}

// One label/value row in the "Current window" card.
function WinRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={css(`display:flex;align-items:center;justify-content:space-between;padding:12px 0${last ? "" : ";border-bottom:1px solid var(--line)"}`)}>
      <span style={css("font:500 13px var(--display);color:var(--ink-2)")}>{label}</span>
      <span style={css("font:700 13px var(--mono);color:var(--ink)")}>{value}</span>
    </div>
  );
}

export function GhostGate() {
  const [netted, setNetted] = useState(false); // local-only: drives the illustrative netting demo below
  const gg = useGhostGate();

  // "Only 2 values are ever revealed per window": pull dirClear/netClear straight off windowInfo — useGhostGate()
  // only surfaces pinRate6/status, not the clear fields, so we read the same view fn again for those two.
  const { data: curInfo } = useReadContract({
    ...GATE, functionName: "windowInfo", args: [BigInt(gg.window)], query: { refetchInterval: 5000 },
  });
  const curDirClear = curInfo ? ((curInfo as any)[3] as boolean) : false;
  const curNetClear = curInfo ? ((curInfo as any)[4] as bigint) : 0n;
  const isRevealed = gg.status === 2 || gg.status === 3 || gg.status === 4; // Dispatched | Routing | Finalized
  const revDir = isRevealed ? (curDirClear ? "Deposit" : "Withdraw") : "—";
  const revNet = isRevealed ? fmtUnits6(curNetClear, { compact: true }) : "—";
  const pinRate = (Number(gg.pinRate6) / 1e6).toFixed(4);

  // Recent windows: the up-to-3 windows before the current one.
  const histWindows = [1, 2, 3].map((k) => gg.window - k).filter((w) => w > 0);
  const { data: histData } = useReadContracts({
    contracts: histWindows.map((w) => ({ ...GATE, functionName: "windowInfo", args: [BigInt(w)] }) as const),
    query: { enabled: histWindows.length > 0, refetchInterval: 5000 },
  });
  const history = histWindows.map((w, i) => {
    const info = histData?.[i]?.result as any;
    const status = info ? Number(info[2]) : 0;
    const netClear = info ? (info[4] as bigint) : 0n;
    return {
      win: w,
      finalized: status === 4,
      dir: info && info[3] ? "Deposit" : "Withdraw",
      net: fmtUnits6(netClear, { compact: true }),
      crossings: netClear > 0n ? 1 : 0,
    };
  });

  // Illustrative netting demo (local animation only — numbers mirror the real Sepolia result in CP4-STATUS.md).
  const winOpen = !netted;
  const mergeStyle = css(`opacity:${netted ? 0 : 1};transform:${netted ? "scale(.94)" : "none"};transition:opacity .45s ease, transform .45s ease`);
  const netTokenStyle = css(`opacity:${netted ? 1 : 0};transform:${netted ? "scale(1)" : "scale(.86)"};transition:all .55s cubic-bezier(.2,1,.3,1) .12s`);
  const netFlowStyle = css(`opacity:${netted ? 1 : 0};transform:${netted ? "translateY(0)" : "translateY(-10px)"};transition:all .5s ease .32s`);
  const stat80FillStyle = css(`height:100%;width:20%;border-radius:999px;background:linear-gradient(90deg,#ffe680,#ffd208);opacity:${netted ? 1 : 0};transform:${netted ? "scaleX(1)" : "scaleX(0)"};transform-origin:left;transition:all .7s cubic-bezier(.3,1,.3,1) .45s`);
  const stat80NumStyle = css(`opacity:${netted ? 1 : 0};transform:${netted ? "scale(1)" : "scale(.8)"};transition:all .5s cubic-bezier(.2,1.3,.4,1) .5s`);

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>GhostGate</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Deposits and withdrawals net inside the confidential zone — only the residual crosses to the public vault.</p>
        </div>
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:var(--panel);color:#f3f1ec;font:700 11px var(--display);letter-spacing:.03em")}>GhostGate netting · v2</span>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 22px")} />

      {/* banner + controls */}
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:15px 20px;margin-bottom:16px")}>
        <div style={css("display:flex;align-items:center;gap:12px;min-width:0")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none")}><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>
          <p style={css("margin:0;font:400 14px/1.5 var(--display);color:var(--ink-2)")}><b style={css("color:var(--ink);font-weight:700")}>Only 2 values are ever revealed per window:</b> direction &amp; net. Everything else stays encrypted.</p>
        </div>
        <div style={css("display:flex;gap:9px;flex:none")}>
          {winOpen && (
            <button onClick={() => setNetted(true)} style={css("display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:999px;padding:11px 20px;font:700 13.5px var(--display);cursor:pointer;box-shadow:0 5px 15px rgba(255,210,8,.32)")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>Play netting
            </button>
          )}
          {netted && (
            <button onClick={() => setNetted(false)} style={css("display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);border:1px solid var(--line-2);border-radius:999px;padding:11px 18px;font:650 13.5px var(--display);cursor:pointer")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Reset window
            </button>
          )}
        </div>
      </div>

      {/* illustrative-example marker — the two-lane animation below is a conceptual diagram, not live data */}
      <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px")}>
        <span style={css("display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:#f3edff;border:1px solid #e2d5ff;color:#6b41c9;font:700 10.5px var(--display);letter-spacing:.04em;white-space:nowrap")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v.5M12 11v5" /></svg>
          Illustrative example
        </span>
        <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>Conceptual figures showing how netting cuts on-chain-visible volume — not live data. Your live windows are below.</span>
      </div>

      {/* two lanes */}
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px")}>
        {/* LANE A: vanilla */}
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <div style={css("padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px")}>
            <div style={css("display:flex;flex-direction:column;gap:2px")}>
              <span style={css("font:750 16px var(--display);letter-spacing:-.01em")}>Vanilla batchers</span>
              <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>Zama v1 pattern</span>
            </div>
            <span style={css("font:600 10.5px var(--mono);letter-spacing:.06em;color:var(--ink-3);padding:4px 9px;border:1px solid var(--line);border-radius:999px")}>GROSS</span>
          </div>
          <div style={css("background:var(--surface-2);padding:16px 22px 20px;position:relative")}>
            <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 9.5px var(--mono);letter-spacing:.08em;color:var(--ink-3);margin-bottom:12px")}><LockIcon />CONFIDENTIAL DOMAIN</span>
            <div style={css("display:flex;flex-direction:column;gap:8px")}>
              <FlowRow dir="Deposit" amount="0.7M" />
              <FlowRow dir="Deposit" amount="0.8M" />
              <FlowRow dir="Withdraw" amount="1.0M" />
            </div>
          </div>
          <div style={css("position:relative;height:1px;border-top:1px dashed var(--line-2)")}>
            <span style={css("position:absolute;left:50%;top:0;transform:translate(-50%,-50%);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font:600 9px var(--mono);letter-spacing:.05em;color:var(--ink-3);white-space:nowrap")}>CONFIDENTIAL · PUBLIC</span>
          </div>
          <div style={css("padding:16px 22px 18px;min-height:118px")}>
            <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 9.5px var(--mono);letter-spacing:.08em;color:var(--ink-3);margin-bottom:12px")}><EyeIcon />PUBLIC VAULT · ON-CHAIN</span>
            <div style={netFlowStyle}>
              <div style={css("display:flex;flex-direction:column;gap:8px")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:11px;background:var(--red-bg);border:1px solid #f2d3d3")}>
                  <span style={css("display:flex;align-items:center;gap:8px;font:600 12px var(--display);color:#a33")}>↓ Deposit crossed <span style={css("color:var(--ink-3);font-weight:500")}>(gross)</span></span>
                  <span style={css("font:700 13px var(--mono);color:#a33")}>1.5M</span>
                </div>
                <div style={css("display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:11px;background:var(--red-bg);border:1px solid #f2d3d3")}>
                  <span style={css("display:flex;align-items:center;gap:8px;font:600 12px var(--display);color:#a33")}>↑ Withdraw crossed <span style={css("color:var(--ink-3);font-weight:500")}>(gross)</span></span>
                  <span style={css("font:700 13px var(--mono);color:#a33")}>1.0M</span>
                </div>
              </div>
            </div>
          </div>
          <div style={css("padding:14px 22px;border-top:1px solid var(--line);display:flex;align-items:baseline;justify-content:space-between")}>
            <span style={css("font:500 12px var(--display);color:var(--ink-2)")}>On-chain-visible volume</span>
            <span style={css("font:800 19px var(--mono);color:var(--ink)")}>2.5M</span>
          </div>
        </div>

        {/* LANE B: ghostgate */}
        <div style={css("background:var(--surface);border:1.5px solid #f0d97a;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 6px 22px rgba(255,210,8,.12)")}>
          <div style={css("padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px")}>
            <div style={css("display:flex;flex-direction:column;gap:2px")}>
              <span style={css("font:750 16px var(--display);letter-spacing:-.01em")}>GhostGate netting</span>
              <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>our v2</span>
            </div>
            <span style={css("font:700 10.5px var(--mono);letter-spacing:.06em;color:#8a6d00;background:var(--accent-soft);padding:4px 9px;border-radius:999px;white-space:nowrap")}>NET ONLY</span>
          </div>
          <div style={css("background:var(--surface-2);padding:16px 22px 20px;position:relative;min-height:158px")}>
            <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 9.5px var(--mono);letter-spacing:.08em;color:var(--ink-3);margin-bottom:12px")}><LockIcon />CONFIDENTIAL DOMAIN · NETTING ENGINE</span>
            <div style={mergeStyle}>
              <div style={css("display:flex;flex-direction:column;gap:8px")}>
                <FlowRow dir="Deposit" amount="0.7M" />
                <FlowRow dir="Deposit" amount="0.8M" />
                <FlowRow dir="Withdraw" amount="1.0M" />
              </div>
            </div>
            <div style={css("position:absolute;inset:38px 22px 20px;display:flex;align-items:center;justify-content:center;pointer-events:none")}>
              <div style={netTokenStyle}>
                <div style={css("display:flex;flex-direction:column;align-items:center;gap:7px")}>
                  <span style={css("font:600 9.5px var(--mono);letter-spacing:.14em;color:var(--ink-3)")}>NETTED INTERNALLY</span>
                  <div style={css("display:flex;align-items:center;gap:10px;padding:13px 20px;border-radius:14px;background:var(--panel);color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.2)")}>
                    <span style={css("font:800 22px var(--mono);letter-spacing:-.02em")}>0.5M</span>
                    <span style={css("font:600 12.5px var(--display);color:#c9c4b8")}>net deposit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={css("position:relative;height:1px;border-top:1px dashed #f0d97a")}>
            <span style={css("position:absolute;left:50%;top:0;transform:translate(-50%,-50%);background:var(--surface);border:1px solid #f0d97a;border-radius:999px;padding:3px 10px;font:600 9px var(--mono);letter-spacing:.05em;color:#8a6d00;white-space:nowrap")}>CONFIDENTIAL · PUBLIC</span>
          </div>
          <div style={css("padding:16px 22px 18px;min-height:118px")}>
            <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 9.5px var(--mono);letter-spacing:.08em;color:var(--ink-3);margin-bottom:12px")}><EyeIcon />PUBLIC VAULT · ON-CHAIN</span>
            <div style={netFlowStyle}>
              <div style={css("display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;background:var(--accent-soft);border:1px solid #f0d97a")}>
                <span style={css("display:flex;align-items:center;gap:8px;font:700 13px var(--display);color:#8a6d00")}>↓ Net deposit crossed</span>
                <span style={css("font:800 15px var(--mono);color:#8a6d00")}>0.5M</span>
              </div>
            </div>
          </div>
          <div style={css("padding:14px 22px;border-top:1px solid #f0d97a;display:flex;align-items:baseline;justify-content:space-between")}>
            <span style={css("font:500 12px var(--display);color:var(--ink-2)")}>On-chain-visible volume</span>
            <span style={css("font:800 19px var(--mono);color:#166b45")}>0.5M</span>
          </div>
        </div>
      </div>

      {/* 80% callout */}
      <div style={css("display:flex;align-items:center;gap:28px;flex-wrap:wrap;background:var(--panel);border-radius:20px;padding:26px 30px;margin-top:16px;color:#f3f1ec")}>
        <div style={css("display:flex;flex-direction:column;gap:2px")}>
          <div style={stat80NumStyle}><span style={css("font:800 58px var(--display);letter-spacing:-.03em;color:var(--accent);line-height:1")}>80%</span></div>
          <span style={css("font:600 14px var(--display);color:#c9c4b8")}>less on-chain-visible volume</span>
        </div>
        <div style={css("flex:1;min-width:240px;display:flex;flex-direction:column;gap:12px")}>
          <div>
            <div style={css("display:flex;justify-content:space-between;font:600 11px var(--display);color:#a9a498;margin-bottom:5px")}><span>Vanilla batchers · gross</span><span style={css("font-family:var(--mono);color:#e9e6df")}>2.5M</span></div>
            <div style={css("height:12px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden")}><div style={css("height:100%;width:100%;border-radius:999px;background:rgba(255,255,255,.28)")} /></div>
          </div>
          <div>
            <div style={css("display:flex;justify-content:space-between;font:600 11px var(--display);color:#a9a498;margin-bottom:5px")}><span>GhostGate netting · net</span><span style={css("font-family:var(--mono);color:var(--accent)")}>0.5M</span></div>
            <div style={css("height:12px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden")}><div style={stat80FillStyle} /></div>
          </div>
        </div>
      </div>

      {/* live on-chain window data — real windowInfo reads, visually separated from the illustration above */}
      <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:26px;margin-bottom:2px")}>
        <span style={css("display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:#e7f4ec;border:1px solid #bfe3cd;color:#166b45;font:700 10.5px var(--display);letter-spacing:.04em;white-space:nowrap")}>
          <span style={css("width:7px;height:7px;border-radius:50%;background:#2fbf7a")} />
          Live · on-chain
        </span>
        <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>Read directly from the GhostGate contract (windowInfo) on Sepolia — this is your real window state.</span>
      </div>

      {/* window + history */}
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:16px")}>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 2px rgba(20,18,12,.03);overflow:hidden")}>
          <div style={css("padding:18px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
            <span style={css("font:750 15px var(--display)")}>Current window</span>
            <span style={css("display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:650 11.5px var(--display);color:var(--ink-2)")}>
              <span style={css("width:7px;height:7px;border-radius:50%;background:var(--amber)")} />{gg.statusLabel}
            </span>
          </div>
          <div style={css("padding:8px 22px 18px")}>
            <WinRow label="Pin rate" value={pinRate} />
            <WinRow label="Dispatch in" value={mmss(gg.dispatchableIn)} />
            <WinRow label="Revealed direction" value={revDir} />
            <WinRow label="Revealed net" value={revNet} last />
          </div>
        </div>

        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 2px rgba(20,18,12,.03);overflow:hidden")}>
          <div style={css("padding:18px 22px;border-bottom:1px solid var(--line)")}><span style={css("font:750 15px var(--display)")}>Recent windows</span></div>
          <div style={css("padding:6px 22px 14px")}>
            <div style={css("display:grid;grid-template-columns:1fr 1.2fr 1fr .9fr;padding:11px 0 9px;border-bottom:1px solid var(--line);font:650 10px var(--display);letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3)")}>
              <span>Window</span><span>Direction</span><span>Net</span><span style={css("text-align:right")}>Crossings</span>
            </div>
            {history.length === 0 && (
              <div style={css("padding:22px 4px;text-align:center;font:500 12.5px var(--display);color:var(--ink-3)")}>windows appear here as the keeper dispatches them</div>
            )}
            {history.map((w) => (
              <div key={w.win} style={css("display:grid;grid-template-columns:1fr 1.2fr 1fr .9fr;padding:12px 0;border-bottom:1px solid var(--line);align-items:center")}>
                <span style={css("font:700 12.5px var(--mono);color:var(--ink)")}>#{w.win}</span>
                {w.finalized ? (
                  <>
                    <span style={css("font:500 13px var(--display);color:var(--ink-2)")}>{w.dir}</span>
                    <span style={css("font:700 12.5px var(--mono);color:var(--ink)")}>{w.net}</span>
                    <span style={css("font:700 12.5px var(--mono);color:#166b45;text-align:right")}>{w.crossings}</span>
                  </>
                ) : (
                  <>
                    <span style={css("font:500 13px var(--display);color:var(--ink-3)")}>settling…</span>
                    <span style={css("font:700 12.5px var(--mono);color:var(--ink-3)")}>—</span>
                    <span style={css("font:700 12.5px var(--mono);color:var(--ink-3);text-align:right")}>—</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={css("display:flex;align-items:flex-start;gap:11px;margin-top:18px;padding:0 4px")}>
        <svg width="17" height="18" viewBox="0 0 24 26" fill="none" style={css("flex:none;margin-top:1px")}><path d="M12 2C6.48 2 2 6.48 2 12v11.4c0 1.3 1.5 2 2.5 1.1L6.6 22c.5-.5 1.4-.5 2 0l1.4 1.3c.6.5 1.4.5 2 0l1.4-1.3c.5-.5 1.4-.5 2 0l2.1 1.5c1 .9 2.5.2 2.5-1.1V12C22 6.48 17.52 2 12 2Z" fill="var(--line-2)"/></svg>
        <p style={css("margin:0;font:400 13px/1.6 var(--display);color:var(--ink-3);max-width:78ch")}>Deposits and withdrawals net internally; only the residual touches the public vault. Observers learn the window's net direction and size — never who transacted, in which direction, or for how much.</p>
      </div>
    </div>
  );
}
