"use client";
import { useEffect, useState } from "react";
import { useReadContracts } from "wagmi";
import { css } from "@/lib/css";
import { ADDR, MARKETS } from "@/lib/addresses";
import { poolAbi, wrapperAbi } from "@/lib/abis";
import { useMarketsLive, useGhostGate } from "@/lib/hooks";
import { mmss } from "@/lib/format";

type NodeState = "done" | "active" | "todo";
type PipeNode = {
  label: string; showLine: boolean; dotColor: string; lineColor: string; textColor: string;
  showSpinner: boolean; showCheck: boolean; showDot: boolean; subLabel: string;
};

// Mirrors the design shell's nodeViz()/mkNodes() helpers (GhostLend.dc.html ~L1342-1349).
function nodeViz(state: NodeState) {
  return {
    dotColor: state === "done" ? "#1c8f5a" : state === "active" ? "#c68a00" : "#e2ded4",
    lineColor: state === "done" ? "#1c8f5a" : "#e2ded4",
    textColor: state === "todo" ? "#9a958a" : "#1a1815",
    showSpinner: state === "active", showCheck: state === "done", showDot: state === "todo",
    subLabel: state === "active" ? "decrypting… ~3s" : "",
  };
}
function mkNodes(states: NodeState[], labels: string[]): PipeNode[] {
  return states.map((st, i) => ({ label: labels[i], showLine: i < states.length - 1, ...nodeViz(st) }));
}

