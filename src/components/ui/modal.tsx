"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CLOSE_MS = 200;

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  position?: "center" | "right";
  width?: string;
  closeLabel?: string;
}

/**
 * Renders a modal dialog on a backdrop. Supports two positions: a centered
 * dialog and a right-side slide-over panel. Provides Escape-to-close and
 * moves focus to the first focusable element when opened. Panels animate in
 * and out; the panel stays mounted briefly while closing so the exit
 * transition can play.
 *
 * @param open - Whether the modal is visible
 * @param title - The modal heading
 * @param description - Optional supporting text under the heading
 * @param onClose - Called when the backdrop, close button, or Escape is used
 * @param children - The modal body content
 * @param footer - Optional actions rendered in a footer bar
 * @param position - Whether to center the panel or slide it in from the right
 * @param width - Width utility class for the panel (e.g. "max-w-md")
 * @param closeLabel - Accessible label for the close button
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  position = "center",
  width = "max-w-md",
  closeLabel = "Close",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Store the previous `open` value in state and adjust during render
  // (React-recommended pattern) so opening re-mounts the panel and resets
  // the visible flag to replay the entrance animation.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setVisible(false);
    }
  }

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]",
    );
    firstFocusable?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const isRight = position === "right";
  const shown = open && visible;

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
        shown ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${isRight ? "justify-end" : "items-end justify-center p-0 sm:items-center sm:p-4"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`flex flex-col bg-surface shadow-xl transition-all duration-200 motion-reduce:transition-none ${
          isRight
            ? `h-full w-full ${width} border-l border-border/60 ${shown ? "translate-x-0" : "translate-x-full"}`
            : `w-full ${width} max-h-[92vh] rounded-t-2xl border border-border/60 sm:max-h-[85vh] sm:rounded-lg overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-[sheet-in_220ms_ease-out] sm:animate-[fade-in_200ms_ease-out] ${
                shown ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
              }`
        }`}
      >
        <div className="flex items-start justify-between border-b border-border/60 px-5 py-5">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}