import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { setDirectTextContent } from "./dom";
import type { SelectedElement } from "./types";

export const inputClass =
  "h-8 w-full rounded-md border border-bd-30 bg-bk-80 px-2 text-[11px] text-fg-40 outline-none placeholder:text-fg-70 focus:border-bd-50 focus:ring-1 focus:ring-ac-02";

export function Properties({
  selected,
  mutate,
}: {
  selected: SelectedElement;
  mutate: (mutator: (element: HTMLElement) => void) => void;
}) {
  const textEditable = Boolean(selected.text.trim());
  const changeStyle = (property: string, value: string) =>
    mutate((element) => {
      element.style.setProperty(
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        value,
      );
    });

  return (
    <div className="space-y-4">
      {textEditable ? (
        <Field label="Content">
          <textarea
            value={selected.text}
            onChange={(event) =>
              mutate((element) =>
                setDirectTextContent(element, event.target.value),
              )
            }
            rows={4}
            className={cn(inputClass, "h-auto resize-y py-2")}
          />
        </Field>
      ) : null}
      {selected.tagName === "A" ? (
        <Field label="Link URL">
          <input
            value={selected.href}
            onChange={(event) =>
              mutate((element) =>
                element.setAttribute("href", event.target.value),
              )
            }
            className={inputClass}
          />
        </Field>
      ) : null}
      {selected.tagName === "IMG" ? (
        <>
          <Field label="Image URL">
            <input
              value={selected.src}
              onChange={(event) =>
                mutate((element) =>
                  element.setAttribute("src", event.target.value),
                )
              }
              className={inputClass}
            />
          </Field>
          <Field label="Alt text">
            <input
              value={selected.alt}
              onChange={(event) =>
                mutate((element) =>
                  element.setAttribute("alt", event.target.value),
                )
              }
              className={inputClass}
            />
          </Field>
        </>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Text color">
          <ColorInput
            value={selected.color}
            onChange={(value) => changeStyle("color", value)}
          />
        </Field>
        <Field label="Background">
          <ColorInput
            value={selected.backgroundColor}
            onChange={(value) => changeStyle("backgroundColor", value)}
          />
        </Field>
      </div>
      <Field label="Alignment">
        <div className="grid grid-cols-3 gap-1">
          <PropertyButton
            active={selected.textAlign === "left" || !selected.textAlign}
            label="Left"
            onClick={() => changeStyle("textAlign", "left")}
          >
            <AlignLeft className="size-3.5" />
          </PropertyButton>
          <PropertyButton
            active={selected.textAlign === "center"}
            label="Center"
            onClick={() => changeStyle("textAlign", "center")}
          >
            <AlignCenter className="size-3.5" />
          </PropertyButton>
          <PropertyButton
            active={selected.textAlign === "right"}
            label="Right"
            onClick={() => changeStyle("textAlign", "right")}
          >
            <AlignRight className="size-3.5" />
          </PropertyButton>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size">
          <input
            value={selected.fontSize}
            onChange={(event) => changeStyle("fontSize", event.target.value)}
            className={inputClass}
            placeholder="16px"
          />
        </Field>
        <Field label="Font weight">
          <select
            value={selected.fontWeight}
            onChange={(event) => changeStyle("fontWeight", event.target.value)}
            className={inputClass}
          >
            <option value="">Default</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </select>
        </Field>
      </div>
      <Field label="Font family">
        <input
          value={selected.fontFamily}
          onChange={(event) => changeStyle("fontFamily", event.target.value)}
          className={inputClass}
          placeholder="Arial, sans-serif"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Padding">
          <input
            value={selected.padding}
            onChange={(event) => changeStyle("padding", event.target.value)}
            className={inputClass}
            placeholder="16px"
          />
        </Field>
        <Field label="Margin">
          <input
            value={selected.margin}
            onChange={(event) => changeStyle("margin", event.target.value)}
            className={inputClass}
            placeholder="0 0 16px"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <input
            value={selected.width}
            onChange={(event) => changeStyle("width", event.target.value)}
            className={inputClass}
            placeholder="100%"
          />
        </Field>
        <Field label="Corner radius">
          <input
            value={selected.borderRadius}
            onChange={(event) =>
              changeStyle("borderRadius", event.target.value)
            }
            className={inputClass}
            placeholder="8px"
          />
        </Field>
      </div>
    </div>
  );
}

export function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium text-fg-60">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-bd-30 bg-bk-80">
      <input
        type="color"
        value={safe}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-8 cursor-pointer border-0 bg-transparent p-1"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-1 text-[10px] text-fg-50 outline-none"
      />
    </div>
  );
}

function PropertyButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid h-8 place-items-center rounded-md border border-bd-30 text-fg-60 hover:bg-bk-70",
        active && "bg-bk-70 text-fg-30",
      )}
    >
      {children}
    </button>
  );
}
