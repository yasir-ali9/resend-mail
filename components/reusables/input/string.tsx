"use client";

import React, { useState, useEffect, useRef } from "react";

interface StringInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  type?: "text" | "email" | "url" | "password" | "date";
}

/**
 * String Input Component
 * Simple text input with blur-based onChange (like DescriptiveInput and PropertyInput)
 * Only calls onChange when user finishes editing (blur or Enter key)
 */
export const StringInput: React.FC<StringInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  className = "",
  type = "text",
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingChangeRef = useRef<string | null>(null);

  // Update internal value when prop changes (but not when focused)
  useEffect(() => {
    if (!isFocused) {
      // Kept from the sample component: sync the local draft after external changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(value);
      pendingChangeRef.current = null;
    }
  }, [value, isFocused]);

  // Flush pending changes before component unmounts or value prop changes
  useEffect(() => {
    return () => {
      // Cleanup: flush any pending changes
      if (
        pendingChangeRef.current !== null &&
        pendingChangeRef.current !== value
      ) {
        onChange(pendingChangeRef.current);
      }
    };
  }, [value, onChange]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Auto-select all text on focus (like PropertyInput)
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Respect maxLength if provided
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    setInputValue(newValue);
    // Track pending change
    pendingChangeRef.current = newValue;
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Only call onChange if value actually changed
    if (inputValue !== value) {
      onChange(inputValue);
      pendingChangeRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Enter to trigger blur (save)
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }

    // Allow Escape to cancel and revert
    if (e.key === "Escape") {
      e.preventDefault();
      setInputValue(value);
      pendingChangeRef.current = null;
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2 py-1.5 text-[11px] bg-bk-80 text-fg-50 rounded border border-bd-40 focus:outline-none focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02 placeholder:text-fg-70 disabled:opacity-50 disabled:cursor-not-allowed selection:bg-ac-02 selection:text-white h-[26px]"
      />
    </div>
  );
};
