"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { useApproveUnderlying, useShield } from "@zama-fhe/react-sdk";
import { css, cssm } from "@/lib/css";
import { useNav } from "@/lib/nav";
import { useToast } from "@/components/Toast";
import { ADDR } from "@/lib/addresses";
import { erc20Abi } from "@/lib/abis";

// Decimal-string -> base-units bigint without float precision loss (matters at 18 decimals).
function toBaseUnits(amountStr: string, decimals: number): bigint {
  const [whole, frac = ""] = (amountStr || "0").split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}
function errMsg(e: unknown, fallback: string): string {
  const top = e as { shortMessage?: string; message?: string; cause?: unknown } | undefined;
  const topMsg = top?.shortMessage || top?.message || "";
  // The Zama SDK wraps write failures as "Transaction failed during <op>" and buries the real
  // viem/wallet error (revert reason, chain mismatch, user-rejected, …) in .cause — walk the chain
  // and surface the first distinct message so the toast is actually actionable.
  let cause: unknown = top?.cause;
  let causeMsg = "";
  for (let i = 0; cause && typeof cause === "object" && i < 6; i++) {
    const c = cause as { shortMessage?: string; message?: string; cause?: unknown };
    const m = c.shortMessage || c.message;
    if (typeof m === "string" && m && m !== topMsg) { causeMsg = m; break; }
    cause = c.cause;
  }
  const combined = causeMsg ? `${topMsg} — ${causeMsg}` : topMsg;
  return combined || fallback;
}

function segStyle(active: boolean) {
  return css(
    `flex:1 1 auto;text-align:center;cursor:pointer;white-space:nowrap;padding:7px 6px;border-radius:9px;font:${active ? 700 : 550} 12px var(--display);color:${active ? "#1a1a1a" : "var(--ink-2)"};background-color:${active ? "#fff" : "transparent"};border:${active ? "1px solid var(--line-2)" : "1px solid transparent"};box-shadow:${active ? "0 1px 3px rgba(0,0,0,.06)" : "none"}`,
  );
}

function StepNum({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <span
      style={
        dark
          ? css("width:26px;height:26px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font:700 12px var(--mono);color:#1a1a1a")
          : css("width:26px;height:26px;border-radius:50%;background:var(--accent-soft);border:1px solid #f0e08f;display:flex;align-items:center;justify-content:center;font:700 12px var(--mono);color:#8a6d00")
      }
    >
      {n}
    </span>
  );
}

function MintRow({ symbol, bg, onMint, disabled, pending }: { symbol: string; bg: string; onMint: () => void; disabled: boolean; pending: boolean }) {
  return (
    <div style={css("display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border:1px solid var(--line);border-radius:13px")}>
      <span style={css("display:inline-flex;align-items:center;gap:9px;font:650 13.5px var(--display);color:var(--ink)")}>
        <span style={css(`width:26px;height:26px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font:700 10px var(--mono)`)}>{symbol[0]}</span>
        {symbol}
      </span>
      <button
        onClick={onMint}
        disabled={disabled}
        style={cssm("padding:8px 14px;border-radius:999px;border:1px solid var(--line-2);background:#fff;font:650 12px var(--display);color:var(--ink);cursor:pointer", disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined)}
      >
        {pending ? "Minting…" : "Mint 1,000"}
      </button>
    </div>
  );
}

