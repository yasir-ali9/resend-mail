"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { useFluidHighlight } from "@/components/reusables/hooks/use-fluid-highlight";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  shortcut?: string;
  selected?: boolean;
  submenu?: ContextMenuItem[];
  separator?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  level?: number;
  variant?: "default" | "elevated";
  parentButtonLeft?: number;
}

export function ContextMenu({
  items,
  isOpen,
  position,
  onClose,
  level = 0,
  variant = "default",
  parentButtonLeft,
}: ContextMenuProps) {
  const {
    container: containerBackground,
    hover: hoverBackground,
    border: borderClass,
  } = {
    default: {
      container: "bg-bk-80",
      hover: "bg-bk-60",
      border: "border-bd-50",
    },
    elevated: {
      container: "bg-bk-80",
      hover: "bg-bk-60",
      border: "border-bd-50/40",
    },
  }[variant];
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { showHighlight, hideHighlight, highlightStyle } =
    useFluidHighlight(isOpen);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState({
    x: 0,
    y: 0,
    buttonLeft: 0,
  });
  const [adjustedPosition, setAdjustedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hasIcons = items.some((item) => item.icon || item.selected);
  const submenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) {
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    let x = position.x;
    let y = position.y;

    if (x + rect.width > window.innerWidth - padding) {
      x =
        parentButtonLeft !== undefined
          ? parentButtonLeft - rect.width - 2
          : window.innerWidth - rect.width - padding;
    }
    if (x < padding) x = padding;

    if (y + rect.height > window.innerHeight - padding) {
      y = window.innerHeight - rect.height - padding;
    }
    if (y < padding) y = padding;

    setAdjustedPosition({ x, y });
  }, [
    isOpen,
    parentButtonLeft,
    position.x,
    position.y,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (event.button !== 0) return;

      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !submenuRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside, true);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function handleSubmenuHover(
    item: ContextMenuItem,
    event: ReactMouseEvent,
  ) {
    clearCloseTimeout();

    if (item.submenu && !item.disabled) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setSubmenuPosition({
        x: buttonRect.right + 8,
        y: buttonRect.top,
        buttonLeft: buttonRect.left,
      });
      setOpenSubmenu(item.id);
    } else {
      closeTimeoutRef.current = setTimeout(
        () => setOpenSubmenu(null),
        150,
      );
    }
  }

  function handleItemClick(
    item: ContextMenuItem,
    event: ReactMouseEvent,
  ) {
    if (item.disabled) return;

    if (item.submenu) {
      if (openSubmenu === item.id) {
        setOpenSubmenu(null);
      } else {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        setSubmenuPosition({
          x: buttonRect.right + 8,
          y: buttonRect.top,
          buttonLeft: buttonRect.left,
        });
        setOpenSubmenu(item.id);
      }
      return;
    }

    item.onClick?.();
    onClose();
  }

  function handleMouseLeave() {
    clearCloseTimeout();
    hideHighlight();
    closeTimeoutRef.current = setTimeout(
      () => setOpenSubmenu(null),
      300,
    );
  }

  useEffect(
    () => () => {
      clearCloseTimeout();
    },
    [],
  );

  if (!isOpen) return null;

  const displayPosition = adjustedPosition ?? position;

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label={level === 0 ? "Context menu" : "Submenu"}
        className={`fixed z-50 w-max min-w-[120px] rounded-lg border px-1 py-1 shadow-md ${containerBackground} ${borderClass}`}
        style={{
          left: displayPosition.x,
          top: displayPosition.y,
          visibility: adjustedPosition ? "visible" : "hidden",
        }}
        onMouseEnter={clearCloseTimeout}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`pointer-events-none absolute rounded-md ${hoverBackground}`}
          style={highlightStyle}
        />

        {items.map((item, index) => (
          <div key={item.id}>
            <button
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              aria-haspopup={item.submenu ? "menu" : undefined}
              aria-expanded={
                item.submenu ? openSubmenu === item.id : undefined
              }
              onClick={(event) => handleItemClick(item, event)}
              onMouseEnter={(event) => {
                if (!item.disabled) {
                  const element = itemRefs.current[index];
                  if (element) showHighlight(element);
                }
                handleSubmenuHover(item, event);
              }}
              disabled={item.disabled}
              className={`relative z-10 flex w-full cursor-pointer items-center justify-between whitespace-nowrap rounded-md px-2.5 py-1 text-left text-[11px] tracking-tight focus-visible:ring-1 focus-visible:ring-ac-02 ${
                item.disabled
                  ? "cursor-not-allowed text-fg-60"
                  : "text-fg-50"
              }`}
            >
              <span
                className="flex flex-1 items-center"
                style={{ gap: hasIcons ? "8px" : "0px" }}
              >
                {hasIcons && (
                  <span className="flex h-3 w-3 items-center justify-center">
                    {item.selected ? (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className="text-fg-30"
                        aria-hidden="true"
                      >
                        <path
                          fill="currentColor"
                          d="M9.854 3.146a.5.5 0 0 1 0 .708l-4.5 4.5a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L5 7.293l4.146-4.147a.5.5 0 0 1 .708 0"
                        />
                      </svg>
                    ) : item.icon ? (
                      <span className="h-3 w-3">{item.icon}</span>
                    ) : null}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </span>

              <span className="ml-4 flex items-center gap-2">
                {item.shortcut && (
                  <span className="text-[10px] text-fg-60">
                    {item.shortcut}
                  </span>
                )}
                {item.submenu && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 20 20"
                    className="text-fg-60"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M7.733 4.207a.75.75 0 0 1 1.06.026l5.001 5.25a.75.75 0 0 1 0 1.035l-5 5.25a.75.75 0 1 1-1.087-1.034L12.216 10l-4.51-4.734a.75.75 0 0 1 .027-1.06"
                    />
                  </svg>
                )}
              </span>
            </button>

            {item.separator && index < items.length - 1 && (
              <div className={`my-1 border-t ${borderClass}`} />
            )}
          </div>
        ))}
      </div>

      {openSubmenu && (
        <div
          ref={submenuRef}
          onMouseEnter={clearCloseTimeout}
          onMouseLeave={() => {
            closeTimeoutRef.current = setTimeout(
              () => setOpenSubmenu(null),
              200,
            );
          }}
        >
          <ContextMenu
            items={
              items.find((item) => item.id === openSubmenu)?.submenu ?? []
            }
            isOpen
            position={{ x: submenuPosition.x, y: submenuPosition.y }}
            parentButtonLeft={submenuPosition.buttonLeft}
            variant={variant}
            onClose={() => {
              setOpenSubmenu(null);
              onClose();
            }}
            level={level + 1}
          />
        </div>
      )}
    </>
  );
}

interface UseContextMenuReturn {
  contextMenu: {
    isOpen: boolean;
    position: { x: number; y: number };
  };
  showContextMenu: (event: ReactMouseEvent) => void;
  hideContextMenu: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  function showContextMenu(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
    });
  }

  function hideContextMenu() {
    setContextMenu((current) => ({ ...current, isOpen: false }));
  }

  return { contextMenu, showContextMenu, hideContextMenu };
}

export {
  ContextMenu as ContextMenuNested,
  useContextMenu as useContextMenuNested,
};
export type { ContextMenuItem as ContextMenuNestedItem };
