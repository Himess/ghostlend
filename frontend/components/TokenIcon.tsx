// Real token logos (inline SVG / embedded image, self-contained — no external assets) + a Zama-style
// "confidential" lock badge for the shielded c-tokens (cUSDC / cWETH / csteakcUSDC). Used everywhere.
import { STEAK_LOGO } from "@/lib/steakLogo";

type Base = "usdc" | "eth" | "steak" | "generic";

function baseFor(token: string): Base {
  const t = token.toLowerCase();
  if (t.includes("steak")) return "steak"; // csteakcUSDC — check before USDC (it contains "usdc")
  if (t.includes("usdc") || t.includes("usd")) return "usdc";
  if (t.includes("eth")) return "eth";
  return "generic";
}

// A shielded/confidential token is a lowercase-c prefix (cUSDC, cWETH) or the csteak share.
function isConfidential(token: string): boolean {
  if (token.startsWith("csteak")) return true;
  return token.length > 1 && token[0] === "c" && token[1] === token[1].toUpperCase() && token[1] !== token[1].toLowerCase();
}

function UsdcLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.5 18.6c0-2.35-1.42-3.16-4.25-3.5-2.02-.27-2.43-.8-2.43-1.74 0-.94.68-1.55 2.02-1.55 1.22 0 1.89.4 2.23 1.42.07.2.27.34.48.34h1.08c.27 0 .48-.2.48-.48v-.07c-.27-1.49-1.49-2.64-3.05-2.78V8.5c0-.27-.2-.48-.54-.54h-1.01c-.27 0-.48.2-.54.54v1.42c-2.02.27-3.31 1.62-3.31 3.3 0 2.23 1.35 3.1 4.18 3.44 1.89.34 2.5.74 2.5 1.82 0 1.08-.94 1.82-2.23 1.82-1.76 0-2.36-.74-2.57-1.76-.07-.27-.27-.4-.48-.4h-1.15c-.27 0-.48.2-.48.48v.07c.27 1.69 1.35 2.9 3.58 3.24v1.42c0 .27.2.48.54.54h1.01c.27 0 .48-.2.54-.54v-1.42c2.02-.34 3.38-1.76 3.38-3.58z"
        fill="#fff"
      />
      <path
        d="M12.6 25.5c-5.25-1.89-7.95-7.75-5.99-12.93 1.01-2.84 3.24-5 5.99-6.01.27-.14.4-.34.4-.68v-.94c0-.27-.13-.47-.4-.54-.07 0-.2 0-.27.07-6.4 2.02-9.9 8.83-7.88 15.23 1.21 3.78 4.11 6.68 7.88 7.89.27.14.54-.07.61-.34.07-.07.07-.13.07-.27v-.94c0-.2-.2-.4-.41-.54zm6.87-20.83c-.27-.14-.54.07-.61.34-.07.07-.07.13-.07.27v.94c0 .27.2.47.41.61 5.25 1.89 7.95 7.75 5.99 12.93-1.01 2.84-3.24 5-5.99 6.01-.27.14-.4.34-.4.68v.94c0 .27.13.47.4.54.07 0 .2 0 .27-.07 6.4-2.02 9.9-8.83 7.88-15.23-1.21-3.85-4.18-6.75-7.88-7.96z"
        fill="#fff"
      />
    </svg>
  );
}

function EthLogo({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <g fill="#fff">
        <path fillOpacity=".6" d="M16.5 4v8.87l7.49 3.35z" />
        <path d="M16.5 4L9 16.22l7.5-3.35z" />
        <path fillOpacity=".6" d="M16.5 21.97v6.03L24 17.62z" />
        <path d="M16.5 28v-6.03L9 17.62z" />
        <path fillOpacity=".2" d="M16.5 20.57l7.49-4.35-7.49-3.34z" />
        <path fillOpacity=".6" d="M9 16.22l7.5 4.35v-7.69z" />
      </g>
    </svg>
  );
}

function SteakLogo({ s }: { s: number }) {
  // Real Steakhouse mark (embedded). The source is a square, so crop to a circle to match the other logos.
  return <img src={STEAK_LOGO} width={s} height={s} alt="" style={{ borderRadius: "50%", objectFit: "cover", display: "block", flex: "none" }} />;
}

function GenericLogo({ s, token }: { s: number; token: string }) {
  const letter = token.replace(/^c/, "").charAt(0).toUpperCase() || "?";
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#8a867c" />
      <text x="16" y="21" fontSize="14" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="ui-monospace, monospace">
        {letter}
      </text>
    </svg>
  );
}

// Small confidential badge (bottom-right): a shield-lock, marking a shielded ERC-7984 token.
function ConfBadge({ s }: { s: number }) {
  const b = Math.max(9, Math.round(s * 0.44));
  return (
    <span
      style={{
        position: "absolute",
        right: -Math.round(b * 0.18),
        bottom: -Math.round(b * 0.18),
        width: b,
        height: b,
        borderRadius: "50%",
        background: "#1b1712",
        border: `${Math.max(1, Math.round(s / 16))}px solid var(--surface)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Confidential (ERC-7984) — amounts encrypted"
    >
      <svg width={Math.round(b * 0.58)} height={Math.round(b * 0.58)} viewBox="0 0 24 24" fill="none" stroke="#ffd208" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="9" rx="2.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}

export function TokenIcon({ token, size = 24 }: { token: string; size?: number }) {
  const base = baseFor(token);
  const conf = isConfidential(token);
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-flex", flex: "none", lineHeight: 0 }}>
      {base === "usdc" ? <UsdcLogo s={size} /> : base === "eth" ? <EthLogo s={size} /> : base === "steak" ? <SteakLogo s={size} /> : <GenericLogo s={size} token={token} />}
      {conf && <ConfBadge s={size} />}
    </span>
  );
}

// Overlapping pair (collateral over borrow) — drop-in for the old letter-circle TokenDuo.
export function TokenDuo({ coll, borrow, size = 34 }: { coll: string; borrow: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flex: "none" }}>
      <span style={{ position: "relative", zIndex: 2 }}>
        <TokenIcon token={coll} size={size} />
      </span>
      <span style={{ marginLeft: -Math.round(size * 0.32) }}>
        <TokenIcon token={borrow} size={size} />
      </span>
    </span>
  );
}
