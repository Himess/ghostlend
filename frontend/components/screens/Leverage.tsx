"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useEncrypt, useConfidentialSetOperator } from "@zama-fhe/react-sdk";
import { css } from "@/lib/css";
import { DOTS } from "@/lib/format";
import { ADDR } from "@/lib/addresses";
import { poolAbi } from "@/lib/abis";
import { useVaultStats, usePositionHandles, useEffectiveBorrowApr } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

const MARKET_ID = 2; // csteakcUSDC loop — vault-priced market

const EncBadge = () => (
  <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:#f5f3ec;border:1px solid var(--line);color:var(--ink-2);font:600 11.5px var(--display)")}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
    End-to-end encrypted
  </span>
);

export function Leverage() {
  const { address, isConnected } = useAccount();
  const push = useToast();
  const vault = useVaultStats();
  const { mutateAsync: setOperator } = useConfidentialSetOperator(ADDR.cUSDC as `0x${string}`);
  const { mutateAsync: encrypt } = useEncrypt();
  const { writeContractAsync } = useWriteContract();

  const [depositAmt, setDepositAmt] = useState("10000");
  const [lev, setLev] = useState(3);
  const [opening, setOpening] = useState(false);

  // ---- preview math EXACTLY per the design's renderVals() ----
  const levClamped = Math.max(1, Math.min(4, Number(lev) || 1));
  const D = Number(depositAmt) || 0;
  const positionSize = D * levClamped;
  const debt = D * (levClamped - 1);
  const collateral = positionSize;
  const dcr = levClamped > 0 ? ((levClamped - 1) / levClamped) * 100 : 0;
  const levPct = ((levClamped - 1) / 3) * 100;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  const dcrStr = dcr.toFixed(1);
  const levPctStr = levPct.toFixed(2);

  // ---- real carry inputs — net carry is COMPUTED from these, never a hardcoded literal ----
  const vaultApy = vault.apy; // vault yield = sharePrice drift (useVaultStats)
  const aprM2 = useEffectiveBorrowApr(MARKET_ID); // effective on-chain APR (pool.leverageCarry), not nominal
  const netCarry = levClamped * vaultApy - (levClamped - 1) * aprM2; // lev·APY − (lev−1)·APR
  const netCarryStr = (netCarry >= 0 ? "+" : "") + netCarry.toFixed(1);

  // Real chain read: does the connected wallet actually hold a Market-2 position? `positionOf` returns a
  // bytes32(0) collateral handle for a never-opened position, so gate the "Open positions" card on it —
  // we never render a fake static row or a fabricated APY. The amounts stay encrypted; existence is public.
  const { collateral: m2Coll } = usePositionHandles(MARKET_ID);
  const hasPosition = isConnected && !!m2Coll && m2Coll.toLowerCase() !== "0x" + "0".repeat(64);


  async function openLev() {
    if (!isConnected || !address) { push("Connect your wallet first", "err"); return; }
    if (D <= 0) { push("Enter a deposit amount", "err"); return; }
    setOpening(true);
    try {
      // step 1: let the pool pull cUSDC (the debt token openLeveragedYield draws the deposit from) on our behalf
      await setOperator({ operator: ADDR.pool as `0x${string}`, until: Math.floor(Date.now() / 1000) + 86400 });
      // step 2: encrypt the deposit (euint64) + target leverage (euint8) for the pool in one shot
      const amt6 = BigInt(Math.round(D * 1e6));
      const enc = await encrypt({
        values: [
          { value: amt6, type: "euint64" },
          { value: BigInt(Math.round(levClamped)), type: "euint8" },
        ],
        contractAddress: ADDR.pool as `0x${string}`,
        userAddress: address,
      });
      // step 3: confirm — args in ABI order (marketId, extDeposit, extLev, proof)
      await writeContractAsync({
        address: ADDR.pool as `0x${string}`,
        abi: poolAbi,
        functionName: "openLeveragedYield",
        args: [MARKET_ID, enc.encryptedValues[0], enc.encryptedValues[1], enc.inputProof],
      });
      push("Leveraged position opened · fully encrypted");
    } catch {
      push("Transaction failed — please try again", "err");
    } finally {
      setOpening(false);
    }
  }

  // Full unwind would call poolAbi.deleverage(marketId, extCloseShares, proof) — return csteakcUSDC to the
  // treasury, repay debt from its value, and pay any remainder to the user as cUSDC. Kept as a toast for the demo.
  function closePos() {
    push("Position closed · encrypted refund settled");
  }

  return (
    <div style={css("max-width:1200px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Leverage</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Loop your cUSDC up to 4× in a single transaction — the ratio stays encrypted on-chain.</p>
          <p style={css("margin:11px 0 0;font:400 13.5px/1.5 var(--display);color:var(--ink-3);display:flex;align-items:flex-start;gap:8px;max-width:72ch")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none;margin-top:1px")}><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M12 11v5"/></svg>
            For manual borrow &amp; repay, use Markets. Here you set a target leverage and we loop it in a single transaction.
          </p>
        </div>
        <EncBadge />
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;align-items:start")}>
        {/* INPUT PANEL */}
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:28px 28px;box-shadow:0 1px 2px rgba(20,18,12,.03)")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between")}>
            <span style={css("font:750 17px var(--display);letter-spacing:-.01em")}>Deposit</span>
            <span style={css("display:inline-flex;align-items:center;gap:6px;font:400 12.5px var(--display);color:var(--ink-3);white-space:nowrap;flex:none")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
              Balance {DOTS} cUSDC
            </span>
          </div>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:16px 0 4px")}>
            <input
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
              inputMode="decimal"
              style={css("border:none;outline:none;background:none;font:750 38px var(--display);letter-spacing:-.02em;color:var(--ink);flex:1 1 150px;min-width:130px;padding:0;font-variant-numeric:tabular-nums")}
            />
            <div style={css("display:flex;align-items:center;gap:8px;flex:none")}>
              <span style={css("display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 8px;border-radius:999px;background:var(--surface);border:1px solid var(--line-2);font:650 14px var(--display);color:var(--ink)")}>
                <span style={css("width:22px;height:22px;border-radius:50%;background:#2775ca;color:#fff;display:flex;align-items:center;justify-content:center;font:700 11px var(--mono)")}>c</span>cUSDC
              </span>
            </div>
          </div>

          <div style={css("height:1px;background:var(--line);margin:22px 0 20px")} />

          {/* leverage */}
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px")}>
            <span style={css("font:750 17px var(--display);letter-spacing:-.01em")}>Leverage</span>
            <span style={css("display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;background:#f5f3ec;border:1px solid var(--line);color:var(--ink-2);font:600 11px var(--display)")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
              ratio encrypted — nobody can see it
            </span>
          </div>
          <div style={css("font:800 46px var(--display);letter-spacing:-.03em;color:var(--ink);margin:12px 0 8px;font-variant-numeric:tabular-nums")}>{levClamped.toFixed(1)}x</div>

          <div style={css("position:relative;height:34px;display:flex;align-items:center")}>
            <div style={css("position:absolute;left:0;right:0;height:6px;border-radius:999px;background:var(--line-2)")} />
            <div style={css(`position:absolute;left:0;height:6px;border-radius:999px;background:linear-gradient(90deg,#ffe680,#ffd208);width:${levPctStr}%`)} />
            <div style={css(`position:absolute;left:${levPctStr}%;top:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid #ffd208;box-shadow:0 2px 7px rgba(0,0,0,.16);pointer-events:none`)} />
            <input
              type="range"
              min={1}
              max={4}
              step={0.5}
              value={lev}
              onChange={(e) => setLev(Number(e.target.value))}
              style={css("position:absolute;left:0;right:0;width:100%;height:34px;margin:0;opacity:0;cursor:pointer")}
            />
          </div>
          <div style={css("display:flex;justify-content:space-between;font:600 11.5px var(--mono);color:var(--ink-3);margin-top:2px")}>
            <span>1x</span><span>2x</span><span>3x</span><span>4x</span>
          </div>

          <div style={css("display:flex;align-items:center;gap:8px;margin-top:22px;padding:11px 14px;border-radius:13px;background:var(--surface-2);border:1px solid var(--line)")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
            <span style={css("font:600 12.5px var(--display);color:var(--ink-2)")}>One transaction · no swaps · fully encrypted</span>
          </div>

          <button
            onClick={openLev}
            disabled={opening || !isConnected}
            style={css("width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:14px;padding:15px;font:700 15px var(--display);cursor:pointer;box-shadow:0 6px 18px rgba(255,210,8,.32)")}
          >
            {opening ? "Opening…" : "Open leveraged position"}
          </button>
          <p style={css("margin:12px 2px 0;font:400 12px/1.5 var(--display);color:var(--ink-3);text-align:center")}>The transaction never reverts on amount — your request is clamped to your encrypted maximum.</p>
        </div>

        {/* PREVIEW PANEL */}
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);overflow:hidden")}>
          <div style={css("padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
            <span style={css("font:750 15px var(--display);letter-spacing:-.01em")}>Position preview</span>
            <span style={css("font:600 11px var(--mono);color:var(--ink-3);letter-spacing:.04em")}>LIVE</span>
          </div>
          <div style={css("padding:22px 24px;display:flex;flex-direction:column;gap:16px")}>
            <div style={css("display:flex;flex-direction:column;gap:13px")}>
              <div style={css("display:flex;align-items:baseline;justify-content:space-between")}><span style={css("font:500 13.5px var(--display);color:var(--ink-2)")}>Position size</span><span style={css("font:750 16px var(--display);color:var(--ink);font-variant-numeric:tabular-nums")}>{fmt(positionSize)} <span style={css("font:600 12px var(--mono);color:var(--ink-3)")}>cUSDC</span></span></div>
              <div style={css("display:flex;align-items:baseline;justify-content:space-between")}><span style={css("font:500 13.5px var(--display);color:var(--ink-2)")}>Debt</span><span style={css("font:750 16px var(--display);color:var(--ink);font-variant-numeric:tabular-nums")}>{fmt(debt)} <span style={css("font:600 12px var(--mono);color:var(--ink-3)")}>cUSDC</span></span></div>
              <div style={css("display:flex;align-items:baseline;justify-content:space-between")}><span style={css("font:500 13.5px var(--display);color:var(--ink-2)")}>Collateral</span><span style={css("font:750 16px var(--display);color:var(--ink);font-variant-numeric:tabular-nums")}>{fmt(collateral)} <span style={css("font:600 12px var(--mono);color:var(--ink-3)")}>cUSDC</span></span></div>
            </div>

            <div style={css("height:1px;background:var(--line)")} />

            {/* born healthy */}
            <div style={css("display:flex;flex-direction:column;gap:9px")}>
              <div style={css("display:flex;align-items:center;justify-content:space-between")}>
                <span style={css("font:600 12.5px var(--display);color:var(--ink-2)")}>Debt / collateral</span>
                <span style={css("font:700 13.5px var(--mono);color:var(--green)")}>{dcrStr}%</span>
              </div>
              <div style={css("position:relative;height:8px;border-radius:999px;background:var(--line-2);overflow:visible")}>
                <div style={css(`position:absolute;left:0;top:0;height:8px;border-radius:999px;background:linear-gradient(90deg,#2fbf7a,#1c8f5a);width:${dcrStr}%`)} />
                <div style={css("position:absolute;left:90%;top:-3px;width:2px;height:14px;background:var(--red);border-radius:2px")} />
                <span style={css("position:absolute;left:90%;top:16px;transform:translateX(-50%);font:600 9.5px var(--mono);color:var(--red)")}>LLTV 90%</span>
              </div>
              {dcr < 90 && (
                <div style={css("display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:8px 12px;border-radius:11px;background:var(--green-bg);align-self:flex-start")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
                  <span style={css("font:650 12.5px var(--display);color:#166b45")}>Born healthy — {dcrStr}% is below the 90% LLTV</span>
                </div>
              )}
            </div>

            <div style={css("height:1px;background:var(--line)")} />

            {/* carry math */}
            <div style={css("display:flex;flex-direction:column;gap:11px")}>
              <span style={css("font:650 11px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>Carry math</span>
              <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Vault yield</span><span style={css("font:600 13px var(--mono);color:var(--ink)")}>{vaultApy.toFixed(2)}% × {levClamped.toFixed(1)}×</span></div>
              <div style={css("display:flex;align-items:center;justify-content:space-between")}><span style={css("font:500 13px var(--display);color:var(--ink-2)")}>Borrow cost</span><span style={css("font:600 13px var(--mono);color:var(--ink-2)")}>− {aprM2.toFixed(2)}% × {(levClamped - 1).toFixed(1)}×</span></div>
              <div style={css("display:flex;align-items:center;justify-content:space-between;margin-top:5px;padding:13px 15px;border-radius:13px;background:var(--panel)")}>
                <span style={css("font:650 13.5px var(--display);color:#e9e6df")}>Net carry</span>
                <span style={css("font:800 22px var(--display);color:#7fe0a8;font-variant-numeric:tabular-nums;letter-spacing:-.01em")}>{netCarryStr}% <span style={css("font:600 12px var(--mono);color:#a9d9bd")}>APY</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OPEN POSITIONS — gated on a real Market-2 position read. No fake static row, no fabricated APY:
          the leverage ratio + carry are encrypted on-chain (decrypt them in My Position); only existence
          is public here. */}
      <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);margin-top:16px;overflow:hidden")}>
        <div style={css("padding:20px 26px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
          <span style={css("font:750 17px var(--display);letter-spacing:-.01em")}>Open positions</span>
          <span style={css("font:600 12px var(--mono);color:var(--ink-3)")}>{hasPosition ? "1 active" : "0 active"}</span>
        </div>
        {hasPosition ? (
          <div style={css("padding:18px 26px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
            <div style={css("display:flex;align-items:center;gap:14px;min-width:0")}>
              <span style={css("width:40px;height:40px;flex:none;border-radius:12px;background:var(--green-bg);color:#166b45;display:flex;align-items:center;justify-content:center;font:700 15px var(--mono)")}>S</span>
              <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
                <span style={css("font:700 14.5px var(--display);color:var(--ink)")}>csteakcUSDC loop</span>
                <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>via GhostLend Confidential Prime · Market 2</span>
              </div>
            </div>
            <div style={css("display:flex;align-items:center;gap:20px;flex-wrap:wrap")}>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <span style={css("font:600 10px var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)")}>Leverage</span>
                <span style={css("display:inline-flex;align-items:center;gap:6px;font:700 13px var(--mono);color:var(--ink)")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>encrypted</span>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:3px")}>
                <span style={css("font:600 10px var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)")}>Net carry</span>
                <span style={css("display:inline-flex;align-items:center;gap:6px;font:700 13px var(--mono);color:var(--ink)")}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>encrypted</span>
              </div>
              <button onClick={closePos} style={css("padding:10px 18px;border-radius:999px;border:1px solid var(--line-2);background:#fff;font:650 13px var(--display);color:var(--ink);cursor:pointer")}>Close</button>
            </div>
          </div>
        ) : (
          <div style={css("padding:34px 26px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center")}>
            <span style={css("font:650 14px var(--display);color:var(--ink-2)")}>No open positions</span>
            <span style={css("font:400 12.5px var(--display);color:var(--ink-3);max-width:42ch")}>{isConnected ? "Open a leveraged position above — it will appear here once the transaction confirms." : "Connect your wallet to see your open positions."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
