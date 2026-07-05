"use client";
import { css } from "@/lib/css";
import { useNav } from "@/lib/nav";
import { useMarketsLive, useVaultStats, useGhostGate } from "@/lib/hooks";
import { compact } from "@/lib/format";

const EncBadge = () => (
  <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:#f5f3ec;border:1px solid var(--line);color:var(--ink-2);font:600 11.5px var(--display)")}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
    End-to-end encrypted
  </span>
);

function Card({ children }: { children: React.ReactNode }) {
  return <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:20px 22px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>{children}</div>;
}
const Label = ({ t }: { t: string }) => <span style={css("font:650 11px var(--display);letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)")}>{t}</span>;

export function Dashboard() {
  const { go } = useNav();
  const { markets } = useMarketsLive();
  const vault = useVaultStats();
  const gg = useGhostGate();
  const epoch = markets[0]?.epochId ?? 0;
  const totalSupplied = compact(Number(vault.totalAssets) / 1e6);

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em;color:var(--ink)")}>Dashboard</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Confidential lending &amp; leverage on the Zama Protocol.</p>
        </div>
        <EncBadge />
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px")}>
        <Card>
          <div style={css("display:flex;align-items:center;justify-content:space-between")}>
            <Label t="Total value in vault" />
            <span style={css("width:26px;height:26px;border-radius:50%;background:#f5f3ec;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink-2)")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg></span>
          </div>
          <div style={css("display:flex;align-items:baseline;gap:7px;min-width:0")}>
            <span style={css("font:800 31px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums")}>{totalSupplied}</span>
            <span style={css("font:600 14px var(--mono);color:var(--ink-3)")}>cUSDC</span>
          </div>
          <span style={css("font:400 12px/1.45 var(--display);color:var(--ink-3)")}>public vault assets — individual lending positions are never revealed</span>
        </Card>
        <Card>
          <Label t="Live markets" />
          <div style={css("font:750 38px var(--display);letter-spacing:-.02em;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums")}>{markets.length}</div>
          <span style={css("font:400 12.5px var(--display);color:var(--ink-3)")}>Isolated · public rates</span>
        </Card>
        <Card>
          <Label t="Current epoch" />
          <div style={css("font:750 38px var(--display);letter-spacing:-.01em;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums")}>#{epoch}</div>
          <span style={css("font:400 12.5px var(--display);color:var(--ink-3)")}>aggregates revealed per epoch</span>
        </Card>
        <Card>
          <Label t="GhostGate" />
          <div style={css("display:flex;align-items:center;gap:11px")}>
            <span style={css("width:10px;height:10px;border-radius:50%;background:var(--green);animation:beat 1.7s ease-in-out infinite")} />
            <span style={css("font:750 26px var(--display);letter-spacing:-.02em;color:var(--ink);line-height:1")}>{gg.statusLabel}</span>
          </div>
          <span style={css("font:400 12.5px var(--display);color:var(--ink-3)")}>window #{gg.window} · keeper live</span>
        </Card>
      </div>

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:16px")}>
        <div style={css("position:relative;overflow:hidden;background:var(--panel);border:1px solid #2a2621;border-radius:22px;padding:32px 34px;color:#f3f1ec;display:flex;flex-direction:column;gap:16px")}>
          <svg width="230" height="250" viewBox="0 0 24 26" fill="none" style={css("position:absolute;right:-30px;bottom:-52px;opacity:.05;animation:floaty 6s ease-in-out infinite")}><path d="M12 2C6.48 2 2 6.48 2 12v11.4c0 1.3 1.5 2 2.5 1.1L6.6 22c.5-.5 1.4-.5 2 0l1.4 1.3c.6.5 1.4.5 2 0l1.4-1.3c.5-.5 1.4-.5 2 0l2.1 1.5c1 .9 2.5.2 2.5-1.1V12C22 6.48 17.52 2 12 2Z" fill="#fff"/></svg>
          <span style={css("display:inline-flex;align-items:center;gap:7px;align-self:flex-start;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#e9e6df;font:600 11px var(--display);letter-spacing:.02em")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
            Fully encrypted
          </span>
          <h2 style={css("margin:2px 0 0;font:800 27px/1.14 var(--display);letter-spacing:-.02em;max-width:20ch")}>Your leverage is confidential.</h2>
          <p style={css("margin:0;font:400 15px/1.6 var(--display);color:#b7b2a8;max-width:46ch")}>Position size, debt <b style={css("color:#e9e6df;font-weight:700")}>and</b> the leverage ratio itself are encrypted on-chain. Not the keeper, not an indexer, not the block explorer can tell how leveraged you are — only you can decrypt.</p>
          <div style={css("display:flex;gap:10px;margin-top:6px;flex-wrap:wrap")}>
            <button onClick={() => go("leverage")} style={css("display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:999px;padding:12px 20px;font:700 14px var(--display);cursor:pointer;box-shadow:0 5px 16px rgba(255,210,8,.32)")}>Open a leveraged position →</button>
            <button onClick={() => go("ghostgate")} style={css("background:rgba(255,255,255,.06);color:#e9e6df;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:12px 18px;font:600 14px var(--display);cursor:pointer")}>See how netting works</button>
          </div>
        </div>
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:26px 24px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <h3 style={css("margin:0 0 12px;font:750 17px var(--display);letter-spacing:-.01em;color:var(--ink)")}>Get started in 3 steps</h3>
          {[
            { n: 1, t: "Faucet", s: "Mint & shield test tokens", go: () => go("faucet") },
            { n: 2, t: "Markets", s: "Supply or borrow confidentially", go: () => go("markets") },
            { n: 3, t: "Leverage", s: "Loop up to 4× in one transaction", go: () => go("leverage") },
          ].map((x) => (
            <button key={x.n} onClick={x.go} style={css("display:flex;gap:13px;align-items:flex-start;background:none;border:none;text-align:left;cursor:pointer;padding:11px 10px;border-radius:13px")}>
              <span style={css("width:27px;height:27px;flex:none;border-radius:50%;background:var(--accent-soft);border:1px solid #f0e08f;display:flex;align-items:center;justify-content:center;font:700 13px var(--mono);color:#8a6d00")}>{x.n}</span>
              <span style={css("display:flex;flex-direction:column;gap:2px")}><span style={css("font:650 14.5px var(--display);color:var(--ink)")}>{x.t}</span><span style={css("font:400 12.5px var(--display);color:var(--ink-3)")}>{x.s}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
