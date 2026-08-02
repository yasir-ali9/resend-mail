"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";

import { plainTextToHtml } from "@/lib/email/html";

import {
  normalizeLink,
  readEditorValue,
  type EditorValue,
  type FormatCommand,
} from "./format";
import { Toolbar } from "./toolbar";

interface EditorProps {
  onChange: (value: EditorValue) => void;
  value: EditorValue;
}

const statefulCommands: FormatCommand[] = [
  "bold",
  "createLink",
  "insertOrderedList",
  "insertUnorderedList",
  "italic",
  "justifyCenter",
  "justifyFull",
  "justifyLeft",
  "justifyRight",
  "underline",
];

export function Editor({ onChange, value }: EditorProps) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const [active, setActive] = useState<Set<string>>(() => new Set());

  const emitChange = useCallback(() => {
    if (editor.current) {
      onChange(readEditorValue(editor.current));
    }
  }, [onChange]);

  const updateActiveCommands = useCallback(() => {
    const next = new Set<string>();

    for (const command of statefulCommands) {
      try {
        if (document.queryCommandState(command)) {
          next.add(command);
        }
      } catch {
        // Browsers may not expose every command state.
      }
    }

    setActive(next);
  }, []);

  const saveSelection = useCallback(() => {
    const editorElement = editor.current;
    const browserSelection = window.getSelection();

    if (
      !editorElement ||
      !browserSelection?.rangeCount ||
      !editorElement.contains(browserSelection.anchorNode)
    ) {
      return;
    }

    selection.current = browserSelection.getRangeAt(0).cloneRange();
    updateActiveCommands();
  }, [updateActiveCommands]);

  const restoreSelection = useCallback(() => {
    const browserSelection = window.getSelection();

    if (!browserSelection || !selection.current) {
      return;
    }

    browserSelection.removeAllRanges();
    browserSelection.addRange(selection.current);
  }, []);

  useLayoutEffect(() => {
    const editorElement = editor.current;
    if (!editorElement) {
      return;
    }

    const nextHtml = value.html || plainTextToHtml(value.text);
    if (editorElement.innerHTML !== nextHtml) {
      editorElement.innerHTML = nextHtml;
    }
  }, [value.html, value.text]);

  useEffect(() => {
    document.addEventListener("selectionchange", saveSelection);
    return () => document.removeEventListener("selectionchange", saveSelection);
  }, [saveSelection]);

  function runCommand(command: FormatCommand, commandValue?: string) {
    const editorElement = editor.current;
    if (!editorElement) {
      return;
    }

    editorElement.focus();
    restoreSelection();

    if (command === "createLink") {
      const requestedLink = window.prompt("Enter a web or email address");
      const href = normalizeLink(requestedLink ?? "");

      if (!href) {
        return;
      }

      const browserSelection = window.getSelection();
      const range = browserSelection?.rangeCount
        ? browserSelection.getRangeAt(0)
        : undefined;

      if (range?.collapsed) {
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = href;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        range.insertNode(anchor);
        range.setStartAfter(anchor);
        range.collapse(true);
        browserSelection?.removeAllRanges();
        browserSelection?.addRange(range);
      } else {
        document.execCommand("createLink", false, href);
      }
    } else {
      document.execCommand(command, false, commandValue);
    }

    saveSelection();
    emitChange();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emitChange();
  }

  return (
    <div className="flex min-h-52 flex-1 flex-col">
      <div
        ref={editor}
        role="textbox"
        aria-label="Message"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your message..."
        onBlur={emitChange}
        onInput={emitChange}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPaste={handlePaste}
        className="min-h-52 flex-1 overflow-y-auto bg-transparent p-4 text-[13px] leading-6 text-fg-40 outline-none empty:before:pointer-events-none empty:before:text-fg-70 empty:before:content-[attr(data-placeholder)] [&_a]:text-ac-01 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-bd-30 [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
      <Toolbar active={active} onCommand={runCommand} />
    </div>
  );
}
