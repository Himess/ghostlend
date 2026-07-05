"use client";
import { useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { useGrantPermit, useHasPermit, useConfidentialBalance } from "@zama-fhe/react-sdk";
import { css } from "@/lib/css";
import { ADDR, PERMIT_CONTRACTS } from "@/lib/addresses";
import { erc20Abi } from "@/lib/abis";
import { useToast } from "@/components/Toast";
import { DOTS } from "@/lib/format";

const colorFor = (t: string) => (({ cWETH: "#3a3f4a", WETH: "#3a3f4a", cUSDC: "#2775ca", USDC: "#2775ca", csteakcUSDC: "#1c8f5a", ETH: "#627eea" } as any)[t] || "#8a867c");
const fmt = (v: bigint | undefined, dec: number, digits = 4) => {
  if (v == null) return "—";
  const s = Number(v) / 10 ** dec;
  return s.toLocaleString("en-US", { maximumFractionDigits: digits });
};

function Row({ tok, label, value, locked }: { tok: string; label: string; value: React.ReactNode; locked?: boolean }) {
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 20px;border-bottom:1px solid var(--line)")}>
      <div style={css("display:flex;align-items:center;gap:12px;min-width:0")}>
        <span style={css(`width:32px;height:32px;flex:none;border-radius:50%;background:${colorFor(tok)};color:#fff;display:flex;align-items:center;justify-content:center;font:700 11px var(--mono)`)}>{tok === "csteakcUSDC" ? "S" : tok[0]}</span>
        <div style={css("display:flex;flex-direction:column;gap:1px;min-width:0")}>
          <span style={css("font:700 14px var(--display);color:var(--ink)")}>{tok}</span>
          <span style={css("font:400 11.5px var(--display);color:var(--ink-3)")}>{label}</span>
        </div>
      </div>
      <span style={css(`font:700 16px var(--mono);color:${locked ? "#c3bfb4" : "var(--ink)"};font-variant-numeric:tabular-nums;letter-spacing:${locked ? ".06em" : "0"}`)}>{value}</span>
    </div>
  );
}

export function Balances() {
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const acc = address as `0x${string}` | undefined;

  // ---- public (plaintext) balances ----
  const { data: eth } = useBalance({ address: acc });
  const { data: usdc } = useReadContract({ address: ADDR.usdcUnderlying as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [acc!], query: { enabled: !!acc, refetchInterval: 15000 } });
  const { data: weth } = useReadContract({ address: ADDR.wethUnderlying as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [acc!], query: { enabled: !!acc, refetchInterval: 15000 } });

  // ---- confidential balances (decrypt on click; one grantPermit covers all) ----
  const [reveal, setReveal] = useState(false);
  const { mutateAsync: grantPermit, isPending: granting } = useGrantPermit();
  const { data: hasPermit } = useHasPermit({ contractAddresses: PERMIT_CONTRACTS });
  const enabled = reveal && !!acc;
  const cusdc = useConfidentialBalance({ address: ADDR.cUSDC as `0x${string}`, account: acc }, { enabled } as any);
  const cweth = useConfidentialBalance({ address: ADDR.cWETH as `0x${string}`, account: acc }, { enabled } as any);
  const cshare = useConfidentialBalance({ address: ADDR.cSHARE as `0x${string}`, account: acc }, { enabled } as any);
  const decrypting = enabled && (cusdc.isPending || cweth.isPending || cshare.isPending);
  const revealed = enabled && !decrypting;

  const onDecrypt = async () => {
    if (!isConnected) { toast("Connect your wallet first", "err"); return; }
    try {
      if (!hasPermit) await grantPermit(PERMIT_CONTRACTS);
      setReveal(true);
    } catch (e: any) {
      toast(e?.shortMessage || e?.message?.split("\n")[0] || "Signature rejected", "err");
    }
  };

  const cVal = (q: any, dec = 6) => (!enabled ? DOTS : q.isPending ? DOTS : fmt(q.data as bigint, dec, dec === 6 ? 2 : 4));

  return (
    <div style={css("max-width:820px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Balances</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Your wallet holdings. Public tokens are visible; confidential (c-) balances are encrypted — decrypt locally.</p>
        </div>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      {!isConnected ? (
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:40px;text-align:center;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <p style={css("margin:0;font:600 15px var(--display);color:var(--ink-2)")}>Connect your wallet to view balances</p>
        </div>
      ) : (
        <div style={css("display:flex;flex-direction:column;gap:16px")}>
          {/* public */}
          <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
            <div style={css("padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
              <span style={css("font:750 15px var(--display)")}>Public tokens</span>
              <span style={css("display:inline-flex;align-items:center;gap:6px;font:600 11px var(--mono);color:var(--ink-3)")}><span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2")} />Sepolia · visible on-chain</span>
            </div>
            <Row tok="ETH" label="gas · native" value={eth ? Number(eth.value) / 1e18 < 0.0001 ? "~0" : (Number(eth.value) / 1e18).toFixed(4) : "—"} />
            <Row tok="USDC" label="underlying · shield to get cUSDC" value={fmt(usdc as bigint, 6, 2)} />
            <Row tok="WETH" label="underlying · shield to get cWETH" value={fmt(weth as bigint, 18, 4)} />
          </div>

          {/* confidential */}
          <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
            <div style={css("padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap")}>
              <span style={css("display:inline-flex;align-items:center;gap:8px;font:750 15px var(--display)")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
                Confidential balances
              </span>
              {revealed ? (
                <span style={css("display:inline-flex;align-items:center;gap:7px;font:600 12px var(--display);color:#166b45")}><span style={css("width:18px;height:18px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center")}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>Decrypted locally</span>
              ) : decrypting ? (
                <span style={css("display:inline-flex;align-items:center;gap:8px")}><span style={css("width:16px;height:16px;border:2.5px solid var(--line-2);border-top-color:var(--accent);border-radius:50%;display:inline-block;animation:spin .7s linear infinite")} /><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>KMS decrypting… ~3s</span></span>
              ) : (
                <button onClick={onDecrypt} disabled={granting} style={css("display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:12px;padding:9px 16px;font:700 12.5px var(--display);cursor:pointer;box-shadow:0 4px 13px rgba(255,210,8,.3)")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V6.5a4 4 0 0 1 8 0"/></svg>{granting ? "Signing…" : "Decrypt"}
                </button>
              )}
            </div>
            <Row tok="cUSDC" label="confidential USD" value={cVal(cusdc, 6)} locked={!revealed} />
            <Row tok="cWETH" label="confidential ETH" value={cVal(cweth, 6)} locked={!revealed} />
            <Row tok="csteakcUSDC" label="confidential vault share" value={cVal(cshare, 6)} locked={!revealed} />
            <div style={css("padding:13px 20px;font:400 11.5px/1.5 var(--display);color:var(--ink-3);display:flex;align-items:flex-start;gap:8px")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none;margin-top:1px")}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
              These balances live encrypted on-chain (ERC-7984). One EIP-712 signature decrypts them locally for this session — nobody else can read them.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
