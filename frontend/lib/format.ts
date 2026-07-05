// Formatting helpers shared across screens.

export const DOTS = "••••••";

// 6-dec confidential amounts (euint64 base units) → human string.
export function fmtUnits6(v: bigint | null | undefined, opts: { compact?: boolean } = {}): string {
  if (v == null) return "—";
  const whole = v / 1_000_000n;
  const frac = v % 1_000_000n;
  if (opts.compact) return compact(Number(v) / 1e6);
  const s = whole.toLocaleString("en-US");
  if (frac === 0n) return s;
  const f = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${s}.${f}`;
}

// compact 2.41M / 320 style used across the dashboard + markets.
export function compact(n: number): string {
  if (!isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2).replace(/\.?0+$/, "") + "K";
  return Math.round(n).toLocaleString("en-US");
}

export function shortAddr(a?: string): string {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

// mm:ss countdown from a seconds value.
export function mmss(sec: number): string {
  if (sec <= 0 || !isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function pct(n: number, digits = 1): string {
  if (!isFinite(n)) return "0%";
  return n.toFixed(digits) + "%";
}
