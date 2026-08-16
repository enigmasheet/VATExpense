"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

interface SlideOverProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/**
 * Renders a right-side slide-over panel built on the shared modal primitive.
 * Provides Escape-to-close and a focus trap for accessibility.
 *
 * @param open - Whether the panel is visible
 * @param title - The panel heading
 * @param description - Optional supporting text under the heading
 * @param onClose - Called when the backdrop, close button, or Escape is used
 * @param children - The panel body content
 * @param footer - Optional actions rendered in a footer bar
 * @param width - Width utility class for the panel (default "max-w-md")
 */
export function SlideOver({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-md",
}: SlideOverProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      position="right"
      width={width}
      closeLabel="Close panel"
      footer={footer}
    >
      {children}
    </Modal>
  );
}