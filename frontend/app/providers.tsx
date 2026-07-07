"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { WagmiProvider, usePublicClient, useWalletClient, useAccount } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { createConfig as createZamaConfig } from "@zama-fhe/sdk/viem"; // viem adapter (react-sdk's wagmi adapter needs wagmi v3's useConnection — bypassed)
import { sepolia as zamaSepolia } from "@zama-fhe/sdk/chains"; // aliased — NOT wagmi/viem's sepolia (collision trap)
import { web } from "@zama-fhe/sdk/web";
import { createWalletClient, custom, http, type WalletClient } from "viem";
import { sepolia as viemSepolia } from "viem/chains";
import { wagmiConfig } from "@/lib/wagmi";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

// Builds the ZamaSDK config from wagmi's viem clients, rebuilding when the wallet connects. Before connect,
// a read-only placeholder walletClient (no account) lets the SDK construct so read hooks work; signer ops
// (encrypt/decrypt/write) become available once a signing walletClient arrives.
//
// The Zama SDK reads the signer's *account* straight off the walletClient (it never calls
// eth_requestAccounts) — so if it is handed a client with no account it throws
// WalletNotConnectedError ("Cannot approveUnderlying without a connected wallet account"). wagmi's
// useWalletClient() can persistently return undefined even while useAccount() reports connected —
// classic with several injected wallets fighting over window.ethereum. So we don't depend on that hook
// alone: whenever we have a connected address we build the signer straight from the CONNECTOR's own
// EIP-1193 provider and force `account: address`, which is exactly the provider wagmi used to connect.
function ZamaBridge({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false); // build the SDK config on the CLIENT only (worker/WASM)
  useEffect(() => setMounted(true), []);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address, isConnected, connector } = useAccount();

  // Connector-derived signing client — the reliable fallback when useWalletClient() lags/returns undefined.
  const [connectorWC, setConnectorWC] = useState<WalletClient | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isConnected || !address || !connector) { setConnectorWC(null); return; }
      try {
        const provider = (await connector.getProvider()) as any;
        if (cancelled || !provider) return;
        setConnectorWC(createWalletClient({ account: address, chain: viemSepolia, transport: custom(provider) }));
      } catch (e) {
        console.error("[zama connector walletClient failed]", e);
        if (!cancelled) setConnectorWC(null);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address, connector]);

  const config = useMemo(() => {
    if (!mounted || !publicClient) return null;
    try {
      // Prefer a client that actually carries an account. wagmi's client wins when present; otherwise the
      // connector-derived one; only when fully disconnected do we fall back to the account-less http reader.
      const signer = (walletClient?.account ? walletClient : null) ?? connectorWC;
      const wc = signer ?? createWalletClient({ chain: viemSepolia, transport: http(RPC) });
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
  }, [mounted, publicClient, walletClient, connectorWC]);

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
