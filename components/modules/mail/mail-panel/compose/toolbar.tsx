"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ALargeSmall,
  Bold,
  Eraser,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
  Type,
} from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";

import {
  Select,
  type SelectOption,
} from "@/components/reusables/select";
import { Tooltip } from "@/components/reusables/tooltip";
import { cn } from "@/lib/utils";

import type { FormatCommand } from "./format";

interface ToolbarProps {
  active: Set<string>;
  onCommand: (command: FormatCommand, value?: string) => void;
}

const fontOptions: SelectOption[] = [
  { label: "Sans serif", value: "Arial" },
  { label: "Serif", value: "Georgia" },
  { label: "Monospace", value: "Courier New" },
];

const fontSizeOptions: SelectOption[] = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
];

const alignmentOptions: SelectOption[] = [
  { label: "Align left", value: "justifyLeft", icon: AlignLeft },
  { label: "Align center", value: "justifyCenter", icon: AlignCenter },
  { label: "Align right", value: "justifyRight", icon: AlignRight },
  { label: "Justify", value: "justifyFull", icon: AlignJustify },
];

const listOptions: SelectOption[] = [
  { label: "Bulleted list", value: "insertUnorderedList", icon: List },
  { label: "Numbered list", value: "insertOrderedList", icon: ListOrdered },
];

const indentationOptions: SelectOption[] = [
  { label: "Decrease indent", value: "outdent", icon: IndentDecrease },
  { label: "Increase indent", value: "indent", icon: IndentIncrease },
];

interface ToolbarButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}

function ToolbarButton({
  active = false,
  children,
  label,
  onClick,
}: ToolbarButtonProps) {
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    onClick();
  }

  return (
    <Tooltip content={label} position="top">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onMouseDown={handleMouseDown}
        className={cn(
          "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-fg-60 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02",
          active && "bg-bk-70 text-fg-30",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-bd-30" />;
}

export function Toolbar({ active, onCommand }: ToolbarProps) {
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState("3");
  const alignment = alignmentOptions.find(({ value }) => active.has(value))
    ?.value ?? "justifyLeft";
  const listStyle = listOptions.find(({ value }) => active.has(value))?.value ?? "";

  return (
    <div
      role="toolbar"
      aria-label="Message formatting"
      className="flex min-h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-t border-bd-30 bg-bk-80 px-2 py-1"
    >
      <ToolbarButton label="Undo" onClick={() => onCommand("undo")}>
        <Undo2 aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => onCommand("redo")}>
        <Redo2 aria-hidden="true" className="size-3.5" />
      </ToolbarButton>

      <Divider />

      <Select
        ariaLabel="Font family"
        placement="top"
        triggerDisplay="icon"
        triggerIcon={Type}
        value={font}
        options={fontOptions}
        onChange={(nextFont) => {
          setFont(nextFont);
          onCommand("fontName", nextFont);
        }}
        className="w-10 shrink-0"
      />

      <Select
        ariaLabel="Text size"
        placement="top"
        triggerDisplay="icon"
        triggerIcon={ALargeSmall}
        value={fontSize}
        options={fontSizeOptions}
        onChange={(nextSize) => {
          setFontSize(nextSize);
          onCommand("fontSize", nextSize);
        }}
        className="w-10 shrink-0"
      />

      <Divider />

      <ToolbarButton
        active={active.has("bold")}
        label="Bold"
        onClick={() => onCommand("bold")}
      >
        <Bold aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={active.has("italic")}
        label="Italic"
        onClick={() => onCommand("italic")}
      >
        <Italic aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={active.has("underline")}
        label="Underline"
        onClick={() => onCommand("underline")}
      >
        <Underline aria-hidden="true" className="size-3.5" />
      </ToolbarButton>

      <Tooltip content="Text color" position="top">
        <label className="relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-[13px] font-medium text-fg-60 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-within:ring-1 focus-within:ring-ac-02">
          A
          <span className="absolute bottom-1 h-0.5 w-3.5 bg-current" />
          <input
            type="color"
            defaultValue="#202124"
            aria-label="Text color"
            onChange={(event) =>
              onCommand("foreColor", event.target.value)
            }
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </Tooltip>

      <Divider />

      <Select
        ariaLabel="Text alignment"
        placement="top"
        triggerDisplay="icon"
        value={alignment}
        options={alignmentOptions}
        onChange={(command) => onCommand(command as FormatCommand)}
        className="w-10 shrink-0"
      />

      <Divider />

      <Select
        ariaLabel="List style"
        placement="top"
        triggerDisplay="icon"
        triggerIcon={List}
        value={listStyle}
        options={listOptions}
        onChange={(command) => onCommand(command as FormatCommand)}
        className="w-10 shrink-0"
      />
      <Select
        ariaLabel="Indentation"
        placement="top"
        triggerDisplay="icon"
        triggerIcon={IndentIncrease}
        value=""
        options={indentationOptions}
        onChange={(command) => onCommand(command as FormatCommand)}
        className="w-10 shrink-0"
      />

      <Divider />

      <ToolbarButton
        active={active.has("createLink")}
        label="Insert link"
        onClick={() => onCommand("createLink")}
      >
        <Link2 aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Remove formatting"
        onClick={() => onCommand("removeFormat")}
      >
        <Eraser aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
