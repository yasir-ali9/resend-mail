"use client";

import {
  ArrowDown,
  ArrowUp,
  Code2,
  Copy,
  ImagePlus,
  Link2,
  Minus,
  Monitor,
  MousePointer2,
  PanelLeft,
  PanelRight,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Type,
} from "lucide-react";
import Link from "next/link";

import { HeaderThemeButton } from "@/components/modules/mail/mail-panel/controls";
import { Button } from "@/components/reusables/button";
import { Logo } from "@/components/reusables/logo";
import { cn } from "@/lib/utils";

import { SegmentButton, ToolButton } from "./controls";
import type {
  ElementKind,
  MoveDirection,
  PreviewSize,
  SaveStatus,
  ViewMode,
} from "./types";

interface TopPaneActions {
  applySource: () => void;
  delete: () => void;
  duplicate: () => void;
  insert: (kind: ElementKind) => void;
  move: (direction: MoveDirection) => void;
  save: () => void;
  selectPreviewSize: (size: PreviewSize) => void;
  selectView: (mode: ViewMode) => void;
  toggleProperties: () => void;
  toggleLayers: () => void;
}

interface TopPaneProps {
  actions: TopPaneActions;
  hasSelection: boolean;
  layersOpen: boolean;
  name: string;
  onNameChange: (name: string) => void;
  previewSize: PreviewSize;
  saveStatus: SaveStatus;
  viewMode: ViewMode;
}

export function TopPane({
  actions,
  hasSelection,
  layersOpen,
  name,
  onNameChange,
  previewSize,
  saveStatus,
  viewMode,
}: TopPaneProps) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-bd-30 bg-bk-90 px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/templates"
          aria-label="Back to templates"
          className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-bk-70"
        >
          <Logo className="size-6" />
        </Link>
        {viewMode === "preview" ? (
          <SegmentButton
            active={layersOpen}
            label="Toggle layers"
            onClick={actions.toggleLayers}
          >
            <PanelLeft className="size-3.5" />
          </SegmentButton>
        ) : null}
        <input
          aria-label="Template name"
          value={name}
          maxLength={120}
          onChange={(event) => onNameChange(event.target.value)}
          className="h-7 min-w-0 max-w-72 flex-1 rounded-md border border-transparent bg-transparent px-2 text-[12px] font-medium text-fg-30 outline-none hover:border-bd-30 focus:border-bd-40 focus:bg-bk-80"
        />
      </div>

      <div className="flex items-center gap-1">
        {viewMode === "preview" ? (
          <VisualTools actions={actions} hasSelection={hasSelection} />
        ) : (
          <>
            <span className="mr-1 text-[10px] text-fg-60">HTML and CSS</span>
            <Button type="button" size="sm" onClick={actions.applySource}>
              Apply and preview
            </Button>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <SaveState status={saveStatus} />
        <SegmentButton
          active={previewSize === "desktop"}
          label="Desktop preview"
          onClick={() => actions.selectPreviewSize("desktop")}
        >
          <Monitor className="size-3.5" />
        </SegmentButton>
        <SegmentButton
          active={previewSize === "mobile"}
          label="Mobile preview"
          onClick={() => actions.selectPreviewSize("mobile")}
        >
          <Smartphone className="size-3.5" />
        </SegmentButton>
        <span className="mx-1 h-5 w-px bg-bd-30" />
        <SegmentButton
          active={viewMode === "preview"}
          label="Visual editor"
          onClick={() => actions.selectView("preview")}
        >
          <MousePointer2 className="size-3.5" />
        </SegmentButton>
        <SegmentButton
          active={viewMode === "source"}
          label="HTML source"
          onClick={() => actions.selectView("source")}
        >
          <Code2 className="size-3.5" />
        </SegmentButton>
        <span className="mx-1 h-5 w-px bg-bd-30" />
        <HeaderThemeButton />
        <Button
          type="button"
          size="sm"
          disabled={saveStatus === "saving"}
          onClick={actions.save}
          className="ml-1 hidden gap-1.5 sm:flex"
        >
          <Save className="size-3.5" />
          Save
        </Button>
        <button
          type="button"
          aria-label="Toggle properties"
          onClick={actions.toggleProperties}
          className="grid size-7 place-items-center rounded-md text-fg-60 hover:bg-bk-70 md:hidden"
        >
          <PanelRight className="size-3.5" />
        </button>
      </div>
    </header>
  );
}

function VisualTools({
  actions,
  hasSelection,
}: {
  actions: TopPaneActions;
  hasSelection: boolean;
}) {
  return (
    <>
      <ToolButton label="Add text" onClick={() => actions.insert("text")}>
        <Type className="size-3.5" />
      </ToolButton>
      <ToolButton label="Add button" onClick={() => actions.insert("button")}>
        <Link2 className="size-3.5" />
      </ToolButton>
      <ToolButton label="Add image" onClick={() => actions.insert("image")}>
        <ImagePlus className="size-3.5" />
      </ToolButton>
      <ToolButton label="Add divider" onClick={() => actions.insert("divider")}>
        <Minus className="size-3.5" />
      </ToolButton>
      <ToolButton label="Add section" onClick={() => actions.insert("section")}>
        <Plus className="size-3.5" />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-bd-30" />
      <ToolButton
        label="Move up"
        disabled={!hasSelection}
        onClick={() => actions.move("up")}
      >
        <ArrowUp className="size-3.5" />
      </ToolButton>
      <ToolButton
        label="Move down"
        disabled={!hasSelection}
        onClick={() => actions.move("down")}
      >
        <ArrowDown className="size-3.5" />
      </ToolButton>
      <ToolButton
        label="Duplicate"
        disabled={!hasSelection}
        onClick={actions.duplicate}
      >
        <Copy className="size-3.5" />
      </ToolButton>
      <ToolButton
        label="Delete"
        disabled={!hasSelection}
        onClick={actions.delete}
      >
        <Trash2 className="size-3.5" />
      </ToolButton>
    </>
  );
}

function SaveState({ status }: { status: SaveStatus }) {
  return (
    <span
      className={cn(
        "mr-1 hidden min-w-11 text-right text-[10px] sm:block",
        status === "error" ? "text-[#c70036]" : "text-fg-70",
      )}
    >
      {status === "saving"
        ? "Saving…"
        : status === "saved"
          ? "Saved"
          : status === "error"
            ? "Save failed"
            : ""}
    </span>
  );
}
