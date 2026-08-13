import type { MoveDirection } from "./types";

export function getArrowMove(event: KeyboardEvent): MoveDirection | undefined {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isTextInputTarget(event.target)
  ) {
    return;
  }
  if (event.key === "ArrowUp") return "up";
  if (event.key === "ArrowDown") return "down";
}

export function isDeleteShortcut(event: KeyboardEvent) {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !isTextInputTarget(event.target) &&
    event.key === "Delete"
  );
}

function isTextInputTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.isContentEditable ||
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.tagName === "SELECT",
  );
}
