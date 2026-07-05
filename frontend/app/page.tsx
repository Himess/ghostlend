"use client";
import dynamic from "next/dynamic";

// The whole shell is a browser-only dApp (wallet + FHE SDK worker). Render it client-only via ssr:false —
// avoids SSR of browser-only code and the App-Router mount race entirely.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
