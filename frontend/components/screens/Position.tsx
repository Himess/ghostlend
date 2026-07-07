"use client";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useGrantPermit, useHasPermit, useDecryptValues } from "@zama-fhe/react-sdk";
import { css } from "@/lib/css";
import { DOTS, fmtUnits6 } from "@/lib/format";
import { ADDR, MARKETS, PERMIT_CONTRACTS, type MarketDef } from "@/lib/addresses";
import { usePositionHandles, useEthPrice, useVaultStats, tokenUsdPerUnit } from "@/lib/hooks";
import { useToast } from "@/components/Toast";
import { TokenDuo } from "@/components/TokenIcon";

// cWETH / cUSDC / csteakcUSDC token-pair chip colors + initials (csteakcUSDC -> "S", else the 2nd letter).

const StatLabel = ({ t }: { t: string }) => (
  <span style={css("font:650 10px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)")}>{t}</span>
);
function valStyle(revealed: boolean) {
  return css(
    `font:700 17px var(--mono);letter-spacing:${revealed ? "0" : ".06em"};color:${revealed ? "#1a1815" : "#c3bfb4"};animation:${revealed ? "blurin .5s ease" : "none"}`,
  );
}

function PositionCard({ market }: { market: MarketDef }) {
  const toast = useToast();
  const { collateral, scaledDebt, scaledSupply, lastError } = usePositionHandles(market.id);
  const ethUsd = useEthPrice();
  const { sharePrice6 } = useVaultStats();
  const { mutateAsync: grantPermit } = useGrantPermit();
  const { data: hasPermit } = useHasPermit({ contractAddresses: PERMIT_CONTRACTS });
  const [wantDecrypt, setWantDecrypt] = useState(false);

  const handlesReady = !!collateral && !!scaledDebt && !!scaledSupply && !!lastError;
  const inputs = useMemo(
    () =>
      handlesReady
        ? [
            { encryptedValue: collateral!, contractAddress: ADDR.pool as `0x${string}` },
            { encryptedValue: scaledDebt!, contractAddress: ADDR.pool as `0x${string}` },
            { encryptedValue: scaledSupply!, contractAddress: ADDR.pool as `0x${string}` },
            { encryptedValue: lastError!, contractAddress: ADDR.pool as `0x${string}` },
          ]
        : [],
    [handlesReady, collateral, scaledDebt, scaledSupply, lastError],
  );
  // REAL relayer/KMS decrypt — enabled only once the user clicks Decrypt (and a valid permit exists).
  const { data } = useDecryptValues(inputs, { enabled: wantDecrypt && handlesReady });

  const revealed =
    wantDecrypt && handlesReady && !!data && collateral! in data && scaledDebt! in data && scaledSupply! in data && lastError! in data;
  const decrypting = wantDecrypt && !revealed;
  const locked = !wantDecrypt;

  const collVal = revealed ? (data![collateral!] as bigint) : undefined;
  const debtVal = revealed ? (data![scaledDebt!] as bigint) : undefined;
  const supplyVal = revealed ? (data![scaledSupply!] as bigint) : undefined;
  const errVal = revealed ? (data![lastError!] as bigint) : undefined; // per-op error flag (0 = E_OK)

  // HF = (collateral USD × LLTV) / debt USD — oracle-priced via tokenUsdPerUnit (the SAME valuation the
  // Markets borrow-preview uses), so it is dimensionally correct across the cross-asset markets rather
  // than a naive same-unit ratio. Still computed locally from the values you just decrypted (on-chain
  // they stay encrypted); only the price dimension is now correct.
  const collUsd = collVal != null ? Number(collVal) * tokenUsdPerUnit(market.coll, ethUsd, sharePrice6) : null;
  const debtUsd = debtVal != null ? Number(debtVal) * tokenUsdPerUnit(market.borrow, ethUsd, sharePrice6) : null;
  const hfRatio =
    collUsd != null && debtUsd != null ? (debtUsd === 0 ? Infinity : (collUsd * (market.lltv / 100)) / debtUsd) : null;
  const hfShown = !revealed ? DOTS : hfRatio == null ? "—" : hfRatio === Infinity ? "∞" : hfRatio.toFixed(2);
  const hpct = hfRatio == null ? 0 : Math.max(0, Math.min(100, Math.round((Math.min(hfRatio, 2) / 2) * 100)));
  const hColor = hpct >= 66 ? "var(--green)" : hpct >= 42 ? "var(--amber)" : "var(--red)";

  const onDecrypt = async () => {
    if (!locked) return;
    // Grant the permit BEFORE enabling the decrypt query. Enabling first (setWantDecrypt then grant) let the
    // KMS decrypt fire before the permit existed on a first-ever decrypt; if that errored, `decrypting` stayed
    // true forever and the spinner hung. Balances.tsx already does grant-then-enable — match it.
    if (!hasPermit) {
      try {
        await grantPermit(PERMIT_CONTRACTS);
      } catch (e: any) {
        toast(e?.shortMessage || e?.message?.split("\n")[0] || "Signature rejected", "err");
        return;
      }
    }
    setWantDecrypt(true);
  };

  const suppliedShown = revealed ? fmtUnits6(supplyVal) : DOTS;
  const collShown = revealed ? fmtUnits6(collVal) : DOTS;
  const debtShown = revealed ? fmtUnits6(debtVal) : DOTS;

  return (
    <div style={css("background:var(--surface);border:1px solid var(--line);border-radius:22px;box-shadow:0 1px 2px rgba(20,18,12,.03);overflow:hidden")}>
      {/* header */}
      <div style={css("padding:20px 24px;display:flex;align-items:center;gap:13px;border-bottom:1px solid var(--line)")}>
        <TokenDuo coll={market.coll} borrow={market.borrow} size={32} />
        <div style={css("display:flex;flex-direction:column;gap:1px;min-width:0")}>
          <span style={css("font:750 17px var(--display);letter-spacing:-.01em")}>{market.coll} / {market.borrow}</span>
          <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>Market {market.id}</span>
        </div>
        <div style={css("margin-left:auto;display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:flex-end")}>
          {market.id === 2 && (
            <span style={css("padding:4px 10px;border-radius:999px;background:var(--panel);color:#f3f1ec;font:700 11px var(--mono)")}>leverage market</span>
          )}
          {revealed && (
            <span
              style={css(
                errVal === 0n
                  ? "padding:5px 11px;border-radius:999px;background:#e7f4ec;color:#166b45;font:700 11px var(--display);white-space:nowrap"
                  : "padding:5px 11px;border-radius:999px;background:#fbeede;color:#8a5a00;font:700 11px var(--display);white-space:nowrap",
              )}
            >
              {errVal === 0n ? "OK" : "CLAMPED"}
            </span>
          )}
        </div>
      </div>

      {/* stats */}
      <div style={css("padding:20px 24px 6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:20px")}>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          <StatLabel t="Supplied" />
          <span style={valStyle(revealed)}>{suppliedShown}</span>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          <StatLabel t="Collateral" />
          <span style={valStyle(revealed)}>{collShown}</span>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          <StatLabel t="Debt" />
          <span style={valStyle(revealed)}>{debtShown}</span>
        </div>
        <div style={css("display:flex;flex-direction:column;gap:7px")}>
          <StatLabel t="Health factor" />
          <span style={valStyle(revealed)}>{hfShown}</span>
        </div>
      </div>

      {/* revealed extras */}
      {revealed && (
        <div style={css("padding:14px 24px 4px")}>
          <div style={css("display:flex;justify-content:space-between;margin-bottom:7px")}>
            <StatLabel t="Health" />
            <span style={css(`font:700 12px var(--mono);color:${hColor}`)}>HF {hfShown}</span>
          </div>
          <div style={css("position:relative;height:8px;border-radius:999px;background:var(--line-2);overflow:hidden")}>
            <div style={css(`height:100%;border-radius:999px;background:${hColor};width:${hpct}%`)} />
          </div>
          <div style={css("display:flex;justify-content:space-between;margin-top:5px;font:600 10px var(--mono);color:var(--ink-3)")}>
            <span>Liquidation</span>
            <span>Safe</span>
          </div>
        </div>
      )}

      {/* footer — locked / decrypting / revealed */}
      <div style={css("padding:16px 24px;border-top:1px solid var(--line);margin-top:16px")}>
        {locked && (
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap")}>
            <div style={css("display:flex;flex-direction:column;gap:2px")}>
              <span style={css("font:600 13px var(--display);color:var(--ink)")}>Values are encrypted</span>
              <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>Sign to view — only you can decrypt · EIP-712 signature</span>
            </div>
            <button
              onClick={onDecrypt}
              disabled={!handlesReady}
              style={css(
                "display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#ffdf5c,#ffd208);color:#1a1a1a;border:1px solid rgba(0,0,0,.06);border-radius:12px;padding:11px 20px;font:700 13.5px var(--display);cursor:pointer;box-shadow:0 4px 13px rgba(255,210,8,.3);opacity:" +
                  (handlesReady ? "1" : ".6"),
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
                <path d="M8 10.5V6.5a4 4 0 0 1 8 0" />
              </svg>
              Decrypt
            </button>
          </div>
        )}
        {decrypting && (
          <div style={css("display:flex;align-items:center;gap:13px")}>
            <span style={css("width:22px;height:22px;flex:none;border:2.5px solid var(--line-2);border-top-color:var(--accent);border-radius:50%;display:inline-block;animation:spin .7s linear infinite")} />
            <div style={css("display:flex;flex-direction:column;gap:1px")}>
              <span style={css("font:600 13px var(--display);color:var(--ink)")}>KMS decrypting…</span>
              <span style={css("font:400 12px var(--display);color:var(--ink-3)")}>~3s · verifying your EIP-712 signature</span>
            </div>
          </div>
        )}
        {revealed && (
          <div style={css("display:flex;align-items:center;gap:9px")}>
            <span style={css("width:20px;height:20px;flex:none;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            <span style={css("font:600 12.5px var(--display);color:var(--ink-2)")}>Decrypted locally · visible only in this session</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Position() {
  const { isConnected } = useAccount();
  const [showVisibility, setShowVisibility] = useState(false);

  return (
    <div style={css("max-width:1080px;width:100%")}>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap")}>
        <div>
          <h1 style={css("margin:0;font:800 40px/1.02 var(--display);letter-spacing:-.03em;color:var(--ink)")}>My Position</h1>
          <p style={css("margin:9px 0 0;font:400 16px var(--display);color:var(--ink-2)")}>
            Your balances, health and result flags live encrypted on-chain. Decrypt locally — only you hold the key.
          </p>
        </div>
        <button
          onClick={() => setShowVisibility(true)}
          style={css("display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:999px;background:var(--surface);border:1px solid var(--line-2);font:600 12.5px var(--display);color:var(--ink-2);cursor:pointer")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
          What’s visible on-chain?
        </button>
      </div>
      <div style={css("height:1px;background:var(--line);margin:22px 0 26px")} />

      {isConnected ? (
        <div style={css("display:flex;flex-direction:column;gap:16px")}>
          {MARKETS.map((m) => (
            <PositionCard key={m.id} market={m} />
          ))}
        </div>
      ) : (
        <div
          style={css(
            "background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:70px 24px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center",
          )}
        >
          <span
            style={css(
              "width:52px;height:52px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink-2)",
            )}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </svg>
          </span>
          <span style={css("font:650 16px var(--display);color:var(--ink)")}>Connect your wallet to view your encrypted positions</span>
          <span style={css("font:400 13px/1.5 var(--display);color:var(--ink-3);max-width:38ch")}>
            Balances, health and result flags are end-to-end encrypted — only your signature can reveal them.
          </span>
        </div>
      )}

      {/* visibility modal */}
      {showVisibility && (
        <div
          onClick={() => setShowVisibility(false)}
          style={css("position:fixed;inset:0;z-index:70;background:rgba(20,18,12,.44);display:flex;align-items:center;justify-content:center;padding:24px;animation:toastin .2s ease")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={css("background:var(--surface);border-radius:22px;max-width:580px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden")}
          >
            <div style={css("padding:22px 26px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between")}>
              <h3 style={css("margin:0;font:750 18px var(--display);letter-spacing:-.01em")}>What’s visible on-chain?</h3>
              <button
                onClick={() => setShowVisibility(false)}
                style={css("width:31px;height:31px;border-radius:50%;border:1px solid var(--line);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-2)")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div style={css("padding:24px 26px;display:grid;grid-template-columns:1fr 1fr;gap:0")}>
              <div style={css("padding-right:22px;border-right:1px solid var(--line)")}>
                <div style={css("display:inline-flex;align-items:center;gap:8px;margin-bottom:15px")}>
                  <span style={css("width:24px;height:24px;border-radius:7px;background:var(--panel);color:#f3f1ec;display:flex;align-items:center;justify-content:center")}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
                      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                    </svg>
                  </span>
                  <span style={css("font:750 12px var(--display);letter-spacing:.05em;text-transform:uppercase;color:var(--ink)")}>Hidden</span>
                </div>
                <div style={css("display:flex;flex-direction:column;gap:12px")}>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Amounts</span>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Debt</span>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Leverage ratio</span>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Health factor</span>
                </div>
              </div>
              <div style={css("padding-left:22px")}>
                <div style={css("display:inline-flex;align-items:center;gap:8px;margin-bottom:15px")}>
                  <span style={css("width:24px;height:24px;border-radius:7px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2);display:flex;align-items:center;justify-content:center")}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  </span>
                  <span style={css("font:750 12px var(--display);letter-spacing:.05em;text-transform:uppercase;color:var(--ink)")}>Public</span>
                </div>
                <div style={css("display:flex;flex-direction:column;gap:12px")}>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Your address</span>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Transaction timing</span>
                  <span style={css("font:600 13.5px var(--display);color:var(--ink-2)")}>Revealed epoch aggregates</span>
                </div>
              </div>
            </div>
            <div style={css("padding:15px 26px;background:var(--surface-2);border-top:1px solid var(--line);font:400 12px/1.5 var(--display);color:var(--ink-3)")}>
              Aggregates are revealed once per epoch. Nothing links a revealed aggregate back to an individual position.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
