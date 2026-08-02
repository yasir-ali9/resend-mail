"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

let tooltipHot = false;
let hotResetTimer: ReturnType<typeof setTimeout> | null = null;
const subscribeToClient = () => () => {};

function markTooltipHot() {
  tooltipHot = true;
  if (hotResetTimer) clearTimeout(hotResetTimer);
}

function scheduleHotReset() {
  if (hotResetTimer) clearTimeout(hotResetTimer);
  hotResetTimer = setTimeout(() => {
    tooltipHot = false;
  }, 300);
}

export type TooltipPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: TooltipPosition;
  delay?: number;
  offset?: number;
  disabled?: boolean;
  className?: string;
}

const arrowHalf = 3;
const viewportPadding = 8;
const cornerPadding = 8;

const arrowBorders: Record<
  "top" | "bottom" | "left" | "right",
  CSSProperties
> = {
  top: {
    borderRight: "1px solid rgb(var(--bd-40))",
    borderBottom: "1px solid rgb(var(--bd-40))",
  },
  bottom: {
    borderTop: "1px solid rgb(var(--bd-40))",
    borderLeft: "1px solid rgb(var(--bd-40))",
  },
  left: {
    borderTop: "1px solid rgb(var(--bd-40))",
    borderRight: "1px solid rgb(var(--bd-40))",
  },
  right: {
    borderBottom: "1px solid rgb(var(--bd-40))",
    borderLeft: "1px solid rgb(var(--bd-40))",
  },
};

interface ComputedPosition {
  top: number;
  left: number;
  side: "top" | "bottom" | "left" | "right";
  arrowOffset: number;
}

export function Tooltip({
  children,
  content,
  position = "top",
  delay = 700,
  offset = 6,
  disabled = false,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [computed, setComputed] = useState<ComputedPosition | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const recompute = useCallback(() => {
    const anchor = containerRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    const rect = anchor.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let side = position.split("-")[0] as ComputedPosition["side"];

    if (
      side === "top" &&
      rect.top < tooltipHeight + offset + viewportPadding
    ) {
      side = "bottom";
    } else if (
      side === "bottom" &&
      rect.bottom + tooltipHeight + offset + viewportPadding >
        viewportHeight
    ) {
      side = "top";
    } else if (
      side === "left" &&
      rect.left < tooltipWidth + offset + viewportPadding
    ) {
      side = "right";
    } else if (
      side === "right" &&
      rect.right + tooltipWidth + offset + viewportPadding >
        viewportWidth
    ) {
      side = "left";
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let top = 0;
    let left = 0;
    let arrowOffset = 0;

    if (side === "top" || side === "bottom") {
      top =
        side === "top"
          ? rect.top - offset - tooltipHeight
          : rect.bottom + offset;
      left = Math.max(
        viewportPadding,
        Math.min(
          centerX - tooltipWidth / 2,
          viewportWidth - tooltipWidth - viewportPadding,
        ),
      );
      arrowOffset = Math.max(
        cornerPadding,
        Math.min(
          centerX - left - arrowHalf,
          tooltipWidth - cornerPadding - arrowHalf * 2,
        ),
      );
    } else {
      left =
        side === "left"
          ? rect.left - offset - tooltipWidth
          : rect.right + offset;
      top = Math.max(
        viewportPadding,
        Math.min(
          centerY - tooltipHeight / 2,
          viewportHeight - tooltipHeight - viewportPadding,
        ),
      );
      arrowOffset = Math.max(
        cornerPadding,
        Math.min(
          centerY - top - arrowHalf,
          tooltipHeight - cornerPadding - arrowHalf * 2,
        ),
      );
    }

    if (position === "top-left") {
      left = rect.right;
      top = rect.top - offset - tooltipHeight;
    } else if (position === "top-right") {
      left = rect.left - tooltipWidth;
      top = rect.top - offset - tooltipHeight;
    } else if (position === "bottom-left") {
      left = rect.right;
      top = rect.bottom + offset;
    } else if (position === "bottom-right") {
      left = rect.left - tooltipWidth;
      top = rect.bottom + offset;
    }

    setComputed({ top, left, side, arrowOffset });
  }, [offset, position]);

  useLayoutEffect(() => {
    if (!isVisible) return;

    recompute();
  }, [content, isVisible, recompute]);

  useEffect(() => {
    if (!isVisible) return;

    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [isVisible, recompute]);

  function handleShow() {
    if (disabled) return;

    setIsVisible(true);
    timeoutRef.current = setTimeout(
      () => {
        setShowTooltip(true);
        markTooltipHot();
      },
      tooltipHot ? Math.min(delay, 250) : delay,
    );
  }

  function handleHide() {
    setIsVisible(false);
    setShowTooltip(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    scheduleHotReset();
  }

  function arrowStyle(value: ComputedPosition): CSSProperties {
    return {
      position: "absolute",
      width: arrowHalf * 2,
      height: arrowHalf * 2,
      background: "rgb(var(--bk-50))",
      transform: "rotate(45deg)",
      ...(value.side === "top"
        ? { bottom: -(arrowHalf + 1), left: value.arrowOffset }
        : {}),
      ...(value.side === "bottom"
        ? { top: -(arrowHalf + 1), left: value.arrowOffset }
        : {}),
      ...(value.side === "left"
        ? { right: -(arrowHalf + 1), top: value.arrowOffset }
        : {}),
      ...(value.side === "right"
        ? { left: -(arrowHalf + 1), top: value.arrowOffset }
        : {}),
      ...arrowBorders[value.side],
    };
  }

  if (disabled || !content) return <>{children}</>;

  const isCorner = position.includes("-");
  const tooltipElement =
    isVisible && mounted ? (
      <div
        ref={tooltipRef}
        role="tooltip"
        className="pointer-events-none fixed z-[9999] overflow-visible whitespace-nowrap rounded-md border border-bd-40 bg-bk-50 px-2 py-1 text-[11px] font-normal text-fg-50 opacity-0 shadow-sm transition-opacity duration-200"
        style={{
          top: computed?.top ?? 0,
          left: computed?.left ?? 0,
          opacity: showTooltip && computed ? 1 : 0,
          visibility: computed ? "visible" : "hidden",
        }}
      >
        {content}
        {computed && !isCorner && (
          <span style={arrowStyle(computed)} />
        )}
      </div>
    ) : null;

  return (
    <>
      <span
        ref={containerRef}
        className={`relative inline-flex items-center ${className}`}
        onMouseEnter={handleShow}
        onMouseLeave={handleHide}
        onFocus={handleShow}
        onBlur={handleHide}
      >
        {children}
      </span>
      {mounted && createPortal(tooltipElement, document.body)}
    </>
  );
}
