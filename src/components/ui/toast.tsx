"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, kind?: Toast["kind"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const TOAST_TIMEOUT: Record<Toast["kind"], number> = {
  success: 3000,
  info: 3000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    const t = timerRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timerRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const pause = useCallback((id: number) => {
    const t = timerRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timerRef.current.delete(id);
    }
  }, []);

  const resume = useCallback(
    (id: number, kind: Toast["kind"]) => {
      const timer = setTimeout(() => remove(id), TOAST_TIMEOUT[kind]);
      timerRef.current.set(id, timer);
    },
    [remove],
  );

  const toast = useCallback(
    (message: string, kind: Toast["kind"] = "success") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, kind }]);
      const timer = setTimeout(() => remove(id), TOAST_TIMEOUT[kind]);
      timerRef.current.set(id, timer);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${
              t.kind === "success"
                ? "border-success/30 bg-success/10 text-success"
                : t.kind === "error"
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : "border-border bg-surface text-foreground"
            }`}
            role="status"
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id, t.kind)}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              className="ml-2 shrink-0 text-current opacity-60 hover:opacity-100"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
