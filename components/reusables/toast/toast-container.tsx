"use client";

import React from "react";
import { useToastContext } from "./toast-provider";
import { ToastItem } from "./toast-item";
import { ToastContainerProps, ToastPosition } from "./types";

// Container component that renders all active toasts with proper positioning
export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = "top-right",
}) => {
  const { toasts, removeToast, pauseToast, resumeToast } = useToastContext();

  // Filter toasts for this specific position
  const positionToasts = toasts.filter((toast) => toast.position === position);

  // Don't render container if no toasts for this position
  if (positionToasts.length === 0) {
    return null;
  }

  // Get positioning classes based on position prop — used on sm+ only
  const getPositionClasses = (pos: ToastPosition): string => {
    switch (pos) {
      case "top-left":
        return "sm:top-4 sm:left-4";
      case "top-center":
        return "sm:top-4 sm:left-1/2 sm:-translate-x-1/2";
      case "top-right":
        return "sm:top-4 sm:right-4";
      case "bottom-left":
        return "sm:bottom-4 sm:left-4";
      case "bottom-center":
        return "sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2";
      case "bottom-right":
        return "sm:bottom-4 sm:right-4";
      default:
        return "sm:bottom-4 sm:right-4";
    }
  };

  // Get reset classes for mobile overrides — only reset what's needed
  const getResetClasses = (pos: ToastPosition): string => {
    if (pos.includes("center")) {
      return "sm:right-auto"; // center uses left-1/2, so only reset right
    }
    if (pos.includes("right")) {
      return "sm:left-auto"; // right-aligned, reset left
    }
    return "sm:right-auto"; // left-aligned, reset right
  };

  // Mobile vertical position
  const getMobileVertical = (pos: ToastPosition): string => {
    return pos.startsWith("bottom") ? "bottom-4" : "top-4";
  };

  // Get flex direction for stacking (newer toasts at top)
  const getStackDirection = (pos: ToastPosition): string => {
    return pos.startsWith("bottom") ? "flex-col-reverse" : "flex-col";
  };

  return (
    <div
      className={`
        fixed
        z-[1000]
        pointer-events-none
        left-3 right-3
        ${getResetClasses(position)}
        ${getMobileVertical(position)}
        ${getPositionClasses(position)}
      `}
    >
      <div
        className={`
          flex
          ${getStackDirection(position)}
          gap-2
          transition-all
          duration-150
          ease-in-out
        `}
      >
        {positionToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-150 ease-in-out"
          >
            <ToastItem
              toast={toast}
              onDismiss={removeToast}
              onPause={pauseToast}
              onResume={resumeToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
