// Configuration constants for the toast notification system
import { ToastType, ToastPosition } from "./types";

export const TOAST_CONFIG = {
  // Maximum number of toasts that can be displayed simultaneously
  maxToasts: 5,

  // Default duration for auto-dismiss in milliseconds (4 seconds)
  defaultDuration: 4000,

  // Default position for new toasts
  defaultPosition: "top-center" as ToastPosition,

  // Default toast type when none is specified
  defaultType: "default" as ToastType,

  // Animation durations in milliseconds
  animations: {
    enter: 200,
    exit: 300,
    reposition: 150,
  },

  // Z-index for toast containers
  zIndex: 1000,
} as const;
