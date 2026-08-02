"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Theme mode: light or dark
type ThemeMode = "light" | "dark" | "system";

// Theme variant: neutral (default) or resend (blue-tinted, inspired by Resend design)
type ThemeVariant = "default" | "resend";

// Combined theme stored in localStorage (e.g., "dark-resend", "light", "system-resend")
type StoredTheme = `${ThemeMode}${"" | "-resend"}`;

// The actual applied theme on data-theme attribute
type AppliedTheme = "light" | "dark" | "light-resend" | "dark-resend";

interface ThemeContextType {
  mode: ThemeMode;
  variant: ThemeVariant;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  /** @deprecated Use mode and variant instead */
  theme: ThemeMode;
  /** @deprecated Use toggleMode instead */
  toggleTheme: () => void;
  /** @deprecated Use setMode instead */
  setTheme: (theme: ThemeMode) => void;
}

// Create the theme context with default values
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Parse stored theme into mode and variant
function parseStoredTheme(stored: string): { mode: ThemeMode; variant: ThemeVariant } {
  if (stored.endsWith("-resend")) {
    const modePart = stored.replace("-resend", "") as ThemeMode;
    return { mode: modePart || "light", variant: "resend" };
  }
  // Legacy: handle old variant formats
  if (stored.endsWith("-high-contrast")) {
    const modePart = stored.replace("-high-contrast", "") as ThemeMode;
    return { mode: modePart || "light", variant: "resend" };
  }
  if (stored.endsWith("-neutral")) {
    const modePart = stored.replace("-neutral", "") as ThemeMode;
    return { mode: modePart || "light", variant: "default" };
  }
  return { mode: stored as ThemeMode, variant: "default" };
}

// Combine mode and variant into stored theme
function toStoredTheme(mode: ThemeMode, variant: ThemeVariant): StoredTheme {
  if (variant === "resend") {
    return `${mode}-resend` as StoredTheme;
  }
  return mode as StoredTheme;
}

// Combine mode and variant into applied theme
function toAppliedTheme(mode: ThemeMode, variant: ThemeVariant, systemPrefersDark: boolean): AppliedTheme {
  const effectiveMode = mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;
  if (variant === "resend") {
    return `${effectiveMode}-resend` as AppliedTheme;
  }
  return effectiveMode;
}

// Theme provider component that manages theme state and persistence
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [variant, setVariantState] = useState<ThemeVariant>("default");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage first
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme) {
          const { mode: savedMode, variant: savedVariant } = parseStoredTheme(savedTheme);
          if (["light", "dark", "system"].includes(savedMode)) {
            setModeState(savedMode);
            setVariantState(savedVariant);
          }
        } else {
          // Fall back to system preference
          const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          const systemMode: ThemeMode = systemPrefersDark ? "dark" : "light";
          setModeState(systemMode);
          localStorage.setItem("theme", systemMode);
        }
      } catch (error) {
        console.warn(
          "Failed to access localStorage for theme preference:",
          error
        );
        setModeState("light");
      }

      setMounted(true);
    };

    initializeTheme();
  }, []);

  // Apply theme to document root when mode or variant changes
  useEffect(() => {
    if (mounted) {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const appliedTheme = toAppliedTheme(mode, variant, systemPrefersDark);
      document.documentElement.setAttribute("data-theme", appliedTheme);
    }
  }, [mode, variant, mounted]);

  // Set mode with persistence
  const setMode = (newMode: ThemeMode) => {
    // Kill all CSS transitions for one frame so every element flips atomically
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    setModeState(newMode);
    requestAnimationFrame(() => document.head.removeChild(style));

    try {
      localStorage.setItem("theme", toStoredTheme(newMode, variant));
    } catch (error) {
      console.warn("Failed to save theme preference to localStorage:", error);
    }
  };

  // Set variant with persistence
  const setVariant = (newVariant: ThemeVariant) => {
    // Kill all CSS transitions for one frame
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    setVariantState(newVariant);
    requestAnimationFrame(() => document.head.removeChild(style));

    try {
      localStorage.setItem("theme", toStoredTheme(mode, newVariant));
    } catch (error) {
      console.warn("Failed to save theme preference to localStorage:", error);
    }
  };

  // Toggle between light and dark modes
  const toggleMode = () => {
    const newMode: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(newMode);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        variant,
        toggleMode,
        setMode,
        setVariant,
        // Legacy aliases for backward compatibility
        theme: mode,
        toggleTheme: toggleMode,
        setTheme: setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme context with error handling
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