export function Faucet() {
  const { address, isConnected } = useAccount();
  const pushToast = useToast();
  const { go } = useNav();

  const [shieldToken, setShieldToken] = useState<"USDC" | "WETH">("USDC");
  const [shieldAmt, setShieldAmt] = useState("1000");

  // ---- step 1: mint mock underlying ----
  // The mock ERC-20s' mint(to,amount) is permissionless (PROBE P3) with a 1M-tokens/call cap,
  // so minting 1,000 test tokens always fits in a single call.
  const { writeContract: mintUsdcWrite, isPending: mintingUsdc } = useWriteContract();
  const { writeContract: mintWethWrite, isPending: mintingWeth } = useWriteContract();

  function mintUsdc() {
    if (!isConnected || !address) { pushToast("Connect your wallet first", "err"); return; }
    mintUsdcWrite(
      { address: ADDR.usdcUnderlying as `0x${string}`, abi: erc20Abi, functionName: "mint", args: [address, 1000n * 10n ** 6n] },
      { onSuccess: () => pushToast("Minted 1,000 test USDC · public mint"), onError: (e) => pushToast(errMsg(e, "Mint failed"), "err") },
    );
  }
  function mintWeth() {
    if (!isConnected || !address) { pushToast("Connect your wallet first", "err"); return; }
    mintWethWrite(
      { address: ADDR.wethUnderlying as `0x${string}`, abi: erc20Abi, functionName: "mint", args: [address, 1000n * 10n ** 18n] },
      { onSuccess: () => pushToast("Minted 1,000 test WETH · public mint"), onError: (e) => pushToast(errMsg(e, "Mint failed"), "err") },
    );
  }

  // ---- step 2: shield underlying -> confidential (approve the wrapper to pull underlying, then wrap) ----
  const approveCUsdc = useApproveUnderlying(ADDR.cUSDC as `0x${string}`);
  const approveCWeth = useApproveUnderlying(ADDR.cWETH as `0x${string}`);
  const shieldCUsdc = useShield({ address: ADDR.cUSDC as `0x${string}` });
  const shieldCWeth = useShield({ address: ADDR.cWETH as `0x${string}` });
  const shielding = approveCUsdc.isPending || approveCWeth.isPending || shieldCUsdc.isPending || shieldCWeth.isPending;
  const shieldReceive = "c" + shieldToken;

  async function shieldNow() {
    if (!isConnected) { pushToast("Connect your wallet first", "err"); return; }
    const decimals = shieldToken === "USDC" ? 6 : 18;
    const amount = toBaseUnits(shieldAmt, decimals);
    if (amount <= 0n) return;
    const approveUnderlying = shieldToken === "USDC" ? approveCUsdc.mutateAsync : approveCWeth.mutateAsync;
    const shield = shieldToken === "USDC" ? shieldCUsdc.mutateAsync : shieldCWeth.mutateAsync;
    try {
      await approveUnderlying({ amount });
      await shield({ amount });
      pushToast(`Shielded ${shieldAmt || "0"} ${shieldToken} → c${shieldToken} · now confidential`);
    } catch (e) {
      console.error("[shield failed] full error + cause chain:", e); // real reason is in .cause
      pushToast(errMsg(e, "Shield failed"), "err");
    }
  }

  return (
    <div style={css("max-width:1080px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em")}>Faucet</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>Mint test tokens, shield them into confidential balances, then you’re ready to lend.</p>
        </div>
        <span style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;background:#f3edff;border:1px solid #e2d5ff;color:#6b41c9;font:700 11.5px var(--display)")}>
          <span style={css("width:7px;height:7px;border-radius:50%;background:#8a63d2")} />
          Sepolia testnet
        </span>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 22px")} />

      {/* PUBLIC STEP banner — the only boundary-crossing step on this screen: minting the plaintext
          underlying ERC-20 is a public on-chain action. It only becomes confidential once shielded below. */}
      <div style={css("display:flex;align-items:flex-start;gap:12px;background:#fbf1dc;border:1px solid #f0d97a;border-radius:16px;padding:15px 20px;margin-bottom:18px")}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={css("flex:none;margin-top:1px")}>
          <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
        <div style={css("display:flex;flex-direction:column;gap:4px")}>
          <span style={css("font:750 10.5px var(--display);letter-spacing:.09em;text-transform:uppercase;color:#8a6d00")}>Public step</span>
          <p style={css("margin:0;font:400 13.5px/1.5 var(--display);color:var(--ink-2)")}>
            <b style={css("color:var(--ink);font-weight:700")}>This mint is public.</b> Test tokens are minted transparently on Sepolia — shield them in step 2 to convert into confidential balances.
          </p>
        </div>
      </div>

      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px")}>
        {/* STEP 1 */}
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);display:flex;flex-direction:column")}>
          <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px")}>
            <StepNum n={1} />
            <span style={css("font:750 15px var(--display);letter-spacing:-.01em")}>Mint test tokens</span>
          </div>
          <div style={css("display:flex;flex-direction:column;gap:10px")}>
            <MintRow symbol="USDC" bg="#2775ca" onMint={mintUsdc} disabled={!isConnected || mintingUsdc} pending={mintingUsdc} />
            <MintRow symbol="WETH" bg="#3a3f4a" onMint={mintWeth} disabled={!isConnected || mintingWeth} pending={mintingWeth} />
          </div>
          <p style={css("margin:14px 0 0;font:400 11.5px/1.5 var(--display);color:var(--ink-3)")}>Gas is paid in Sepolia ETH — grab some from a public Sepolia faucet if your balance is empty.</p>
        </div>

        {/* STEP 2 */}
        <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);display:flex;flex-direction:column")}>
          <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px")}>
            <StepNum n={2} />
            <span style={css("font:750 15px var(--display);letter-spacing:-.01em")}>Shield into confidential</span>
          </div>
          <div style={css("display:flex;gap:2px;padding:4px;background:var(--surface-2);border:1px solid var(--line);border-radius:11px;margin-bottom:12px")}>
            <button style={segStyle(shieldToken === "USDC")} onClick={() => setShieldToken("USDC")}>USDC</button>
            <button style={segStyle(shieldToken === "WETH")} onClick={() => setShieldToken("WETH")}>WETH</button>
          </div>
          <div style={css("border:1px solid var(--line);border-radius:13px;padding:12px 14px")}>
            <span style={css("font:600 11px var(--display);color:var(--ink-3)")}>You shield</span>
            <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
              <input
                value={shieldAmt}
                onChange={(e) => setShieldAmt((e.target.value || "").replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                style={css("border:none;outline:none;background:none;font:750 22px var(--display);color:var(--ink);flex:1;min-width:0;padding:0;font-variant-numeric:tabular-nums")}
              />
              <span style={css("font:650 12.5px var(--mono);color:var(--ink-2);white-space:nowrap")}>{shieldToken}</span>
            </div>
          </div>
          <div style={css("display:flex;justify-content:center;margin:8px 0")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </div>
          <div style={css("border:1px solid var(--line);border-radius:13px;padding:12px 14px;background:var(--surface-2)")}>
            <span style={css("font:600 11px var(--display);color:var(--ink-3)")}>You receive</span>
            <div style={css("display:flex;align-items:center;gap:8px;margin-top:5px")}>
              <span style={css("font:750 22px var(--display);color:var(--ink);flex:1;font-variant-numeric:tabular-nums")}>{shieldAmt || "0"}</span>
              <span style={css("display:inline-flex;align-items:center;gap:6px;font:650 12.5px var(--mono);color:var(--ink);white-space:nowrap")}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                {shieldReceive}
              </span>
            </div>
          </div>
          <button
            onClick={shieldNow}
            disabled={!isConnected || shielding}
            style={cssm(
              "width:100%;margin-top:14px;padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.06);background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;font:700 13.5px var(--display);cursor:pointer;box-shadow:0 4px 13px rgba(255,210,8,.28)",
              !isConnected || shielding ? { opacity: 0.6, cursor: "not-allowed" } : undefined,
            )}
          >
            {shielding ? "Shielding…" : `Shield ${shieldToken}`}
          </button>
        </div>

        {/* STEP 3 */}
        <div style={css("background:var(--panel);border:1px solid #2a2621;border-radius:20px;padding:22px;display:flex;flex-direction:column;color:#f3f1ec")}>
          <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px")}>
            <StepNum n={3} dark />
            <span style={css("font:750 15px var(--display);letter-spacing:-.01em")}>You’re ready</span>
          </div>
          <p style={css("margin:0;font:400 13.5px/1.6 var(--display);color:#b7b2a8;flex:1")}>Your confidential balances are set. Head to Markets to supply, borrow or open a leveraged position — all fully encrypted.</p>
          <button
            onClick={() => go("markets")}
            style={css("width:100%;margin-top:18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:12px;padding:13px;font:700 13.5px var(--display);cursor:pointer;box-shadow:0 5px 16px rgba(255,210,8,.32)")}
          >
            Go to Markets →
          </button>
        </div>
      </div>
    </div>
  );
}
