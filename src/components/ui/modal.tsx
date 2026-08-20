"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const CLOSE_MS = 200;

// Module-level counter so nested/stacked modals get sensible increasing
// z-indexes and so the body scroll lock is reference-counted instead of
// blindly overwritten by whichever modal closes last.
let openModalCount = 0;

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
  /** Ref to focus instead of the first input/button when the modal opens */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Set false to disable closing on backdrop click (e.g. destructive confirm flows) */
  closeOnOverlayClick?: boolean;
  /** Set false to disable Escape-to-close */
  closeOnEscape?: boolean;
}

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
  initialFocusRef,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const mouseDownOnOverlayRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client mount signal, not a cascading render
    setMounted(true);
  }, []);

  // Stable id per instance instead of a hardcoded "modal-title", which broke
  // aria-labelledby whenever two Modals existed in the DOM at once.
  const titleId = useId();
  const descId = useId();

  // Keep onClose in a ref so the keydown effect below doesn't need it as a
  // dependency. Previously the effect re-ran (and its cleanup fired) any
  // time the parent passed a new onClose function reference, which stole
  // focus back to the trigger element even while the modal was still open.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cancel close animation when reopening
      setClosing(false);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setClosing(true);
    setVisible(false);
    const timer = setTimeout(() => setClosing(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Focus management: move focus in on open, trap Tab while open, restore
  // focus to the trigger only when the modal actually closes/unmounts.
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement;
    const panel = panelRef.current;

    const target =
      initialFocusRef?.current ??
      panel?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ) ??
      panel?.querySelector<HTMLElement>("button:not([disabled]), [href]");
    target?.focus();

    function getFocusables() {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
        ),
      );
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEscape) {
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const focusables = getFocusables();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      triggerRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeOnEscape]);

  // Reference-counted scroll lock: safe when two modals happen to be open
  // at once (e.g. a confirm dialog stacked on top of a slide-over).
  useEffect(() => {
    if (!open) return;
    openModalCount += 1;
    if (openModalCount === 1) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [open]);

  if (!open && !closing) return null;
  if (!mounted) return null;

  const isRight = position === "right";
  const shown = open && visible;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
        shown ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${isRight ? "justify-end" : "items-end justify-center p-0 sm:items-center sm:p-4"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onMouseDown={(e) => {
        // Only arm the close if the press itself started on the backdrop.
        // Fixes accidental closes when a user selects text inside the
        // panel and releases the mouse outside it (drag-select).
        mouseDownOnOverlayRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (
          closeOnOverlayClick &&
          e.target === e.currentTarget &&
          mouseDownOnOverlayRef.current
        ) {
          onClose();
        }
        mouseDownOnOverlayRef.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="document"
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
            <h2 id={titleId} className="font-display text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
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
    </div>,
    document.body,
  );
}