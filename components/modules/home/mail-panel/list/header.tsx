import {
  Archive,
  CornerDownLeft,
  Inbox,
  LoaderCircle,
  Mail,
  MailOpen,
  RotateCcw,
  RotateCw,
  Search,
  ShieldAlert,
  SquareX,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/reusables/button";
import { Checkbox } from "@/components/reusables/checkbox";
import { Tooltip } from "@/components/reusables/tooltip";
import type {
  EmailSearchFilters,
  EmailThreadBulkAction,
} from "@/lib/email/types";

import {
  BulkActionButton,
  HeaderActions,
} from "../controls";
import { SearchFilters } from "./search";
import type { MailboxView } from "../thread/state";

interface ListHeaderProps {
  deletingPermanently: boolean;
  filters: EmailSearchFilters;
  folder: MailboxView;
  search: string;
  selection: {
    all: boolean;
    allArchived: boolean;
    allStarred: boolean;
    count: number;
    hasInbound: boolean;
    hasUnread: boolean;
    some: boolean;
  };
  status: {
    bulkUpdating: boolean;
    refreshing: boolean;
  };
  threadCount: number;
  onBulkAction: (action: EmailThreadBulkAction) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onEmptyTrash: () => void;
  onFiltersChange: (filters: EmailSearchFilters) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSettingsOpen: () => void;
  onToggleAll: () => void;
}

export function ListHeader({
  deletingPermanently,
  filters,
  folder,
  search,
  selection,
  status,
  threadCount,
  onBulkAction,
  onClearSelection,
  onDeleteSelected,
  onEmptyTrash,
  onFiltersChange,
  onRefresh,
  onSearchChange,
  onSearchSubmit,
  onSettingsOpen,
  onToggleAll,
}: ListHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchExpanded = searchOpen && selection.count === 0;

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        !search.trim() &&
        !searchRef.current?.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [search, searchOpen]);

  return (
    <header className="flex h-12 items-center gap-1 px-1 sm:gap-1.5 sm:px-4">
      <div
        className={`shrink-0 items-center gap-1 sm:gap-1.5 ${
          mobileSearchExpanded ? "hidden md:flex" : "flex"
        }`}
      >
        <Tooltip
          content={
            selection.all
              ? "Clear selection"
              : "Select all conversations"
          }
          position="bottom"
          disabled={threadCount === 0 || status.bulkUpdating}
        >
          <button
            type="button"
            onClick={onToggleAll}
            disabled={threadCount === 0 || status.bulkUpdating}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={
              selection.all
                ? "Clear conversation selection"
                : "Select all conversations"
            }
            aria-pressed={selection.all}
          >
            <HeaderCheckbox
              checked={selection.all}
              indeterminate={selection.some}
            />
          </button>
        </Tooltip>

        <Tooltip content="Refresh emails" position="bottom">
          <button
            type="button"
            onClick={onRefresh}
            disabled={status.refreshing || status.bulkUpdating}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Refresh emails"
          >
            {status.refreshing ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : (
              <RotateCw aria-hidden="true" className="size-3.5" />
            )}
          </button>
        </Tooltip>
      </div>

      {selection.count > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <span className="mr-0.5 shrink-0 text-[10px] text-fg-50 sm:mr-1 sm:text-[11px]">
            {selection.count} Selected
          </span>
          {folder !== "trash" && folder !== "spam" ? (
            <BulkActionButton
              label={selection.allArchived ? "Move to inbox" : "Archive"}
              disabled={status.bulkUpdating}
              onClick={() =>
                onBulkAction(
                  selection.allArchived ? "move-inbox" : "archive",
                )
              }
            >
              {selection.allArchived ? (
                <Inbox aria-hidden="true" className="size-3.5" />
              ) : (
                <Archive aria-hidden="true" className="size-3.5" />
              )}
            </BulkActionButton>
          ) : null}
          {folder !== "trash" ? (
            <BulkActionButton
              label={folder === "spam" ? "Not spam" : "Mark as spam"}
              disabled={status.bulkUpdating}
              onClick={() =>
                onBulkAction(folder === "spam" ? "not-spam" : "spam")
              }
            >
              <ShieldAlert aria-hidden="true" className="size-3.5" />
            </BulkActionButton>
          ) : null}
          <BulkActionButton
            label={
              folder === "trash" ? "Restore from trash" : "Move to trash"
            }
            disabled={status.bulkUpdating}
            onClick={() =>
              onBulkAction(folder === "trash" ? "restore" : "trash")
            }
          >
            {folder === "trash" ? (
              <RotateCcw aria-hidden="true" className="size-3.5" />
            ) : (
              <Trash2 aria-hidden="true" className="size-3.5" />
            )}
          </BulkActionButton>
          {folder === "trash" ? (
            <BulkActionButton
              label="Delete permanently"
              disabled={status.bulkUpdating || deletingPermanently}
              onClick={onDeleteSelected}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </BulkActionButton>
          ) : null}
          <BulkActionButton
            label={
              selection.hasUnread ? "Mark as read" : "Mark as unread"
            }
            disabled={
              status.bulkUpdating ||
              (!selection.hasUnread && !selection.hasInbound)
            }
            onClick={() =>
              onBulkAction(
                selection.hasUnread ? "mark-read" : "mark-unread",
              )
            }
          >
            {selection.hasUnread ? (
              <MailOpen aria-hidden="true" className="size-3.5" />
            ) : (
              <Mail aria-hidden="true" className="size-3.5" />
            )}
          </BulkActionButton>
          <BulkActionButton
            label={selection.allStarred ? "Unstar" : "Star"}
            disabled={status.bulkUpdating}
            onClick={() =>
              onBulkAction(selection.allStarred ? "unstar" : "star")
            }
          >
            {selection.allStarred ? (
              <StarOff aria-hidden="true" className="size-3.5" />
            ) : (
              <Star aria-hidden="true" className="size-3.5" />
            )}
          </BulkActionButton>
          <BulkActionButton
            label="Clear selection"
            disabled={status.bulkUpdating}
            onClick={onClearSelection}
          >
            <SquareX aria-hidden="true" className="size-3.5" />
          </BulkActionButton>
        </div>
      ) : (
        <>
          <div className={mobileSearchExpanded ? "hidden md:block" : ""}>
            <SearchFilters
              compact
              filters={filters}
              onApply={onFiltersChange}
            />
          </div>
          {searchOpen ? (
            <div
              ref={searchRef}
              className="relative min-w-0 flex-1 md:max-w-xs"
            >
              <label htmlFor="mail-search" className="sr-only">
                Search conversations
              </label>
              <span className="pointer-events-none absolute top-1/2 left-0 grid size-7 -translate-y-1/2 place-items-center text-fg-70">
                <Search aria-hidden="true" className="size-3.5" />
              </span>
              <input
                autoFocus
                id="mail-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSearchSubmit();
                  }
                }}
                placeholder="Search conversations..."
                className="h-8 w-full min-w-0 border-0 border-b border-bd-30 bg-transparent py-1 pr-14 pl-7 text-[12px] text-fg-50 outline-none placeholder:text-fg-70 focus:border-bd-40 focus:ring-0"
              />
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="absolute top-0 right-7 grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
              <button
                type="button"
                aria-label="Search now"
                onClick={onSearchSubmit}
                className="absolute top-0 right-0 grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <CornerDownLeft aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          ) : (
            <Tooltip content="Search conversations" position="bottom">
              <button
                type="button"
                aria-label="Search conversations"
                aria-pressed={false}
                onClick={() => setSearchOpen(true)}
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <Search aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </>
      )}

      {selection.count === 0 &&
      folder === "trash" &&
      threadCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEmptyTrash}
          disabled={deletingPermanently}
          className="hidden shrink-0 sm:inline-flex"
        >
          Empty trash
        </Button>
      ) : null}
      <HeaderActions
        className="ml-auto hidden md:flex"
        onSettingsOpen={onSettingsOpen}
      />
    </header>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
}: {
  checked: boolean;
  indeterminate: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate && !checked;
    }
  }, [checked, indeterminate]);

  return <Checkbox ref={ref} checked={checked} readOnly tabIndex={-1} />;
}
