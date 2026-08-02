"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  position?: "left" | "right" | "bottom";
  className?: string;
  requestedWidth?: number;
  onResize?: (size: number) => void;
}

export function ResizablePanel({
  children,
  defaultWidth = 280,
  minWidth = 200,
  maxWidth = 600,
  defaultHeight = 200,
  minHeight = 100,
  maxHeight = 600,
  position = "left",
  className = "",
  requestedWidth,
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isVertical = position === "bottom";

  useLayoutEffect(() => {
    if (requestedWidth !== undefined && !isVertical) {
      const animationFrame = requestAnimationFrame(() => {
        setWidth(requestedWidth);
      });

      return () => cancelAnimationFrame(animationFrame);
    }
  }, [requestedWidth, isVertical]);

  useEffect(() => {
    const checkAndAdjustWidth = () => {
      if (panelRef.current?.parentElement) {
        const parentWidth = panelRef.current.parentElement.clientWidth;
        const maxAllowedWidth = Math.min(maxWidth, parentWidth * 0.8);

        if (width > maxAllowedWidth) {
          setWidth(Math.max(minWidth, maxAllowedWidth));
        }
      }
    };

    checkAndAdjustWidth();
    window.addEventListener("resize", checkAndAdjustWidth);
    return () => window.removeEventListener("resize", checkAndAdjustWidth);
  }, [maxWidth, minWidth, width]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsResizing(true);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const parentRect =
        panelRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      if (isVertical) {
        const maxAllowedHeight = Math.min(
          maxHeight,
          parentRect.height * 0.6,
        );
        const nextHeight = Math.max(
          minHeight,
          Math.min(maxAllowedHeight, rect.bottom - event.clientY),
        );
        setHeight(nextHeight);
        onResize?.(nextHeight);
        return;
      }

      const proposedWidth =
        position === "left"
          ? event.clientX - rect.left
          : rect.right - event.clientX;
      const maxAllowedWidth = Math.min(
        maxWidth,
        parentRect.width * 0.8,
      );
      const nextWidth = Math.max(
        minWidth,
        Math.min(maxAllowedWidth, proposedWidth),
      );
      setWidth(nextWidth);
      onResize?.(nextWidth);
    },
    [
      isResizing,
      isVertical,
      maxHeight,
      maxWidth,
      minHeight,
      minWidth,
      onResize,
      position,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      const cursor = isVertical ? "ns-resize" : "ew-resize";
      document.body.style.cursor = cursor;
      document.documentElement.style.cursor = cursor;
      document.body.style.userSelect = "none";
      document.body.style.pointerEvents = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.documentElement.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };
  }, [
    handleMouseMove,
    handleMouseUp,
    isResizing,
    isVertical,
  ]);

  return (
    <div
      ref={panelRef}
      className={`relative shrink-0 overflow-hidden bg-bk-50 ${className}`}
      style={
        isVertical
          ? {
              height: `${height}px`,
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              transition: isResizing
                ? "none"
                : "height 0.1s ease-out",
            }
          : {
              width: `${width}px`,
              minWidth: `${minWidth}px`,
              maxWidth: `${maxWidth}px`,
              transition: isResizing
                ? "none"
                : "width 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
            }
      }
    >
      {children}
      <div
        role="separator"
        aria-orientation={isVertical ? "horizontal" : "vertical"}
        aria-label="Resize panel"
        className={
          isVertical
            ? "absolute inset-x-0 top-0 h-1 cursor-ns-resize"
            : `absolute inset-y-0 w-1 cursor-ew-resize ${
                position === "left" ? "right-0" : "left-0"
              }`
        }
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
