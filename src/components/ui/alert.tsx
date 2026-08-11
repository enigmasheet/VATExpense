import type { ReactNode } from "react";

export type MessageKind = "success" | "warning" | "danger" | "info";

export interface Message {
  kind: MessageKind;
  text: string;
}

const toneClass: Record<MessageKind, string> = {
  danger: "border-danger/30 bg-danger-bg text-danger",
  warning: "border-warning/30 bg-warning-bg text-warning",
  success: "border-success/30 bg-success-bg text-success",
  info: "border-border bg-surface text-muted",
};

interface AlertProps {
  kind?: MessageKind;
  children: ReactNode;
  className?: string;
}

/**
 * Renders a single styled alert box with the given tone.
 *
 * @param kind - The severity/tone of the alert
 * @param children - Content displayed inside the alert
 * @param className - Additional CSS classes applied to the box
 */
export function Alert({ kind = "info", children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${toneClass[kind]} ${className}`}>
      {children}
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
}

/**
 * Displays a styled list of messages based on the first message's severity.
 *
 * @param messages - The messages to display.
 */
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) return null;
  const tone = messages[0].kind;
  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-4 text-sm ${toneClass[tone]}`}>
      {messages.map((m, i) => (
        <span key={i}>{m.text}</span>
      ))}
    </div>
  );
}
