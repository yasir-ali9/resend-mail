"use client";

import { FileText, Trash2 } from "lucide-react";

import { Tooltip } from "@/components/reusables/tooltip";
import type { MailDraft } from "@/lib/draft/types";

import { HeaderActions } from "../controls";
import { formatEmailDate } from "../format";

interface DraftsProps {
  drafts: MailDraft[];
  onDelete: (draft: MailDraft) => void | Promise<void>;
  onOpen: (draft: MailDraft) => void;
  onSettingsOpen: () => void;
}

export function Drafts({
  drafts,
  onDelete,
  onOpen,
  onSettingsOpen,
}: DraftsProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bk-100">
      <header className="flex h-12 shrink-0 items-center px-3">
        <span className="text-[12px] font-medium text-fg-40">
          Drafts
        </span>
        <HeaderActions
          className="ml-auto hidden md:flex"
          onSettingsOpen={onSettingsOpen}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {drafts.length ? (
          <ul>
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="group flex min-w-0 items-stretch border-b border-bd-30 transition-colors hover:bg-bk-90"
              >
                <button
                  type="button"
                  onClick={() => onOpen(draft)}
                  className="grid min-w-0 flex-1 cursor-pointer grid-cols-[minmax(140px,220px)_minmax(180px,1fr)_auto] items-center gap-4 py-3 pr-3 pl-4 text-left focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-fg-70"
                    />
                    <span className="truncate text-[12px] text-fg-50">
                      {draft.to.length
                        ? draft.to.join(", ")
                        : "(no recipients)"}
                    </span>
                  </span>
                  <span className="min-w-0 truncate text-[12px]">
                    <span className="text-fg-50">
                      {draft.subject || "(No subject)"}
                    </span>
                    {draft.text ? (
                      <span className="text-fg-70">
                        {" "}
                        — {draft.text}
                      </span>
                    ) : null}
                  </span>
                  <time
                    dateTime={draft.updatedAt}
                    className="text-[10px] text-fg-70"
                  >
                    {formatEmailDate(draft.updatedAt)}
                  </time>
                </button>
                <Tooltip
                  content="Delete draft"
                  position="left"
                  className="shrink-0 self-stretch"
                >
                  <button
                    type="button"
                    aria-label="Delete draft"
                    onClick={() => void onDelete(draft)}
                    className="grid h-full w-10 cursor-pointer place-items-center text-fg-70 opacity-0 transition-[color,opacity] hover:text-fg-30 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 group-hover:opacity-100"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full min-h-72 place-items-center p-6">
            <div className="flex max-w-xs flex-col items-center text-center">
              <FileText
                aria-hidden="true"
                className="size-6 text-fg-70"
              />
              <h1 className="mt-3 text-[13px] font-medium text-fg-40">
                No saved drafts
              </h1>
              <p className="mt-1 text-[11px] text-fg-70">
                Messages you start writing will be saved here.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
