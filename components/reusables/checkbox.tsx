import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-3.5 cursor-pointer appearance-none rounded border border-bd-40 bg-bk-80 checked:border-ac-01 checked:bg-ac-01 checked:after:block checked:after:text-center checked:after:text-[10px] checked:after:leading-3 checked:after:text-white checked:after:content-['✓'] indeterminate:border-ac-01 indeterminate:bg-ac-01 indeterminate:after:block indeterminate:after:text-center indeterminate:after:text-[10px] indeterminate:after:leading-3 indeterminate:after:text-white indeterminate:after:content-['–'] focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);

Checkbox.displayName = "Checkbox";
