"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-1.5 font-normal transition-all focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-ac-01 text-white hover:[background:color-mix(in_srgb,theme(colors.ac.01)_90%,black)]",
      secondary:
        "border border-bd-30 bg-bk-80 text-fg-60 hover:bg-bk-70 hover:text-fg-40",
      ghost: "bg-bk-40 text-fg-60 hover:text-fg-50 hover:bg-bk-30",
      outline: "border border-bd-50 text-fg-30 hover:bg-bk-40 hover:text-fg-50",
      danger: "bg-[#c70036] text-white hover:bg-[#a50036]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-md",
      md: "px-4 py-2 text-sm rounded-md",
      lg: "px-6 py-3 text-base rounded-lg",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
