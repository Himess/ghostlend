"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useEncrypt, useConfidentialSetOperator } from "@zama-fhe/react-sdk";
import { css } from "@/lib/css";
import { ADDR } from "@/lib/addresses";
import { poolAbi } from "@/lib/abis";
import { useNav } from "@/lib/nav";
import { useToast } from "@/components/Toast";

// CP6 task #4 — guided "get ETH exposure against your vault position" wizard. Composes, with NO swap and
// BOTH legs confidential:
//   Step 1 — Market 2: deposit csteakcUSDC collateral → borrow cUSDC.
//   Step 2 — Market 1: deposit that cUSDC collateral → borrow cWETH.
// Every step is an encrypted pool op; there is no public swap leg anywhere in the path.
const u6 = (s: string) => BigInt(Math.max(0, Math.floor(Number(s || "0") * 1e6)));

// Hoisted to module scope. Defining these INSIDE Wizard() gave them a fresh component identity on every
// render, so React unmounted+remounted the <input> on each keystroke and it lost focus (only one char per
// click). Module scope = stable identity across renders → the input keeps focus.
function Field({ label, tok, val, set }: { label: string; tok: string; val: string; set: (v: string) => void }) {
  return (
    <div style={css("border:1px solid var(--line);border-radius:14px;padding:14px 16px")}>
      <div style={css("display:flex;justify-content:space-between;margin-bottom:6px")}><span style={css("font:600 12px var(--display);color:var(--ink-2)")}>{label}</span></div>
      <div style={css("display:flex;align-items:center;gap:10px")}>
        <input value={val} inputMode="decimal" onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))} style={css("border:none;outline:none;background:none;font:750 24px var(--display);color:var(--ink);flex:1;min-width:0;padding:0")} />
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font:650 12.5px var(--display);color:var(--ink);white-space:nowrap;flex:none")}><span style={css("width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font:700 8px var(--mono)")}>c</span>{tok}</span>
      </div>
    </div>
  );
}
function Priv() {
  return (
    <div style={css("display:flex;align-items:center;gap:7px;margin-top:10px")}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg><span style={css("font:600 11.5px var(--display);color:#166b45")}>Encrypted · no public swap leg</span></div>
  );
}

