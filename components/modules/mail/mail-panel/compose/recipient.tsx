"use client";

import { Minus, X } from "lucide-react";
import {
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { extractEmailAddress, isValidEmailAddress } from "@/lib/email/address";

interface RecipientFieldProps {
  id: string;
  name: "to" | "cc" | "bcc";
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  onDismissEmpty?: () => void;
  onInvalid: (message: string) => void;
  autoFocus?: boolean;
  children?: ReactNode;
}

export function RecipientField({
  id,
  name,
  label,
  values,
  onChange,
  onDismissEmpty,
  onInvalid,
  autoFocus = false,
  children,
}: RecipientFieldProps) {
  const [draft, setDraft] = useState("");

  function addRecipients(candidates: string[]) {
    const existingAddresses = new Set(
      values.map((value) => extractEmailAddress(value)),
    );
    const nextValues = [...values];
    const invalidValues: string[] = [];

    for (const candidate of candidates) {
      const address = extractEmailAddress(candidate);

      if (!address) {
        continue;
      }

      if (!isValidEmailAddress(address)) {
        invalidValues.push(candidate.trim());
        continue;
      }

      if (!existingAddresses.has(address)) {
        existingAddresses.add(address);
        nextValues.push(address);
      }
    }

    if (nextValues.length !== values.length) {
      onChange(nextValues);
    }

    if (invalidValues.length) {
      setDraft(invalidValues[0]);
      onInvalid("Enter a valid email address.");
      return;
    }

    setDraft("");
  }

  function commitDraft() {
    addRecipients(draft.split(/[,;\r\n]+/));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedValue = event.clipboardData.getData("text");

    if (!/[,;\r\n]/.test(pastedValue)) {
      return;
    }

    event.preventDefault();
    addRecipients(pastedValue.split(/[,;\r\n]+/));
  }

  return (
    <div className="flex min-h-10 items-start gap-3 border-b border-bd-40 px-4 py-1.5">
      <label htmlFor={id} className="w-12 shrink-0 pt-1 text-[11px] text-fg-70">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {values.map((address) => (
          <span key={address} className="contents">
            <input type="hidden" name={name} value={address} />
            <span className="flex h-6 max-w-full items-center gap-1 rounded-md bg-bk-60 px-2 text-[11px] text-fg-40">
              <span className="truncate">{address}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(values.filter((value) => value !== address))
                }
                className="-mr-1 grid size-4 shrink-0 cursor-pointer place-items-center rounded text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
                aria-label={`Remove ${address}`}
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </span>
          </span>
        ))}
        <input
          id={id}
          name={name}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            if (draft.trim()) {
              commitDraft();
            }
          }}
          placeholder={values.length ? "" : "recipient@example.com"}
          className="h-6 min-w-36 flex-1 bg-transparent text-[12px] text-fg-40 outline-none placeholder:text-fg-70"
        />
      </div>
      {onDismissEmpty && !values.length && !draft ? (
        <button
          type="button"
          onClick={onDismissEmpty}
          aria-label={`Hide ${label}`}
          title={`Hide ${label}`}
          className="mt-0.5 grid size-5 shrink-0 cursor-pointer place-items-center rounded text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
        >
          <Minus aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
      {children ? (
        <div className="flex shrink-0 items-center gap-2 pt-1">{children}</div>
      ) : null}
    </div>
  );
}
