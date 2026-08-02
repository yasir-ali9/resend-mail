"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/reusables/button";
import { useTheme } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={cn("size-7 bg-bk-70 p-0 hover:bg-bk-60", className)}
    >
      <Moon
        aria-hidden="true"
        className="size-3.5 [[data-theme^=dark]_&]:hidden"
      />
      <Sun
        aria-hidden="true"
        className="hidden size-3.5 [[data-theme^=dark]_&]:block"
      />
    </Button>
  );
}

// Theme variant selector for settings
export function ThemeVariantSelect({ className }: { className?: string }) {
  const { variant, setVariant } = useTheme();

  return (
    <div className={cn("flex gap-1", className)}>
      <button
        type="button"
        onClick={() => setVariant("default")}
        className={cn(
          "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
          variant === "default"
            ? "bg-bk-60 text-fg-30"
            : "text-fg-60 hover:bg-bk-70 hover:text-fg-40"
        )}
        aria-pressed={variant === "default"}
      >
        <span
          className="size-3 rounded-sm border border-bd-40"
          style={{ background: "linear-gradient(135deg, #E5E5E5 50%, #A3A3A3 50%)" }}
        />
        Standard
      </button>
      <button
        type="button"
        onClick={() => setVariant("resend")}
        className={cn(
          "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
          variant === "resend"
            ? "bg-bk-60 text-fg-30"
            : "text-fg-60 hover:bg-bk-70 hover:text-fg-40"
        )}
        aria-pressed={variant === "resend"}
      >
        <span
          className="size-3 rounded-sm border border-bd-40"
          style={{ background: "linear-gradient(135deg, #E8E9F0 50%, #CBCEDA 50%)" }}
        />
        Resend
      </button>
    </div>
  );
}
