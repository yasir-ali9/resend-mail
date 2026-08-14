"use client";

import type { PointerEventHandler } from "react";

import { cn } from "@/lib/utils";

export function PreviewResizeHandle({
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resizing,
  width,
}: {
  onPointerCancel: PointerEventHandler<HTMLButtonElement>;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerUp: PointerEventHandler<HTMLButtonElement>;
  resizing: boolean;
  width: number;
}) {
  return (
    <div className="pointer-events-none sticky top-1/2 z-20 h-0 w-full">
      <button
        type="button"
        aria-label="Resize email preview"
        title={`${width}px wide`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="group/resize pointer-events-auto absolute top-0 -right-5 hidden h-20 w-6 -translate-y-1/2 cursor-ew-resize touch-none place-items-center md:grid"
      >
        <span
          className={cn(
            "h-12 w-0.5 rounded-full bg-fg-70/80 transition-[height,background-color] group-hover/resize:h-14 group-hover/resize:bg-fg-50",
            resizing && "h-14 bg-fg-40",
          )}
        />
      </button>
    </div>
  );
}
