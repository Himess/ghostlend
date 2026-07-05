import type { CSSProperties } from "react";

// Parse a raw CSS declaration string ("display:flex;gap:14px") into a React style object. This lets the
// screens carry the design shell's EXACT inline-style strings verbatim (visual source of truth), converting
// only property names to camelCase. Custom properties (--x) and already-camel keys pass through untouched.
const cache = new Map<string, CSSProperties>();

export function css(decl: string): CSSProperties {
  const hit = cache.get(decl);
  if (hit) return hit;
  const out: Record<string, string> = {};
  for (const part of decl.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const rawKey = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!rawKey || !val) continue;
    const key = rawKey.startsWith("--")
      ? rawKey
      : rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  }
  const frozen = out as CSSProperties;
  cache.set(decl, frozen);
  return frozen;
}

// Merge helper for a base style string + dynamic overrides.
export function cssm(decl: string, extra?: CSSProperties): CSSProperties {
  return extra ? { ...css(decl), ...extra } : css(decl);
}
