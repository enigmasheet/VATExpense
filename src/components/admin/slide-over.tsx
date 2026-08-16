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
}

/**
 * Renders a right-side slide-over panel built on the shared modal primitive.
 * Provides Escape-to-close and a focus trap for accessibility.
 */
export function SlideOver({ open, title, description, onClose, children, footer }: SlideOverProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      position="right"
      width="max-w-md"
      closeLabel="Close panel"
      footer={footer}
    >
      {children}
    </Modal>
  );
}