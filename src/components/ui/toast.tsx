"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  TOAST_KIND_SUCCESS,
  TOAST_KIND_ERROR,
  TOAST_KIND_INFO,
  TOAST_SUCCESS_MS,
  TOAST_INFO_MS,
  TOAST_ERROR_MS,
} from "@/lib/status-constants";

interface Toast {
  id: number;
  message: string;
  kind: typeof TOAST_KIND_SUCCESS | typeof TOAST_KIND_ERROR | typeof TOAST_KIND_INFO;
}

interface ToastContextValue {
  toast: (message: string, kind?: Toast["kind"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const TOAST_TIMEOUT: Record<Toast["kind"], number> = {
  [TOAST_KIND_SUCCESS]: TOAST_SUCCESS_MS,
  [TOAST_KIND_INFO]: TOAST_INFO_MS,
  [TOAST_KIND_ERROR]: TOAST_ERROR_MS,
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
    (message: string, kind: Toast["kind"] = TOAST_KIND_SUCCESS) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, kind }]);
      const timer = setTimeout(() => remove(id), TOAST_TIMEOUT[kind]);
      timerRef.current.set(id, timer);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  const icon = (kind: Toast["kind"]) => {
    if (kind === TOAST_KIND_SUCCESS) {
      return (
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (kind === TOAST_KIND_ERROR) {
      return (
        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    }
    return (
      <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    );
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed left-4 right-4 top-[max(env(safe-area-inset-top),1rem)] z-50 flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-[toast-in_200ms_ease-out] items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.kind === TOAST_KIND_SUCCESS
                ? "border-success/30 bg-success/10 text-success"
                : t.kind === TOAST_KIND_ERROR
                  ? "border-danger/30 bg-danger/10 text-danger"
                  : "border-border/60 bg-surface text-foreground"
            }`}
            role={t.kind === TOAST_KIND_ERROR ? "alert" : "status"}
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id, t.kind)}
            onFocus={() => pause(t.id)}
            onBlur={() => resume(t.id, t.kind)}
          >
            {icon(t.kind)}
            <span className="flex-1 break-words">{t.message}</span>
            <button
              type="button"
              className="ml-2 shrink-0 rounded-lg p-1 text-current opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
