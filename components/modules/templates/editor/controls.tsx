import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ToolButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 shrink-0 place-items-center rounded-md text-fg-60 hover:bg-bk-70 hover:text-fg-30 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function SegmentButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md text-fg-60 hover:bg-bk-70",
        active && "bg-bk-70 text-fg-30",
      )}
    >
      {children}
    </button>
  );
}
