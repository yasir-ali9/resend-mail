import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-8 w-full rounded-md border border-bd-40 bg-bk-80 px-2.5 text-[13px] text-fg-40 shadow-[0_1px_1px_rgb(0_0_0/0.02)] placeholder:text-fg-70 hover:border-bd-60 focus:border-ac-02 focus:ring-2 focus:ring-ac-02/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
