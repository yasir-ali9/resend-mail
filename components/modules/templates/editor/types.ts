export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ViewMode = "preview" | "source";
export type WorkspaceMode = "edit" | "send";
export type PreviewSize = "desktop" | "mobile";
export type ElementKind = "text" | "button" | "image" | "divider" | "section";
export type MoveDirection = "up" | "down";

export interface SelectedElement {
  canMoveDown: boolean;
  canMoveUp: boolean;
  tagName: string;
  text: string;
  href: string;
  src: string;
  alt: string;
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  padding: string;
  margin: string;
  width: string;
  borderRadius: string;
}

export interface ElementContextMenu {
  position: { x: number; y: number };
}

export interface LayerNode {
  children: LayerNode[];
  element: HTMLElement;
  id: string;
  label: string;
  tagName: string;
}
