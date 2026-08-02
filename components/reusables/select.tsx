"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";

import { useFluidHighlight } from "./hooks/use-fluid-highlight";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: ComponentType<{ size?: number; className?: string }>;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placement?: "top" | "bottom";
  triggerDisplay?: "icon" | "label";
  triggerIcon?: ComponentType<{ size?: number; className?: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  ariaLabel,
  placement = "bottom",
  triggerDisplay = "label",
  triggerIcon: TriggerFallbackIcon,
  placeholder = "Select...",
  className = "",
  disabled = false,
  loading = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    bottom?: number;
    left?: number;
    minWidth?: number;
    right?: number;
    top?: number;
    maxWidth?: number;
  }>({});
  const selectRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { showHighlight, hideHighlight, highlightStyle } =
    useFluidHighlight(isOpen);

  const calculateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const padding = 8;
    const estimatedDropdownWidth = Math.max(
      triggerRect.width,
      Math.max(0, ...options.map((option) => option.label.length)) * 8 + 32,
    );
    const spaceRight = viewportWidth - triggerRect.left - padding;
    const spaceLeft = triggerRect.right - padding;
    const style: {
      bottom?: number;
      left?: number;
      minWidth?: number;
      right?: number;
      top?: number;
      maxWidth?: number;
    } = {
      minWidth: triggerRect.width,
      ...(placement === "top"
        ? { bottom: window.innerHeight - triggerRect.top + 4 }
        : { top: triggerRect.bottom + 4 }),
    };

    if (estimatedDropdownWidth <= spaceRight) {
      style.left = triggerRect.left;
      style.maxWidth = spaceRight;
    } else if (estimatedDropdownWidth <= spaceLeft) {
      style.right = viewportWidth - triggerRect.right;
      style.maxWidth = spaceLeft;
    } else if (spaceRight >= spaceLeft) {
      style.left = triggerRect.left;
      style.maxWidth = spaceRight;
    } else {
      style.right = viewportWidth - triggerRect.right;
      style.maxWidth = spaceLeft;
    }

    setDropdownStyle(style);
  }, [options, placement]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    calculateDropdownPosition();

    const selectedIndex = options.findIndex((option) => option.value === value);

    if (selectedIndex !== -1) {
      requestAnimationFrame(() => {
        const element = optionRefs.current[selectedIndex];
        if (element) showHighlight(element);
      });
    }
  }, [
    calculateDropdownPosition,
    isOpen,
    options,
    showHighlight,
    value,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (!isOpen) return;

      const enabledOptions = options.filter((option) => !option.disabled);
      if (enabledOptions.length === 0) return;

      const currentIndex = enabledOptions.findIndex(
        (option) => option.value === hoveredValue,
      );

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const offset = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          (currentIndex + offset + enabledOptions.length) %
          enabledOptions.length;
        const nextOption = enabledOptions[nextIndex];
        setHoveredValue(nextOption.value);

        const element = optionRefs.current[options.indexOf(nextOption)];
        if (element) showHighlight(element);
      } else if (event.key === "Enter" && hoveredValue) {
        event.preventDefault();
        onChange(hoveredValue);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    hoveredValue,
    isOpen,
    onChange,
    options,
    showHighlight,
  ]);

  const selectedOption = options.find((option) => option.value === value);
  const TriggerIcon = selectedOption?.icon ?? TriggerFallbackIcon;
  const isDisabled = disabled || loading;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => {
          if (isDisabled) return;
          if (!isOpen) setHoveredValue(value);
          setIsOpen(!isOpen);
        }}
        disabled={isDisabled}
        className={`flex h-[26px] w-full items-center justify-between rounded border text-left text-[11px] transition-colors ${
          triggerDisplay === "icon" ? "gap-1 px-1" : "gap-2 px-2"
        } ${
          isDisabled
            ? "cursor-not-allowed border-bd-30 bg-bk-80 text-fg-60 opacity-60"
            : `border-bd-30 bg-bk-80 text-fg-50 hover:cursor-pointer hover:bg-bk-60 hover:border-bd-30 focus-visible:ring-2 focus-visible:ring-ac-02 ${
                isOpen ? "ring-2 ring-ac-02" : ""
              }`
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {TriggerIcon ? (
            <TriggerIcon size={14} className="shrink-0 text-fg-60" />
          ) : null}
          {triggerDisplay === "label" ? (
            <span className="truncate">
              {loading
                ? "Loading..."
                : selectedOption?.label || placeholder}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={11}
          className={`shrink-0 text-fg-60 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={selectRef}
              data-select-dropdown
              role="listbox"
              onMouseLeave={hideHighlight}
              className="fixed z-[100] flex max-h-48 w-max cursor-default flex-col overflow-y-auto rounded-lg border border-bd-30 bg-bk-70 px-1 py-1 shadow-lg"
              style={dropdownStyle}
            >
          <div
            className="pointer-events-none absolute rounded-md bg-bk-60"
            style={highlightStyle}
          />

          {options.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-fg-60">
              No options available
            </div>
          ) : (
            options.map((option, index) => {
              const Icon = option.icon;
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange(option.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  onMouseEnter={() => {
                    if (option.disabled) return;

                    setHoveredValue(option.value);
                    const element = optionRefs.current[index];
                    if (element) showHighlight(element);
                  }}
                  disabled={option.disabled}
                  className={`relative z-10 flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1 text-left text-[11px] tracking-tight focus-visible:ring-1 focus-visible:ring-ac-02 ${
                    option.disabled
                      ? "cursor-not-allowed text-fg-60"
                      : "cursor-default text-fg-50"
                  }`}
                >
                  <span className="flex h-3 w-3 shrink-0 items-center justify-center">
                    {isSelected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M10 3 4.5 8.5 2 6"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {Icon && (
                    <Icon size={14} className="shrink-0 text-fg-60" />
                  )}
                  <span>{option.label}</span>
                </button>
              );
            })
          )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
