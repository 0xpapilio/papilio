"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import DotArt from "@/components/DotArt";

// Butterfly toasts: every success, error and notice in the app goes through `useToast()`.
// Success butterflies flap and fly off when the toast leaves; error butterflies droop and go grey.

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; title: string; text?: string; leaving?: boolean };
type Push = (kind: Kind, title: string, text?: string) => void;

const Ctx = createContext<Push>(() => {});
export const useToast = () => useContext(Ctx);

const LIFETIME: Record<Kind, number> = { success: 5000, info: 5000, error: 8000 };
const EXIT_MS = 600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback<Push>(
    (kind, title, text) => {
      const id = ++next.current;
      // Keep at most 4 on screen; the oldest flies off first.
      setToasts((all) => [...all.slice(-3), { id, kind, title, text }]);
      setTimeout(() => dismiss(id), LIFETIME[kind]);
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={push}>
      {children}
      <ol aria-label="Notifications" className="toasts">
        {toasts.map((t) => (
          <li
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`toast toast-${t.kind} ${t.leaving ? "toast-leaving" : ""}`}
          >
            <span className="toast-fly" aria-hidden>
              <DotArt art="fly" n={40} flap={t.kind !== "error"} speed={t.kind === "error" ? 1 : 3} className="w-9" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.text && <p className="mt-0.5 text-xs leading-relaxed break-words text-dim">{t.text}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="toast-x" aria-label="Dismiss notification">
              ✕
            </button>
          </li>
        ))}
      </ol>
    </Ctx.Provider>
  );
}
