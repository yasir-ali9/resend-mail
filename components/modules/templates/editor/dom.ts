import type { SelectedElement } from "./types";

export function readSelectedElement(element: HTMLElement): SelectedElement {
  const style = element.style;
  return {
    canMoveDown: Boolean(element.nextElementSibling),
    canMoveUp: Boolean(element.previousElementSibling),
    tagName: element.tagName,
    text: getDirectTextContent(element),
    href: element.getAttribute("href") ?? "",
    src: element.getAttribute("src") ?? "",
    alt: element.getAttribute("alt") ?? "",
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.textAlign,
    padding: style.padding,
    margin: style.margin,
    width: style.width || element.getAttribute("width") || "",
    borderRadius: style.borderRadius,
  };
}

export function getDirectTextContent(element: HTMLElement) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent ?? "")
    .join("");
}

export function setDirectTextContent(element: HTMLElement, value: string) {
  const textNodes = Array.from(element.childNodes).filter(
    (node) => node.nodeType === 3,
  );
  const [firstTextNode, ...remainingTextNodes] = textNodes;
  if (!firstTextNode) return;

  firstTextNode.textContent = value;
  remainingTextNodes.forEach((node) => node.remove());
}

export function findEditableTextElement(
  target: HTMLElement,
  body: HTMLElement,
) {
  let element: HTMLElement | null = target;
  while (element && element !== body) {
    if (getDirectTextContent(element).trim()) return element;
    element = element.parentElement;
  }
  return null;
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection();
  if (!selection) return;
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function stripEditorAttributes(element: HTMLElement) {
  const elements = [element, ...Array.from(element.querySelectorAll("*"))];
  elements.forEach((child) => {
    child.removeAttribute("data-template-selected");
    child.removeAttribute("data-template-hovered");
    child.removeAttribute("data-template-editing");
    child.removeAttribute("contenteditable");
  });
}