export function Wizard() {
  const { wizardOpen, setWizardOpen } = useNav();
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const { mutateAsync: encrypt } = useEncrypt();
  const { writeContractAsync } = useWriteContract();
  const setOpShare = useConfidentialSetOperator(ADDR.cSHARE as `0x${string}`).mutateAsync;
  const setOpUsdc = useConfidentialSetOperator(ADDR.cUSDC as `0x${string}`).mutateAsync;

  const [step, setStep] = useState(0); // 0=intro,1=market2,2=market1,3=done
  const [collShare, setCollShare] = useState("10000");
  const [borrowUsdc, setBorrowUsdc] = useState("6000");
  const [collUsdc, setCollUsdc] = useState("6000");
  const [borrowWeth, setBorrowWeth] = useState("1.5");
  const [busy, setBusy] = useState(false);

  if (!wizardOpen) return null;
  const close = () => { setWizardOpen(false); setStep(0); };

  const guard = () => { if (!isConnected) { toast("Connect your wallet first", "err"); return false; } return true; };

  const encFor = async (v: bigint) =>
    encrypt({ values: [{ value: v, type: "euint64" }], contractAddress: ADDR.pool as `0x${string}`, userAddress: address! });

  const runM2 = async () => {
    if (!guard()) return;
    try {
      setBusy(true);
      await setOpShare({ operator: ADDR.pool as `0x${string}`, until: Math.floor(Date.now() / 1000) + 86400 });
      const c = await encFor(u6(collShare));
      await writeContractAsync({ address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "depositCollateral", args: [2, c.encryptedValues[0], c.inputProof] });
      const b = await encFor(u6(borrowUsdc));
      await writeContractAsync({ address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "borrow", args: [2, b.encryptedValues[0], b.inputProof] });
      toast("Market 2: csteakcUSDC collateral in, cUSDC borrowed · encrypted");
      setStep(2);
    } catch (e: any) { toast(e.shortMessage || e.message?.split("\n")[0] || "failed", "err"); } finally { setBusy(false); }
  };

  const runM1 = async () => {
    if (!guard()) return;
    try {
      setBusy(true);
      await setOpUsdc({ operator: ADDR.pool as `0x${string}`, until: Math.floor(Date.now() / 1000) + 86400 });
      const c = await encFor(u6(collUsdc));
      await writeContractAsync({ address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "depositCollateral", args: [1, c.encryptedValues[0], c.inputProof] });
      const b = await encFor(u6(borrowWeth));
      await writeContractAsync({ address: ADDR.pool as `0x${string}`, abi: poolAbi, functionName: "borrow", args: [1, b.encryptedValues[0], b.inputProof] });
      toast("Market 1: cUSDC collateral in, cWETH borrowed · encrypted");
      setStep(3);
    } catch (e: any) { toast(e.shortMessage || e.message?.split("\n")[0] || "failed", "err"); } finally { setBusy(false); }
  };

  return (
    <div onClick={close} style={css("position:fixed;inset:0;z-index:50;background:rgba(20,18,12,.42);display:flex;align-items:center;justify-content:center;padding:20px")}>
      <div onClick={(e) => e.stopPropagation()} style={css("width:min(560px,100%);background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 60px rgba(0,0,0,.28);padding:26px 28px;max-height:90vh;overflow:auto")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px")}>
          <div>
            <h2 style={css("margin:0;font:800 24px var(--display);letter-spacing:-.02em")}>Deposit cUSDC → borrow cWETH</h2>
            <p style={css("margin:8px 0 0;font:400 13.5px/1.5 var(--display);color:var(--ink-2);max-width:44ch")}>Get confidential ETH exposure against your vault position — no swap, no public leg. Composes two isolated markets.</p>
          </div>
          <button onClick={close} style={css("background:none;border:none;cursor:pointer;color:var(--ink-3);font:700 20px var(--display)")}>×</button>
        </div>

        <div style={css("display:flex;gap:8px;margin:20px 0 4px")}>
          {["csteakcUSDC → cUSDC", "cUSDC → cWETH"].map((l, i) => (
            <div key={i} style={css(`flex:1;padding:10px 12px;border-radius:12px;border:1px solid ${step > i ? "var(--green)" : step === i + 1 ? "#f0d97a" : "var(--line)"};background:${step > i ? "var(--green-bg)" : step === i + 1 ? "var(--accent-soft)" : "var(--surface-2)"}`)}>
              <div style={css("font:700 10px var(--mono);letter-spacing:.06em;color:var(--ink-3)")}>STEP {i + 1} · MARKET {i === 0 ? 2 : 1}</div>
              <div style={css("font:650 12.5px var(--display);color:var(--ink);margin-top:3px")}>{l}</div>
            </div>
          ))}
        </div>

        {step <= 1 && (
          <div style={css("margin-top:18px")}>
            <Field label="Deposit collateral (from your Earn position)" tok="csteakcUSDC" val={collShare} set={setCollShare} />
            <div style={css("height:10px")} />
            <Field label="Borrow" tok="cUSDC" val={borrowUsdc} set={setBorrowUsdc} />
            <Priv />
            <button disabled={busy} onClick={runM2} style={css("width:100%;margin-top:16px;padding:14px;border-radius:13px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 14px var(--display);cursor:pointer;opacity:" + (busy ? ".6" : "1"))}>{busy ? "Submitting…" : "Step 1 — approve operator & confirm (Market 2)"}</button>
          </div>
        )}
        {step === 2 && (
          <div style={css("margin-top:18px")}>
            <Field label="Deposit collateral (the cUSDC you just borrowed)" tok="cUSDC" val={collUsdc} set={setCollUsdc} />
            <div style={css("height:10px")} />
            <Field label="Borrow" tok="cWETH" val={borrowWeth} set={setBorrowWeth} />
            <Priv />
            <button disabled={busy} onClick={runM1} style={css("width:100%;margin-top:16px;padding:14px;border-radius:13px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 14px var(--display);cursor:pointer;opacity:" + (busy ? ".6" : "1"))}>{busy ? "Submitting…" : "Step 2 — approve operator & confirm (Market 1)"}</button>
          </div>
        )}
        {step === 3 && (
          <div style={css("margin-top:22px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center")}>
            <span style={css("width:46px;height:46px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>
            <h3 style={css("margin:0;font:750 18px var(--display)")}>Confidential cWETH exposure opened</h3>
            <p style={css("margin:0;font:400 13px/1.55 var(--display);color:var(--ink-2);max-width:42ch")}>Both borrows are encrypted end-to-end — nobody can see your ETH exposure or how it was built. Check My Position (Decrypt) to view it.</p>
            <button onClick={close} style={css("margin-top:6px;padding:11px 22px;border-radius:12px;border:1px solid var(--line-2);background:#fff;font:650 13px var(--display);cursor:pointer")}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
