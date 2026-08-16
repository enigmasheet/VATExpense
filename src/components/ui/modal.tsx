"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
 * moves focus to the first focusable element when opened.
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

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href]",
    );
    firstFocusable?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const isRight = position === "right";

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/40 ${isRight ? "justify-end" : "items-center justify-center p-4"}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`flex flex-col bg-surface shadow-xl ${isRight ? `h-full w-full ${width} border-l border-border` : `max-h-[85vh] w-full ${width} rounded-lg border border-border`}`}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-foreground"
            aria-label={closeLabel}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}