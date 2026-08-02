"use client";

import { useCallback, useRef } from "react";
import { useToastContext } from "./toast-provider";
import { ToastType, ToastPosition, UseToastReturn } from "./types";
import { TOAST_CONFIG } from "./config";

// Custom hook that provides the simplified programmatic API for showing and managing toasts
export const useToast = (): UseToastReturn => {
  const { addToast, removeToast, clearToasts } = useToastContext();

  // Rate limiting to prevent toast spam
  const lastToastTime = useRef<number>(0);
  const RATE_LIMIT_MS = 100; // Minimum time between toasts

  // Show a new toast notification with simplified API
  const toast = useCallback(
    (
      message: string,
      type: ToastType = TOAST_CONFIG.defaultType,
      position: ToastPosition = TOAST_CONFIG.defaultPosition,
      duration: number = TOAST_CONFIG.defaultDuration
    ): string => {
      try {
        // Rate limiting check
        const now = Date.now();
        if (now - lastToastTime.current < RATE_LIMIT_MS) {
          console.warn("Toast rate limit exceeded");
          return "";
        }
        lastToastTime.current = now;

        // Input validation
        if (!message || typeof message !== "string") {
          console.warn("Toast message must be a non-empty string");
          return "";
        }

        // Sanitize message length
        const sanitizedMessage =
          message.length > 500 ? message.substring(0, 497) + "..." : message;

        return addToast(sanitizedMessage, { type, position, duration });
      } catch (error) {
        console.warn("Failed to show toast:", error);
        return "";
      }
    },
    [addToast]
  );

  // Manually dismiss a specific toast by ID
  const dismiss = useCallback(
    (id: string): void => {
      try {
        removeToast(id);
      } catch (error) {
        console.warn("Failed to dismiss toast:", error);
      }
    },
    [removeToast]
  );

  // Clear all active toasts
  const dismissAll = useCallback((): void => {
    try {
      clearToasts();
    } catch (error) {
      console.warn("Failed to dismiss all toasts:", error);
    }
  }, [clearToasts]);

  return {
    toast,
    dismiss,
    dismissAll,
  };
};
