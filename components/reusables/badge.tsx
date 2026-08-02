import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "blue" | "success";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-bd-50 bg-bk-50 text-fg-60",
  blue: "border-ac-01/20 bg-ac-01/10 text-ac-01",
  success: "border-success/20 bg-success/10 text-success",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
