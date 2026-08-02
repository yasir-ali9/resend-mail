// Core types and interfaces for the toast notification system

export type ToastType = "default" | "success" | "error" | "info" | "warning";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

// Main toast interface representing a single toast notification
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  position: ToastPosition;
  createdAt: number;
  isVisible: boolean;
}

// Options for creating a new toast
export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
}

// Context state interface for managing all toasts
export interface ToastContextState {
  toasts: Toast[];
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

// Props for ToastProvider component
export interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number; // Default: 5
  defaultDuration?: number; // Default: 4000ms
  defaultPosition?: ToastPosition; // Default: 'top-right'
}

// Props for ToastContainer component
export interface ToastContainerProps {
  position?: ToastPosition;
}

// Props for individual ToastItem component
export interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

// Return type for useToast hook with simplified API
export interface UseToastReturn {
  toast: (
    message: string,
    type?: ToastType,
    position?: ToastPosition,
    duration?: number
  ) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
