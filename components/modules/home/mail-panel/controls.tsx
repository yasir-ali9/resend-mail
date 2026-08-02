"use client";

import { Settings } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip } from "@/components/reusables/tooltip";
import { useTheme } from "@/lib/theme/theme";

export function HeaderActions({
  className = "",
  onSettingsOpen,
}: {
  className?: string;
  onSettingsOpen: () => void;
}) {
  return (
    <div className={`items-center gap-1 ${className}`}>
      <SettingsButton className="" onClick={onSettingsOpen} />
      <HeaderThemeButton />
    </div>
  );
}

export function SettingsButton({
  className = "ml-auto",
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <Tooltip content="Settings" position="bottom" className={className}>
      <button
        type="button"
        onClick={onClick}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
        aria-label="Open settings"
      >
        <Settings
          aria-hidden="true"
          className="size-3.5"
          strokeWidth={1.8}
        />
      </button>
    </Tooltip>
  );
}

export function HeaderThemeButton() {
  const { toggleTheme } = useTheme();

  return (
    <Tooltip content="Toggle color theme" position="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
        aria-label="Toggle color theme"
      >
        <MoonIcon className="[[data-theme=dark]_&]:hidden" />
        <SunIcon className="hidden [[data-theme=dark]_&]:block" />
      </button>
    </Tooltip>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <circle
        cx="8"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.5 3.5l-1 1M4.5 11.5l-1 1M12.5 12.5l-1-1M4.5 4.5l-1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M14 8.5a6.5 6.5 0 11-7-6.46A5.5 5.5 0 0014 8.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BulkActionButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label} position="bottom" disabled={disabled}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={label}
      >
        {children}
      </button>
    </Tooltip>
  );
}
