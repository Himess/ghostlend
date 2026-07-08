import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "GhostLend — confidential lending & leverage",
  description: "Confidential lending, vault-collateralized leverage, and GhostGate netting on Zama FHEVM (Sepolia).",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

// Fully client-rendered dApp (wallet + FHE SDK) — render on demand, don't statically prerender at build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
