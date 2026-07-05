import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Injected (MetaMask) only — the design's single "CONNECT WALLET" button. Public Sepolia RPC.
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
  ssr: false, // fully client-rendered app (dynamic ssr:false); avoids wagmi's SSR cookie path breaking the build
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