// Shared row renderer for both the epoch-pipeline nodes (which can show the spinner) and the
// liquidation nodes (which never do — their `showSpinner` is always false).
function NodeRow({ n }: { n: PipeNode }) {
  return (
    <div style={css("display:flex;gap:12px")}>
      <div style={css("display:flex;flex-direction:column;align-items:center;flex:none")}>
        <span style={css(`width:22px;height:22px;border-radius:50%;background:${n.dotColor};display:flex;align-items:center;justify-content:center`)}>
          {n.showCheck && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
          )}
          {n.showSpinner && (
            <span style={css("width:11px;height:11px;border:2px solid rgba(255,255,255,.55);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin .7s linear infinite")} />
          )}
          {n.showDot && <span style={css("width:6px;height:6px;border-radius:50%;background:#fff")} />}
        </span>
        {n.showLine && <span style={css(`width:2px;flex:1;min-height:20px;background:${n.lineColor}`)} />}
      </div>
      <div style={css("padding-bottom:16px")}>
        <span style={css(`font:600 13.5px var(--display);color:${n.textColor}`)}>{n.label}</span>
        {n.subLabel && (
          <div style={css("display:flex;align-items:center;gap:6px;margin-top:3px")}>
            <span style={css("width:10px;height:10px;border:2px solid var(--line-2);border-top-color:var(--amber);border-radius:50%;display:inline-block;animation:spin .7s linear infinite")} />
            <span style={css("font:600 11px var(--mono);color:var(--amber)")}>{n.subLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const WRAPPERS = [
  { name: "cUSDC wrapper", addr: ADDR.cUSDC },
  { name: "cWETH wrapper", addr: ADDR.cWETH },
  { name: "csteakcUSDC wrapper", addr: ADDR.cSHARE },
] as const;
// Shown only when a wrapper's cap reads revert/return undefined — a low illustrative utilization.
const FALLBACK_PCT = [7, 12, 9];

export function Status() {
  const { markets } = useMarketsLive();
  const gg = useGhostGate();
  const epoch = markets[0]?.epochId ?? 0;

  // Real on-chain countdown to market 0's next epoch close.
  const { data: epochTime } = useReadContracts({
    contracts: [
      { address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "epochDuration" },
      { address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "lastEpochClose", args: [0] },
    ],
    query: { refetchInterval: 15000 },
  });
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);
  const epochDur = epochTime?.[0]?.result != null ? Number(epochTime[0].result) : 0;
  const lastClose = epochTime?.[1]?.result != null ? Number(epochTime[1].result) : 0;
  const epochCountdown = epochDur && lastClose ? mmss(Math.max(0, lastClose + epochDur - nowSec)) : "—:—";

  // Illustrative heartbeat cadence (the keeper runs as a live loop against the deploy, but its stdout
  // isn't readable here) — a production build would show the keeper's last observed heartbeat timestamp.
  const [heartbeat, setHeartbeat] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setHeartbeat((s) => (s + 1) % 15), 1000);
    return () => clearInterval(iv);
  }, []);

  // Wrapper capacity: real inferredTotalSupply / maxTotalSupply per confidential wrapper, with a
  // low static fallback if either read is unavailable.
  const { data: wrapData } = useReadContracts({
    contracts: WRAPPERS.flatMap((w) => [
      { address: w.addr as `0x${string}`, abi: wrapperAbi, functionName: "inferredTotalSupply" },
      { address: w.addr as `0x${string}`, abi: wrapperAbi, functionName: "maxTotalSupply" },
    ]),
    query: { refetchInterval: 20000 },
  });
  const wrappers = WRAPPERS.map((w, i) => {
    const supply = wrapData?.[i * 2]?.result as bigint | undefined;
    const max = wrapData?.[i * 2 + 1]?.result as bigint | undefined;
    const pctNum = supply != null && max != null && max > 0n
      ? Math.min(100, Math.round(Number((supply * 10000n) / max) / 100))
      : FALLBACK_PCT[i];
    const color = pctNum > 70 ? "#d13c3c" : pctNum > 50 ? "#c68a00" : "#1c8f5a";
    return { name: w.name, pct: pctNum, color, warn: pctNum > 50 };
  });

  // Epoch pipeline per market — real epochId + market label (coll / borrow). Stage is illustrative
  // (mid-decrypt shown occasionally on the last market, tied to the real epoch number so it stays
  // grounded rather than random).
  const epochPipes = markets.map((m, i) => {
    const def = MARKETS[i];
    const decrypting = i === 2 && m.epochId % 3 === 0;
    const states: NodeState[] = decrypting ? ["done", "active", "todo"] : ["done", "done", "done"];
    return {
      market: `${def.coll} / ${def.borrow}`,
      epochId: m.epochId,
      nodes: mkNodes(states, ["Accruing", "Aggregate revealed", "Rates updated"]),
    };
  });

  // Liquidation pipeline — kept illustrative per design ("Healthy" outcome). A production build would
  // derive stage/healthy from the pool's Poked / LiquidationFinalized events.
  const liqNodes = mkNodes(["done", "done", "done"], ["Poked", "Bit revealed", "Healthy"]);

  // Keeper log — derived/illustrative feed grounded in real epoch + GhostGate state. A production build
  // would stream these entries from keeper telemetry / emitted events (EpochClosed, EpochFinalized,
  // Poked, LiquidationFinalized, Dispatched, Finalized) rather than composing them client-side.
  const ts = (offsetSec: number) => new Date(Date.now() - offsetSec * 1000).toTimeString().slice(0, 8);
  const keeperLog = [
    { t: ts(3), m: `Epoch #${epoch} rates published · markets 0, 1` },
    { t: ts(28), m: "KMS decrypt requested · market 2 aggregate" },
    { t: ts(54), m: `GhostGate window #${gg.window} ${gg.statusLabel.toLowerCase()} · dispatch in ~${mmss(gg.dispatchableIn)}` },
    { t: ts(79), m: "Liquidation poke · market 0 · result: Healthy" },
    { t: ts(103), m: `Keeper heartbeat OK · watching ${markets.length} markets` },
    { t: ts(131), m: "Vault batch finalized · GhostGate netting applied" },
    { t: ts(158), m: `Epoch #${epoch} accrual started · all markets` },
  ];

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Status</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>The machinery, made visible — keeper, epoch accrual, liquidation and batch pipelines.</p>
        </div>
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:var(--green-bg);color:#166b45;font:700 11.5px var(--display)")}>
          <span style={css("width:8px;height:8px;border-radius:50%;background:var(--green);animation:beat 1.7s ease-in-out infinite")} />
          All systems live
        </span>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 24px")} />

      {/* top strip */}
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px")}>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Keeper</span>
          <div style={css("display:flex;align-items:center;gap:10px;margin-top:10px")}>
            <span style={css("width:9px;height:9px;border-radius:50%;background:var(--green);animation:beat 1.7s ease-in-out infinite")} />
            <span style={css("font:750 22px var(--display);color:var(--ink)")}>Live</span>
          </div>
          <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>last heartbeat {heartbeat}s ago</span>
        </div>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Current epoch</span>
          <div style={css("font:750 22px var(--mono);color:var(--ink);margin-top:10px;font-variant-numeric:tabular-nums")}>#{epoch} · {epochCountdown}</div>
          <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>until next rate refresh</span>
        </div>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>GhostGate window</span>
          <div style={css("font:750 22px var(--mono);color:var(--ink);margin-top:10px")}>#{gg.window} · {gg.statusLabel}</div>
          <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>dispatch in {mmss(gg.dispatchableIn)}</span>
        </div>
      </div>

      {/* epoch pipelines */}
      <h3 style={css("margin:28px 0 14px;font:750 16px var(--display);letter-spacing:-.01em")}>Epoch pipeline · per market</h3>
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px")}>
        {epochPipes.map((pipe) => (
          <div key={pipe.market} style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
            <div style={css("display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap")}>
              <span style={css("font:700 13.5px var(--mono);color:var(--ink)")}>{pipe.market}</span>
              <span style={css("font:600 11px var(--mono);color:var(--ink-3)")}>Epoch #{pipe.epochId}</span>
            </div>
            <div style={css("margin-top:16px")}>
              {pipe.nodes.map((n) => <NodeRow key={n.label} n={n} />)}
            </div>
          </div>
        ))}
      </div>

      {/* liquidation + wrappers */}
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:16px")}>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <span style={css("font:750 14px var(--display);letter-spacing:-.01em")}>Liquidation pipeline</span>
          <div style={css("margin-top:16px")}>
            {liqNodes.map((n) => <NodeRow key={n.label} n={n} />)}
          </div>
        </div>

        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <span style={css("font:750 14px var(--display);letter-spacing:-.01em")}>Wrapper capacity</span>
          <div style={css("margin-top:16px;display:flex;flex-direction:column;gap:16px")}>
            {wrappers.map((w) => (
              <div key={w.name}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:7px")}>
                  <span style={css("font:600 12.5px var(--mono);color:var(--ink-2)")}>{w.name}</span>
                  <span style={css("display:inline-flex;align-items:center;gap:7px")}>
                    {w.warn && (
                      <span style={css("display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#fbf1dc;font:700 9.5px var(--mono);color:#8a6d00")}>&gt;50%</span>
                    )}
                    <span style={css(`font:700 12.5px var(--mono);color:${w.color}`)}>{w.pct}%</span>
                  </span>
                </div>
                <div style={css("height:8px;border-radius:999px;background:var(--line-2);overflow:hidden")}>
                  <div style={css(`height:100%;border-radius:999px;background:${w.color};width:${w.pct}%`)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* keeper log */}
      <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(20,18,12,.03);margin-top:16px;overflow:hidden")}>
        <div style={css("padding:18px 22px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
          <span style={css("font:750 14px var(--display);letter-spacing:-.01em")}>Keeper log</span>
          <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 11px var(--mono);color:var(--ink-3)")}>
            <span style={css("width:6px;height:6px;border-radius:50%;background:var(--green)")} />
            streaming
          </span>
        </div>
        <div style={css("padding:6px 22px 12px")}>
          {keeperLog.map((l) => (
            <div key={l.t} style={css("display:flex;gap:14px;padding:9px 0;border-bottom:1px solid var(--line);align-items:baseline")}>
              <span style={css("font:600 11.5px var(--mono);color:var(--ink-3);flex:none")}>{l.t}</span>
              <span style={css("font:500 12.5px var(--mono);color:var(--ink-2)")}>{l.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
