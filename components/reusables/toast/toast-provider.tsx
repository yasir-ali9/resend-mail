"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Toast,
  ToastOptions,
  ToastContextState,
  ToastProviderProps,
  ToastType,
  ToastPosition,
} from "./types";
import { ToastContainer } from "./toast-container";
import { TOAST_CONFIG } from "./config";

// Create the toast context
const ToastContext = createContext<ToastContextState | undefined>(undefined);

// Custom hook to access toast context
export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    console.error("useToastContext must be used within a ToastProvider");
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};

// ToastProvider component that manages global toast state
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = TOAST_CONFIG.maxToasts,
  defaultDuration = TOAST_CONFIG.defaultDuration,
  defaultPosition = TOAST_CONFIG.defaultPosition,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pausedTimersRef = useRef<
    Map<string, { remainingTime: number; originalDuration: number }>
  >(new Map());

  // Generate unique ID for each toast
  const generateId = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  // Clear timer for a specific toast
  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    // Also clear any paused timer data
    pausedTimersRef.current.delete(id);
  }, []);

  // Remove toast from state
  const removeToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  // Set auto-dismiss timer for a toast
  const setAutoDismissTimer = useCallback(
    (id: string, duration: number) => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  // Pause toast timer
  const pauseToast = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) {
        // Find the toast to get its original duration
        const toast = toasts.find((t) => t.id === id);
        if (toast && toast.duration > 0) {
          // Calculate remaining time
          const elapsed = Date.now() - toast.createdAt;
          const remainingTime = Math.max(0, toast.duration - elapsed);

          // Store the remaining time
          pausedTimersRef.current.set(id, {
            remainingTime,
            originalDuration: toast.duration,
          });

          // Clear the current timer
          clearTimeout(timer);
          timersRef.current.delete(id);
        }
      }
    },
    [toasts]
  );

  // Resume toast timer
  const resumeToast = useCallback(
    (id: string) => {
      const pausedData = pausedTimersRef.current.get(id);
      if (pausedData && pausedData.remainingTime > 0) {
        // Set new timer with remaining time
        const timer = setTimeout(() => {
          removeToast(id);
        }, pausedData.remainingTime);

        timersRef.current.set(id, timer);
        pausedTimersRef.current.delete(id);

        // Update the toast's createdAt time to reflect the pause
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === id
              ? {
                  ...toast,
                  createdAt:
                    Date.now() -
                    (pausedData.originalDuration - pausedData.remainingTime),
                }
              : toast
          )
        );
      }
    },
    [removeToast]
  );

  // Add new toast to the state
  const addToast = useCallback(
    (message: string, options: ToastOptions = {}): string => {
      try {
        const id = generateId();
        const type: ToastType = options.type || TOAST_CONFIG.defaultType;
        const duration =
          options.duration !== undefined ? options.duration : defaultDuration;
        const position: ToastPosition = options.position || defaultPosition;

        // Validate message input
        if (typeof message !== "string") {
          console.warn(
            "Toast message must be a string, received:",
            typeof message
          );
          message = String(message || "Notification");
        }

        const newToast: Toast = {
          id,
          message: message || "Notification", // Fallback for empty messages
          type,
          duration,
          position,
          createdAt: Date.now(),
          isVisible: true,
        };

        setToasts((prev) => {
          // Remove oldest toast if we exceed maxToasts limit
          const updatedToasts = prev.length >= maxToasts ? prev.slice(1) : prev;
          return [newToast, ...updatedToasts]; // Add new toast at the beginning (top of stack)
        });

        // Set auto-dismiss timer
        setAutoDismissTimer(id, duration);

        return id;
      } catch (error) {
        console.error("Failed to add toast:", error);
        return "";
      }
    },
    [
      generateId,
      defaultDuration,
      defaultPosition,
      maxToasts,
      setAutoDismissTimer,
    ]
  );

  // Clear all toasts
  const clearToasts = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    // Clear all paused timer data
    pausedTimersRef.current.clear();

    // Clear all toasts
    setToasts([]);
  }, []);

  // Context value
  const contextValue: ToastContextState = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    pauseToast,
    resumeToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Render toast containers for all positions automatically */}
      <ToastContainer position="top-left" />
      <ToastContainer position="top-center" />
      <ToastContainer position="top-right" />
      <ToastContainer position="bottom-left" />
      <ToastContainer position="bottom-center" />
      <ToastContainer position="bottom-right" />
    </ToastContext.Provider>
  );
};
