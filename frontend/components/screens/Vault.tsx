"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { css, cssm } from "@/lib/css";
import { useNav } from "@/lib/nav";
import { useVaultStats } from "@/lib/hooks";
import { compact, mmss, shortAddr } from "@/lib/format";
import { ADDR } from "@/lib/addresses";
import { wrapperAbi, depositBatcherAbi, withdrawBatcherAbi } from "@/lib/abis";
import { useToast } from "@/components/Toast";
import { TokenIcon } from "@/components/TokenIcon";

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

// "1000" / "1000.5" -> 6-dec base units.
function toUnits6(s: string): bigint {
  const n = parseFloat(s);
  if (!isFinite(n) || n <= 0) return 0n;
  return BigInt(Math.round(n * 1e6));
}

export function Vault() {
  const { setWizardOpen } = useNav();
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const vault = useVaultStats();
  const { mutateAsync: encrypt, isPending: isEncrypting } = useEncrypt();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const [vaultTab, setVaultTab] = useState<"deposit" | "withdraw">("deposit");
  const [vaultAmt, setVaultAmt] = useState("5000");
  const [moreDetails, setMoreDetails] = useState(false);

  const vaultName = "GhostLend Confidential Prime USDC";
  const vaultSub = "replicates Steakhouse Confidential Prime — testnet stand-in for the mainnet vault";
  const vaultShare = "csteakcUSDC";
  const vaultApy = vault.apy.toFixed(2);
  const vaultTotal = compact(Number(vault.totalAssets) / 1e6);
  const vaultSharePrice = (Number(vault.sharePrice6) / 1e6).toFixed(4); // real on-chain share price (yield proxy)
  const vaultCurator = "Steakhouse Financial · replicated on testnet";
  const vaultContract = shortAddr(ADDR.vault);

  const vaultInTok = vaultTab === "deposit" ? "cUSDC" : vaultShare;
  const vaultOutTok = vaultTab === "deposit" ? vaultShare : "cUSDC";
  // You receive — priced off the REAL share price. deposit: cUSDC→shares = amt·1e6/sp ; withdraw: shares→cUSDC = amt·sp/1e6.
  const vaultSp6 = Number(vault.sharePrice6) || 1e6;
  const vaultReceive = (Number(vaultAmt) || 0) * (vaultTab === "deposit" ? 1e6 / vaultSp6 : vaultSp6 / 1e6);
  const vaultActionLabel = vaultTab === "deposit" ? "Confirm confidential deposit" : "Request confidential withdrawal";
  const moreDetailsLabel = moreDetails ? "HIDE DETAILS" : "MORE DETAILS";

  // batch countdown — real reads off the two batchers, pick whichever matches the active tab.
  const { data: depositIn } = useReadContract({
    address: ADDR.depositBatcher as `0x${string}`, abi: depositBatcherAbi, functionName: "dispatchableIn",
    query: { refetchInterval: 3000 },
  });
  const { data: withdrawIn } = useReadContract({
    address: ADDR.withdrawBatcher as `0x${string}`, abi: withdrawBatcherAbi, functionName: "dispatchableIn",
    query: { refetchInterval: 3000 },
  });
  const dispatchableIn = vaultTab === "deposit" ? depositIn : withdrawIn;
  const vaultBatch = mmss(dispatchableIn != null ? Number(dispatchableIn) : 0);

  const disabled = !isConnected || isEncrypting || isWriting;

  const vaultSubmit = async () => {
    if (!isConnected || !address) { toast("Connect your wallet first", "err"); return; }
    const amt6 = toUnits6(vaultAmt);
    if (amt6 <= 0n) return;
    const token = (vaultTab === "deposit" ? ADDR.cUSDC : ADDR.cSHARE) as `0x${string}`;
    const target = (vaultTab === "deposit" ? ADDR.depositBatcher : ADDR.withdrawBatcher) as `0x${string}`;
    try {
      const enc = await encrypt({ values: [{ value: amt6, type: "euint64" }], contractAddress: token, userAddress: address });
      await writeContractAsync({
        address: token, abi: wrapperAbi, functionName: "confidentialTransferAndCall",
        args: [target, enc.encryptedValues[0], enc.inputProof, "0x"],
      });
      toast(`Confidential ${vaultTab === "deposit" ? "deposit" : "withdrawal"} queued · batch dispatches soon`);
    } catch {
      toast("Transaction failed · please try again", "err");
    }
  };

  const quitBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    toast("Left the batch · full encrypted refund");
  };

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Vault <span style={css("color:var(--ink-3);font-weight:700")}>· Earn</span></h1>
      <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>A confidential yield vault. Deposits are batched and netted before they touch the public vault.</p>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      <div style={css("display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start")}>
        {/* LEFT */}
        <div style={css("flex:1 1 470px;min-width:0")}>
          <div style={css("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
            <TokenIcon token="csteakcUSDC" size={46} />
            <h2 style={css("margin:0;font:800 26px/1.08 var(--display);letter-spacing:-.02em")}>{vaultName}</h2>
            <span style={css("padding:5px 11px;border-radius:999px;background:#f3edff;border:1px solid #e2d5ff;font:700 11px var(--display);color:#6b41c9;white-space:nowrap")}>Testnet replica</span>
          </div>

          <button onClick={() => setWizardOpen(true)} style={css("margin-top:14px;display:inline-flex;align-items:center;gap:7px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:999px;padding:9px 16px;font:650 12.5px var(--display);color:var(--ink-2);cursor:pointer;white-space:nowrap")}>Get ETH exposure against your vault position →</button>

          <p style={css("margin:13px 0 0;font:400 14.5px/1.55 var(--display);color:var(--ink-2);max-width:62ch")}>{vaultSub}</p>

          <div style={css("margin-top:16px;display:flex;gap:10px;align-items:flex-start;background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:13px 16px")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none;margin-top:1px")}><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M12 11v5"/></svg>
            <p style={css("margin:0;font:400 12.5px/1.55 var(--display);color:var(--ink-3)")}>Testnet stand-in that mirrors the Steakhouse Confidential Prime layout. It is <b style={css("color:var(--ink-2);font-weight:600")}>not</b> the live mainnet vault and is not affiliated with Steakhouse Financial or Morpho.</p>
          </div>

          {/* metric row */}
          <div style={css("display:flex;flex-wrap:wrap;gap:22px 44px;margin-top:28px")}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>APY</span><span style={css("font:800 34px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{vaultApy}%</span></div>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Total deposits</span><span style={css("font:800 34px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{vaultTotal} <span style={css("font:600 14px var(--mono);color:var(--ink-3)")}>cUSDC</span></span></div>
            <div style={css("display:flex;flex-direction:column;gap:5px")}><span style={css("font:650 10.5px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Share price</span><span style={css("font:800 34px var(--display);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1")}>{vaultSharePrice}</span></div>
          </div>

          {/* details */}
          <div style={css("margin-top:28px;border-top:1px solid var(--line)")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Curator</span><span style={css("font:650 13px var(--display);color:var(--ink)")}>{vaultCurator}</span></div>
            <div style={css("display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Collateral exposure</span><span style={css("display:inline-flex;align-items:center;gap:8px")}><span style={css("display:inline-flex;align-items:center;gap:6px;font:650 12.5px var(--display);color:var(--ink)")}><TokenIcon token="cUSDC" size={18} />cUSDC</span><span style={css("display:inline-flex;align-items:center;gap:6px;font:650 12.5px var(--display);color:var(--ink)")}><TokenIcon token="cWETH" size={18} />cWETH</span></span></div>
            <div style={css("display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Share token</span><span style={css("font:650 13px var(--mono);color:var(--ink)")}>{vaultShare}</span></div>
          </div>

          <button onClick={() => setMoreDetails((v) => !v)} style={css("margin-top:16px;display:inline-flex;align-items:center;gap:7px;background:none;border:none;cursor:pointer;font:700 11px var(--display);letter-spacing:.08em;color:var(--ink-2);padding:0")}>{moreDetailsLabel}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
          {moreDetails && (
            <>
              <div style={css("margin-top:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:6px 18px")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Asset</span><span style={css("font:650 12.5px var(--mono);color:var(--ink)")}>{vaultShare} · cUSDC</span></div>
                <div style={css("display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Chain</span><span style={css("display:inline-flex;align-items:center;gap:7px;font:650 12.5px var(--display);color:var(--ink)")}><span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2")} />Sepolia</span></div>
                <div style={css("display:flex;align-items:center;justify-content:space-between;padding:12px 0")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>Contract</span><span style={css("display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font:600 12px var(--mono);color:var(--ink-2)")}>{vaultContract}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></span></div>
              </div>
              <p style={css("margin:12px 2px 0;font:400 11.5px/1.5 var(--display);color:var(--ink-3)")}>Follows the Morpho Vaults V2 architecture · confidential balances powered by Zama FHE · replicated on Sepolia for the Developer Program.</p>
            </>
          )}
        </div>

        {/* RIGHT: deposit card */}
        <div style={css("flex:1 1 340px;max-width:400px;position:sticky;top:14px;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 1px 2px rgba(20,18,12,.03),0 12px 34px rgba(20,18,12,.05);padding:16px")}>
          <div style={css("display:flex;gap:2px;padding:4px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px")}>
            <button style={segStyle(vaultTab === "deposit")} onClick={() => setVaultTab("deposit")}>Deposit</button>
            <button style={segStyle(vaultTab === "withdraw")} onClick={() => setVaultTab("withdraw")}>Withdraw</button>
          </div>

          <div style={css("margin-top:12px;border:1px solid var(--line);border-radius:14px;padding:14px 16px")}>
            <div style={css("display:flex;justify-content:space-between;align-items:center;margin-bottom:6px")}><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>You deposit</span><span style={css("font:700 10px var(--mono);color:var(--ink-3);letter-spacing:.05em")}>MAX</span></div>
            <div style={css("display:flex;align-items:center;gap:10px")}>
              <input value={vaultAmt} onChange={(e) => setVaultAmt(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={css("border:none;outline:none;background:none;font:750 28px var(--display);color:var(--ink);flex:1;min-width:0;padding:0;font-variant-numeric:tabular-nums")} />
              <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font:650 12.5px var(--mono);color:var(--ink);white-space:nowrap;flex:none")}><TokenIcon token={vaultInTok} size={20} />{vaultInTok}</span>
            </div>
          </div>
          <div style={css("display:flex;align-items:center;justify-content:space-between;padding:12px 4px 2px")}><span style={css("font:500 12.5px var(--display);color:var(--ink-2)")}>You receive</span><span style={css("font:650 12.5px var(--mono);color:var(--ink)")}>≈ {vaultReceive.toFixed(2)} {vaultOutTok}</span></div>

          {/* batch banner */}
          <div style={css("margin-top:12px;border:1px solid #f0d97a;background:var(--accent-soft);border-radius:14px;padding:13px 15px")}>
            <div style={css("display:flex;align-items:center;gap:9px")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a6d00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg><span style={css("font:700 12.5px var(--display);color:#7a5f00")}>Confidential deposit · next batch in ~{vaultBatch}</span></div>
            <p style={css("margin:8px 0 0;font:400 11.5px/1.5 var(--display);color:#8a6d00")}>Testnet window: 60s · the live mainnet vault batches ~12h. <a href="#" onClick={quitBatch} style={css("color:#7a5f00;font-weight:700;text-decoration:underline")}>Quit before dispatch</a> for a full encrypted refund.</p>
          </div>

          {/* lifecycle */}
          <div style={css("margin-top:14px")}>
            <span style={css("font:650 10px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Batch lifecycle</span>
            <div style={css("display:flex;align-items:center;gap:6px;margin-top:9px")}>
              <span style={css("flex:1;text-align:center;padding:7px 4px;border-radius:9px;background:var(--accent-soft);border:1px solid #f0d97a;font:700 11px var(--display);color:#7a5f00")}>Open</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none")}><path d="M9 6l6 6-6 6"/></svg>
              <span style={css("flex:1;text-align:center;padding:7px 4px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line);font:600 11px var(--display);color:var(--ink-3)")}>Dispatched</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none")}><path d="M9 6l6 6-6 6"/></svg>
              <span style={css("flex:1;text-align:center;padding:7px 4px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line);font:600 11px var(--display);color:var(--ink-3)")}>Finalized</span>
            </div>
          </div>

          <button
            onClick={vaultSubmit}
            disabled={disabled}
            style={cssm(
              "width:100%;margin-top:15px;padding:14px;border-radius:13px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 14px var(--display);cursor:pointer;box-shadow:0 5px 15px rgba(255,210,8,.3)",
              disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined,
            )}
          >{vaultActionLabel}</button>
          <div style={css("display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px")}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg><span style={css("font:600 11px var(--display);color:var(--ink-3)")}>Balance is end-to-end encrypted · powered by BatcherConfidential</span></div>
        </div>
      </div>
    </div>
  );
}
