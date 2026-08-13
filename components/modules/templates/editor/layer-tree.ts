import { getDirectTextContent } from "./dom";
import type { LayerNode } from "./types";

const hiddenTags = new Set(["META", "LINK", "STYLE", "SCRIPT", "TITLE"]);

export function buildLayerTree(
  body: HTMLElement,
  getId: (element: HTMLElement) => string,
): LayerNode[] {
  return Array.from(body.children).flatMap((element) =>
    !hiddenTags.has(element.tagName)
      ? [buildNode(element as HTMLElement, getId)]
      : [],
  );
}

export function countLayers(nodes: LayerNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + countLayers(node.children),
    0,
  );
}

function buildNode(
  element: HTMLElement,
  getId: (element: HTMLElement) => string,
): LayerNode {
  return {
    id: getId(element),
    element,
    tagName: element.tagName,
    label: getLayerLabel(element),
    children: Array.from(element.children).flatMap((child) =>
      !hiddenTags.has(child.tagName)
        ? [buildNode(child as HTMLElement, getId)]
        : [],
    ),
  };
}

function getLayerLabel(element: HTMLElement) {
  const tag = element.tagName;
  const directText = compact(getDirectTextContent(element));

  if (tag === "IMG") {
    return compact(element.getAttribute("alt") ?? "") || "Image";
  }
  if (tag === "A") return directText || "Link";
  if (tag === "HR") return "Divider";
  if (/^H[1-6]$/.test(tag)) return directText || "Heading";
  if (tag === "P") return directText || "Paragraph";
  if (tag === "BUTTON") return directText || "Button";
  if (tag === "TABLE") return "Table";
  if (tag === "TBODY") return "Table body";
  if (tag === "TR") return "Row";
  if (tag === "TD" || tag === "TH") return directText || "Cell";
  if (tag === "DIV") return directText || "Container";
  if (tag === "SPAN") return directText || "Text";
  return directText || tag.toLowerCase();
}

function compact(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 34 ? `${normalized.slice(0, 34)}…` : normalized;
}
