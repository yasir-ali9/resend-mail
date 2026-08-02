"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/reusables/button";
import { Checkbox } from "@/components/reusables/checkbox";
import { StringInput } from "@/components/reusables/input/string";
import { Select } from "@/components/reusables/select";
import { Tooltip } from "@/components/reusables/tooltip";
import {
  DEFAULT_EMAIL_SEARCH_FILTERS,
  getEmailSearchFilterCount,
  type EmailReadFilter,
  type EmailSearchFilters,
  type EmailSearchScope,
} from "@/lib/email/types";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  compact?: boolean;
  filters: EmailSearchFilters;
  onApply: (filters: EmailSearchFilters) => void;
}

const readOptions = [
  { label: "Any status", value: "all" },
  { label: "Read", value: "read" },
  { label: "Unread", value: "unread" },
];

const scopeOptions = [
  { label: "Current folder", value: "current" },
  { label: "Everything", value: "everything" },
];

export function SearchFilters({
  compact = false,
  filters,
  onApply,
}: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EmailSearchFilters>(filters);
  const [dateError, setDateError] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({
    left: 16,
    top: 0,
    width: 360,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeCount = getEmailSearchFilterCount(filters);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const updatePopoverPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const desktop = window.matchMedia("(min-width: 640px)").matches;
      const viewportGutter = desktop ? 16 : 8;
      const popoverWidth = Math.min(360, window.innerWidth - viewportGutter * 2);
      const triggerBounds = trigger.getBoundingClientRect();
      const preferredLeft = desktop
        ? triggerBounds.left
        : triggerBounds.right - popoverWidth;
      const left = Math.min(
        Math.max(preferredLeft, viewportGutter),
        window.innerWidth - popoverWidth - viewportGutter,
      );

      setPopoverPosition({
        left,
        top: triggerBounds.bottom + 4,
        width: popoverWidth,
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.visualViewport?.addEventListener("resize", updatePopoverPosition);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.visualViewport?.removeEventListener("resize", updatePopoverPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      const insidePortalledSelect =
        target instanceof Element &&
        target.closest("[data-select-dropdown]");

      if (
        !insidePortalledSelect &&
        !rootRef.current?.contains(target as Node)
      ) {
        setOpen(false);
        setDateError("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setDateError("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function updateDraft<Key extends keyof EmailSearchFilters>(
    key: Key,
    value: EmailSearchFilters[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "after" || key === "before") {
      setDateError("");
    }
  }

  function applyFilters() {
    if (draft.after && draft.before && draft.after > draft.before) {
      setDateError("Start date must be before the end date.");
      return;
    }

    onApply({
      ...draft,
      from: draft.from.trim(),
      recipient: draft.recipient.trim(),
      subject: draft.subject.trim(),
    });
    setOpen(false);
    setDateError("");
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "z-20",
        compact ? "relative shrink-0" : "absolute inset-y-0 right-0",
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          activeCount
            ? `Search filters, ${activeCount} active`
            : "Search filters"
        }
        title="Search filters"
        onClick={() => {
          setDraft(filters);
          setDateError("");
          setOpen((current) => !current);
        }}
        className={cn(
          compact
            ? "relative grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
            : "relative grid h-full w-9 cursor-pointer place-items-center rounded-r-lg text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02",
          compact
            ? open || activeCount > 0
              ? "bg-bk-60 text-fg-30"
              : undefined
            : open || activeCount > 0
              ? "bg-bk-70 text-fg-40"
              : undefined,
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-3.5" />
        {activeCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-ac-01" />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Search filters"
          style={{
            left: popoverPosition.left,
            top: popoverPosition.top,
            width: popoverPosition.width,
          }}
          className="fixed rounded-xl border border-bd-30 bg-bk-90 px-2.5 py-3 shadow-lg sm:px-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[12px] font-medium text-fg-40">
              Search filters
            </h2>
            <Tooltip content="Reset filters" position="bottom">
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...DEFAULT_EMAIL_SEARCH_FILTERS });
                  setDateError("");
                }}
                aria-label="Reset filters"
                className="grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <RotateCcw aria-hidden="true" className="size-3" />
              </button>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <FilterField label="From" className="sm:col-span-2">
              <StringInput
                value={draft.from}
                onChange={(value) => updateDraft("from", value)}
                placeholder="Name or email"
                className="[&_input]:rounded-lg [&_input]:border-bd-40 [&_input]:bg-bk-80"
              />
            </FilterField>
            <FilterField label="Recipient" className="sm:col-span-2">
              <StringInput
                value={draft.recipient}
                onChange={(value) => updateDraft("recipient", value)}
                placeholder="To, Cc, or Bcc"
                className="[&_input]:rounded-lg [&_input]:border-bd-40 [&_input]:bg-bk-80"
              />
            </FilterField>
            <FilterField label="Subject" className="sm:col-span-2">
              <StringInput
                value={draft.subject}
                onChange={(value) => updateDraft("subject", value)}
                placeholder="Words in the subject"
                className="[&_input]:rounded-lg [&_input]:border-bd-40 [&_input]:bg-bk-80"
              />
            </FilterField>
            <FilterField label="Status">
              <Select
                options={readOptions}
                value={draft.read}
                onChange={(value) =>
                  updateDraft("read", value as EmailReadFilter)
                }
                className={cn(
                  "w-full [&>button]:border-bd-40",
                  draft.read === "all" && "[&>button]:text-fg-70",
                )}
              />
            </FilterField>
            <FilterField label="Search in">
              <Select
                options={scopeOptions}
                value={draft.scope}
                onChange={(value) =>
                  updateDraft("scope", value as EmailSearchScope)
                }
                className={cn(
                  "w-full [&>button]:border-bd-40",
                  draft.scope === "current" && "[&>button]:text-fg-70",
                )}
              />
            </FilterField>
            <FilterField label="From date">
              <StringInput
                type="date"
                value={draft.after}
                onChange={(value) => updateDraft("after", value)}
                className={cn(
                  "[&_input]:rounded-lg [&_input]:border-bd-40 [&_input]:bg-bk-80",
                  !draft.after && "[&_input]:text-fg-70",
                )}
              />
            </FilterField>
            <FilterField label="Through date">
              <StringInput
                type="date"
                value={draft.before}
                onChange={(value) => updateDraft("before", value)}
                className={cn(
                  "[&_input]:rounded-lg [&_input]:border-bd-40 [&_input]:bg-bk-80",
                  !draft.before && "[&_input]:text-fg-70",
                )}
              />
            </FilterField>
          </div>

          <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-[11px] text-fg-70">
            <Checkbox
              checked={draft.hasAttachments}
              onChange={(event) =>
                updateDraft("hasAttachments", event.target.checked)
              }
            />
            Has attachments
          </label>

          {dateError ? (
            <p role="alert" className="mt-2 text-[10px] text-[#c70036]">
              {dateError}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setDateError("");
              }}
              className="border-bd-40 bg-bk-80 text-fg-60 hover:bg-bk-70 hover:text-fg-50"
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyFilters}>
              Search
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-[10px] text-fg-70">{label}</span>
      {children}
    </label>
  );
}
