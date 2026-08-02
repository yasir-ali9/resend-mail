"use client";

import {
  Activity,
  forwardRef,
  type ReactNode,
} from "react";

import { Tooltip } from "./tooltip";

export interface TabItem {
  id: string;
  label: ReactNode;
  value: string;
  tooltip?: string;
  content?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  showContent?: boolean;
  fullWidth?: boolean;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      activeTab,
      onTabChange,
      className = "",
      showContent = false,
      fullWidth = false,
    },
    ref,
  ) => (
    <>
      <div
        ref={ref}
        role="tablist"
        className={`flex overflow-hidden rounded border border-bd-50 ${
          fullWidth ? "w-full" : "w-fit"
        } ${className}`}
      >
        {items.map((item) => {
          const selected = activeTab === item.value;

          return (
            <Tooltip
              key={item.id}
              content={item.tooltip ?? ""}
              position="bottom"
              disabled={!item.tooltip}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(item.value)}
                className={`cursor-pointer text-center transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 ${
                  fullWidth
                    ? "grow px-1 py-1 text-[10px]"
                    : "px-3 py-[5px] text-[11px]"
                } ${
                  selected
                    ? "bg-bk-30 text-fg-50"
                    : "bg-bk-40 text-fg-60"
                }`}
              >
                {item.label}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {showContent && (
        <div>
          {items.map((item) => (
            <Activity
              key={item.id}
              mode={activeTab === item.value ? "visible" : "hidden"}
            >
              {item.content}
            </Activity>
          ))}
        </div>
      )}
    </>
  ),
);

Tabs.displayName = "Tabs";
