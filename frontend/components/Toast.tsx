"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { css } from "@/lib/css";

type Toast = { kind: "ok" | "err"; msg: string } | null;
const ToastCtx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {toast && (
        <div style={css("position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:60;animation:toastin .3s ease")}>
          <div style={css(
            `display:flex;align-items:center;gap:11px;padding:13px 18px;border-radius:14px;background:${toast.kind === "ok" ? "var(--panel)" : "var(--red)"};color:#fff;box-shadow:0 12px 34px rgba(0,0,0,.24);max-width:min(90vw,520px)`,
          )}>
            <span style={css(`width:9px;height:9px;border-radius:50%;flex:none;background:${toast.kind === "ok" ? "var(--green)" : "#fff"}`)} />
            <span style={css("font:600 13px var(--display);line-height:1.4")}>{toast.msg}</span>
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}
