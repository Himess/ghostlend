"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { WagmiProvider, usePublicClient, useWalletClient } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { createConfig as createZamaConfig } from "@zama-fhe/sdk/viem"; // viem adapter (react-sdk's wagmi adapter needs wagmi v3's useConnection — bypassed)
import { sepolia as zamaSepolia } from "@zama-fhe/sdk/chains"; // aliased — NOT wagmi/viem's sepolia (collision trap)
import { web } from "@zama-fhe/sdk/web";
import { createWalletClient, http } from "viem";
import { sepolia as viemSepolia } from "viem/chains";
import { wagmiConfig } from "@/lib/wagmi";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

// Builds the ZamaSDK config from wagmi's viem clients, rebuilding when the wallet connects. Before connect,
// a read-only placeholder walletClient (no account) lets the SDK construct so read hooks work; signer ops
// (encrypt/decrypt/write) become available once the real walletClient arrives.
function ZamaBridge({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false); // build the SDK config on the CLIENT only (worker/WASM)
  useEffect(() => setMounted(true), []);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const config = useMemo(() => {
    if (!mounted || !publicClient) return null;
    try {
      const wc = walletClient ?? createWalletClient({ chain: viemSepolia, transport: http(RPC) });
      return createZamaConfig({
        chains: [zamaSepolia],
        relayers: { [zamaSepolia.id]: web() },
        publicClient: publicClient as any,
        walletClient: wc as any,
      });
    } catch (e) {
      console.error("[zama config init failed]", e);
      return null;
    }
  }, [mounted, publicClient, walletClient]);

  if (!config) return <>{children}</>;
  return <ZamaProvider config={config}>{children}</ZamaProvider>;
}

// Provider order is load-bearing (README traps): WagmiProvider → QueryClientProvider (ABOVE ZamaProvider) →
// ZamaProvider. The Zama react-sdk hooks run on TanStack Query, so the QueryClient MUST wrap ZamaProvider.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Client-only provider tree. During static prerender (build) / SSR there is no wallet or FHE context, and
  // Next's built-in /404 and /_global-error pages are prerendered THROUGH this root layout — mounting the
  // wallet/FHE providers there trips a Next static-generation invariant. Gate the whole tree on mount: SSR
  // renders bare children, the client mounts the real providers. (The app page is dynamic ssr:false anyway.)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{children}</>;
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaBridge>{children}</ZamaBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
