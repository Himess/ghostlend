"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type Route = "dashboard" | "markets" | "position" | "leverage" | "vault" | "ghostgate" | "faucet" | "status";
export type MarketAction = "supply" | "withdraw" | "deposit" | "borrow" | "repay";

type NavState = {
  route: Route;
  marketId: number | null;
  action: MarketAction;
  go: (r: Route) => void;
  openMarket: (id: number, action?: MarketAction) => void;
  backToMarkets: () => void;
  setAction: (a: MarketAction) => void;
  wizardOpen: boolean;
  setWizardOpen: (v: boolean) => void;
};

const Ctx = createContext<NavState | null>(null);
export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNav outside provider");
  return c;
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>("dashboard");
  const [marketId, setMarketId] = useState<number | null>(null);
  const [action, setAction] = useState<MarketAction>("borrow");
  const [wizardOpen, setWizardOpen] = useState(false);
  const scroll = () => typeof window !== "undefined" && window.scrollTo(0, 0);
  const go = (r: Route) => { setRoute(r); setMarketId(null); setWizardOpen(false); scroll(); };
  const openMarket = (id: number, a: MarketAction = "borrow") => { setRoute("markets"); setMarketId(id); setAction(a); scroll(); };
  const backToMarkets = () => { setMarketId(null); scroll(); };
  return (
    <Ctx.Provider value={{ route, marketId, action, go, openMarket, backToMarkets, setAction, wizardOpen, setWizardOpen }}>
      {children}
    </Ctx.Provider>
  );
}
