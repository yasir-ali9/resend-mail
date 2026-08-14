"use client";

import {
  ArrowDown,
  ArrowUp,
  Clipboard,
  Copy,
  MousePointer2,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  ContextMenu,
  type ContextMenuItem,
} from "@/components/reusables/context-menu";
import type { Mailbox } from "@/lib/mailbox/types";
import type { MailTemplate } from "@/lib/template/types";
import { cn } from "@/lib/utils";

import { saveTemplateAction } from "../actions";
import {
  findEditableTextElement,
  getDirectTextContent,
  placeCaretAtEnd,
  readSelectedElement,
  setDirectTextContent,
  stripEditorAttributes,
} from "./dom";
import { createElement } from "./elements";
import { Field, inputClass, Properties } from "./properties";
import { buildLayerTree } from "./layer-tree";
import { LayersPanel } from "./layers";
import { PreviewResizeHandle } from "./resize-handle";
import { SendPreview } from "./send-preview";
import { getArrowMove, isDeleteShortcut } from "./shortcuts";
import { TopPane } from "./top-pane";
import type {
  ElementContextMenu,
  LayerNode,
  PreviewSize,
  SaveStatus,
  SelectedElement,
  ViewMode,
  WorkspaceMode,
} from "./types";
import { useTemplateSend } from "./use-template-send";

export function TemplateEditor({
  initialTemplate,
  mailboxes,
}: {
  initialTemplate: MailTemplate;
  mailboxes: Mailbox[];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const measurePreviewRef = useRef<() => void>(() => undefined);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  const editingElementRef = useRef<HTMLElement | null>(null);
  const editingOriginalTextRef = useRef("");
  const inlineEditCleanupRef = useRef<() => void>(() => undefined);
  const layerIdByElementRef = useRef(new WeakMap<HTMLElement, string>());
  const layerIdSequenceRef = useRef(0);
  const hoveredLayerElementRef = useRef<HTMLElement | null>(null);
  const lastSavedRef = useRef({
    name: initialTemplate.name,
    subject: initialTemplate.subject,
    html: initialTemplate.html,
  });
  const saveSequenceRef = useRef(0);
  const [name, setName] = useState(initialTemplate.name);
  const [subject, setSubject] = useState(initialTemplate.subject);
  const [html, setHtml] = useState(initialTemplate.html);
  const [previewHtml, setPreviewHtml] = useState(initialTemplate.html);
  const [sendHtml, setSendHtml] = useState(initialTemplate.html);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("edit");
  const [selected, setSelected] = useState<SelectedElement>();
  const [selectedLayerId, setSelectedLayerId] = useState<string>();
  const [layers, setLayers] = useState<LayerNode[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [elementContextMenu, setElementContextMenu] =
    useState<ElementContextMenu>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [previewWidth, setPreviewWidth] = useState(900);
  const [previewDocumentHeight, setPreviewDocumentHeight] = useState(0);
  const [previewResizing, setPreviewResizing] = useState(false);
  const previewResizeStartRef = useRef<{
    pointerX: number;
    width: number;
    maxWidth: number;
  } | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const templateSend = useTemplateSend({
    mailboxes,
    templateId: initialTemplate.id,
  });

  const save = useCallback(
    async (nextName: string, nextSubject: string, nextHtml: string) => {
      const sequence = ++saveSequenceRef.current;
      setSaveStatus("saving");
      const result = await saveTemplateAction({
        id: initialTemplate.id,
        name: nextName,
        subject: nextSubject,
        html: nextHtml,
      });
      if (sequence !== saveSequenceRef.current) return;
      if (!result.ok || !result.template) {
        setSaveStatus("error");
        return;
      }
      lastSavedRef.current = {
        name: result.template.name,
        subject: result.template.subject,
        html: result.template.html,
      };
      setSaveStatus("saved");
      return result.template;
    },
    [initialTemplate.id],
  );

  const handleLayerShortcut = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target;
    if (
      viewMode !== "preview" ||
      !(target instanceof HTMLElement) ||
      !target.closest("[data-editor-layer-row]") ||
      !selectedElementRef.current
    )
      return;
    if (isDeleteShortcut(event)) {
      event.preventDefault();
      removeSelected();
      return;
    }
    const direction = getArrowMove(event);
    if (!direction) return;
    event.preventDefault();
    moveSelected(direction);
  });

  useEffect(() => {
    const last = lastSavedRef.current;
    if (name === last.name && subject === last.subject && html === last.html)
      return;
    setSaveStatus("idle");
    const timeout = window.setTimeout(
      () => void save(name, subject, html),
      900,
    );
    return () => window.clearTimeout(timeout);
  }, [html, name, save, subject]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save(name, subject, html);
        return;
      }
      handleLayerShortcut(event);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [html, name, save, subject]);

  useEffect(() => {
    if (viewMode !== "preview" || previewResizing) return;
    const frame = window.requestAnimationFrame(() =>
      measurePreviewRef.current(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [html, previewResizing, previewWidth, viewMode]);

  function bindPreview() {
    const iframe = iframeRef.current;
    const document = iframe?.contentDocument;
    if (!document) return;
    inlineEditCleanupRef.current();
    editingElementRef.current = null;
    selectedElementRef.current = null;
    layerIdByElementRef.current = new WeakMap();
    layerIdSequenceRef.current = 0;
    setSelectedLayerId(undefined);
    setSelected(undefined);
    const style = document.createElement("style");
    style.dataset.editorStyle = "true";
    style.textContent = `html, body { overflow: hidden !important; scrollbar-width: none !important; -ms-overflow-style: none !important; } html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; } [data-template-selected="true"] { outline: 2px solid #635bff !important; outline-offset: 2px !important; cursor: default !important; } [data-template-hovered="true"]:not([data-template-selected="true"]) { outline: 1px dashed #635bff !important; outline-offset: 2px !important; } [data-template-editing="true"], [data-template-editing="true"] * { cursor: text !important; caret-color: #635bff !important; user-select: text !important; } body * { cursor: default; }`;
    document.head?.append(style);
    refreshLayers();

    const measurePreview = () => {
      if (iframeRef.current !== iframe || !document.body) return;
      iframe.style.height = "1px";
      const nextHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        1,
      );
      iframe.style.height = `${nextHeight}px`;
      setPreviewDocumentHeight(nextHeight);
    };
    measurePreviewRef.current = measurePreview;
    window.requestAnimationFrame(measurePreview);
    document.querySelectorAll("img").forEach((image) => {
      if (!image.complete)
        image.addEventListener("load", measurePreview, { once: true });
    });
    void document.fonts?.ready.then(measurePreview);

    document.addEventListener("click", (event) => {
      event.stopPropagation();
      setElementContextMenu(undefined);
      const target = event.target;
      if (
        !(target instanceof document.defaultView!.HTMLElement) ||
        target === document.body ||
        target === document.documentElement
      )
        return;
      if (editingElementRef.current?.contains(target)) return;
      event.preventDefault();
      selectElement(target as HTMLElement);
    });

    document.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target;
      if (!(target instanceof document.defaultView!.HTMLElement)) return;
      const editable = findEditableTextElement(target, document.body);
      if (!editable) return;
      beginInlineEditing(editable);
    });

    document.addEventListener("keydown", (event) => {
      if (editingElementRef.current) return;
      if (isDeleteShortcut(event) && selectedElementRef.current) {
        event.preventDefault();
        removeSelected();
        return;
      }
      const direction = getArrowMove(event);
      if (!direction) return;
      event.preventDefault();
      moveSelected(direction);
    });

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target;
      if (
        !(target instanceof document.defaultView!.HTMLElement) ||
        target === document.body ||
        target === document.documentElement
      )
        return;
      selectElement(target as HTMLElement);
      const iframeBounds = iframe.getBoundingClientRect();
      setElementContextMenu({
        position: {
          x: iframeBounds.left + event.clientX,
          y: iframeBounds.top + event.clientY,
        },
      });
    });
  }

  function selectElement(element: HTMLElement) {
    selectedElementRef.current?.removeAttribute("data-template-selected");
    selectedElementRef.current = element;
    element.dataset.templateSelected = "true";
    setSelectedLayerId(getLayerId(element));
    setSelected(readSelectedElement(element));
    setPropertiesOpen(true);
  }

  function clearElementSelection() {
    finishInlineEditing();
    selectedElementRef.current?.removeAttribute("data-template-selected");
    selectedElementRef.current = null;
    setSelectedLayerId(undefined);
    setSelected(undefined);
    setElementContextMenu(undefined);
  }

  function beginInlineEditing(element: HTMLElement) {
    if (editingElementRef.current === element) {
      element.focus({ preventScroll: true });
      return;
    }
    finishInlineEditing();
    selectElement(element);
    editingElementRef.current = element;
    editingOriginalTextRef.current = getDirectTextContent(element);
    element.setAttribute("contenteditable", "plaintext-only");
    element.dataset.templateEditing = "true";

    const handleInput = () => {
      setSelected(readSelectedElement(element));
      setHtml(serializePreview());
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDirectTextContent(element, editingOriginalTextRef.current);
        element.blur();
      } else if (event.key === "Enter") {
        event.preventDefault();
        element.blur();
      }
    };
    const handleBlur = () => finishInlineEditing();
    element.addEventListener("input", handleInput);
    element.addEventListener("keydown", handleKeyDown);
    element.addEventListener("blur", handleBlur);
    inlineEditCleanupRef.current = () => {
      element.removeEventListener("input", handleInput);
      element.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("blur", handleBlur);
    };

    element.focus({ preventScroll: true });
    placeCaretAtEnd(element);
  }

  function finishInlineEditing() {
    const element = editingElementRef.current;
    if (!element) return;
    inlineEditCleanupRef.current();
    inlineEditCleanupRef.current = () => undefined;
    element.removeAttribute("contenteditable");
    element.removeAttribute("data-template-editing");
    editingElementRef.current = null;
    setSelected(readSelectedElement(element));
    commitPreviewChanges();
  }

  function mutateSelected(mutator: (element: HTMLElement) => void) {
    const element = selectedElementRef.current;
    if (!element) return;
    mutator(element);
    setSelected(readSelectedElement(element));
    commitPreviewChanges();
  }

  function getLayerId(element: HTMLElement) {
    const existing = layerIdByElementRef.current.get(element);
    if (existing) return existing;
    const id = `layer-${++layerIdSequenceRef.current}`;
    layerIdByElementRef.current.set(element, id);
    return id;
  }

  function refreshLayers() {
    const body = iframeRef.current?.contentDocument?.body;
    if (!body) {
      setLayers([]);
      return;
    }
    setLayers(buildLayerTree(body, getLayerId));
  }

  function commitPreviewChanges() {
    setHtml(serializePreview());
    refreshLayers();
    window.requestAnimationFrame(() => measurePreviewRef.current());
  }

  function hoverLayer(node?: LayerNode) {
    hoveredLayerElementRef.current?.removeAttribute("data-template-hovered");
    hoveredLayerElementRef.current = node?.element ?? null;
    node?.element.setAttribute("data-template-hovered", "true");
  }

  function focusLayer(node: LayerNode) {
    selectElement(node.element);
    const canvas = previewCanvasRef.current;
    const iframe = iframeRef.current;
    if (!canvas || !iframe) return;
    const canvasBounds = canvas.getBoundingClientRect();
    const iframeBounds = iframe.getBoundingClientRect();
    const elementBounds = node.element.getBoundingClientRect();
    const elementCenter =
      iframeBounds.top -
      canvasBounds.top +
      canvas.scrollTop +
      elementBounds.top +
      elementBounds.height / 2;
    canvas.scrollTo({
      top: Math.max(0, elementCenter - canvas.clientHeight / 2),
      behavior: "smooth",
    });
  }

  function serializePreview() {
    const document = iframeRef.current?.contentDocument;
    if (!document) return html;
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelector("[data-editor-style]")?.remove();
    stripEditorAttributes(clone);
    return `<!doctype html>\n${clone.outerHTML}`;
  }

  function applySource() {
    selectedElementRef.current = null;
    setSelectedLayerId(undefined);
    setSelected(undefined);
    setPreviewHtml(html);
    setViewMode("preview");
  }

  async function enterSendMode() {
    finishInlineEditing();
    const nextHtml = viewMode === "preview" ? serializePreview() : html;
    const savedTemplate = await save(name, subject, nextHtml);
    if (!savedTemplate) return;

    clearElementSelection();
    setName(savedTemplate.name);
    setSubject(savedTemplate.subject);
    setHtml(savedTemplate.html);
    setPreviewHtml(savedTemplate.html);
    setSendHtml(savedTemplate.html);
    setWorkspaceMode("send");
  }

  function insertElement(
    kind: "text" | "button" | "image" | "divider" | "section",
  ) {
    const document = iframeRef.current?.contentDocument;
    if (!document?.body) return;
    const element = createElement(document, kind);
    const selectedElement = selectedElementRef.current;
    if (selectedElement?.parentElement)
      selectedElement.insertAdjacentElement("afterend", element);
    else document.body.append(element);
    selectElement(element);
    commitPreviewChanges();
  }

  function removeSelected() {
    const element = selectedElementRef.current;
    if (!element) return;
    element.remove();
    selectedElementRef.current = null;
    setSelectedLayerId(undefined);
    setSelected(undefined);
    commitPreviewChanges();
  }

  function duplicateSelected() {
    const element = selectedElementRef.current;
    if (!element) return;
    const duplicate = element.cloneNode(true) as HTMLElement;
    stripEditorAttributes(duplicate);
    element.insertAdjacentElement("afterend", duplicate);
    selectElement(duplicate);
    commitPreviewChanges();
  }

  function copySelected() {
    const element = selectedElementRef.current;
    if (!element) return;
    const copy = element.cloneNode(true) as HTMLElement;
    stripEditorAttributes(copy);
    void navigator.clipboard.writeText(copy.outerHTML);
  }

  function moveSelected(direction: "up" | "down") {
    const element = selectedElementRef.current;
    if (!element?.parentElement) return;
    if (direction === "up" && element.previousElementSibling)
      element.parentElement.insertBefore(
        element,
        element.previousElementSibling,
      );
    if (direction === "down" && element.nextElementSibling)
      element.parentElement.insertBefore(element.nextElementSibling, element);
    setSelected(readSelectedElement(element));
    commitPreviewChanges();
  }

  function beginPreviewResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const preview = event.currentTarget.parentElement?.parentElement;
    const canvas =
      event.currentTarget.closest<HTMLElement>("[data-preview-canvas]") ??
      previewCanvasRef.current;
    const canvasStyle = canvas ? window.getComputedStyle(canvas) : undefined;
    const horizontalPadding = canvasStyle
      ? Number.parseFloat(canvasStyle.paddingLeft) +
        Number.parseFloat(canvasStyle.paddingRight)
      : 0;
    const availableWidth = Math.max(
      320,
      (canvas?.clientWidth ?? 900) - horizontalPadding,
    );
    previewResizeStartRef.current = {
      pointerX: event.clientX,
      width: preview?.getBoundingClientRect().width ?? previewWidth,
      maxWidth: availableWidth,
    };
    setPreviewResizing(true);
  }

  function resizePreview(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = previewResizeStartRef.current;
    if (!start) return;

    const nextWidth = Math.round(
      Math.max(
        320,
        Math.min(
          start.maxWidth,
          start.width + (event.clientX - start.pointerX) * 2,
        ),
      ),
    );

    setPreviewWidth(nextWidth);
    setPreviewSize(nextWidth <= 480 ? "mobile" : "desktop");
  }

  function finishPreviewResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    previewResizeStartRef.current = null;
    setPreviewResizing(false);
  }

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 aria-hidden="true" className="size-3" />,
      onClick: removeSelected,
    },
    {
      id: "clone",
      label: "Clone",
      icon: <Copy aria-hidden="true" className="size-3" />,
      onClick: duplicateSelected,
    },
    {
      id: "copy",
      label: "Copy",
      icon: <Clipboard aria-hidden="true" className="size-3" />,
      onClick: copySelected,
      separator: true,
    },
    {
      id: "move-down",
      label: "Move down",
      icon: <ArrowDown aria-hidden="true" className="size-3" />,
      disabled: !selected?.canMoveDown,
      onClick: () => moveSelected("down"),
    },
    {
      id: "move-up",
      label: "Move up",
      icon: <ArrowUp aria-hidden="true" className="size-3" />,
      disabled: !selected?.canMoveUp,
      onClick: () => moveSelected("up"),
    },
  ];

  return (
    <main className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-bk-100 text-fg-50">
      <TopPane
        name={name}
        onNameChange={setName}
        saveStatus={saveStatus}
        sendDisabled={templateSend.sending || !templateSend.mailboxId}
        sending={templateSend.sending}
        workspaceMode={workspaceMode}
        viewMode={viewMode}
        previewSize={previewSize}
        hasSelection={Boolean(selected)}
        layersOpen={layersOpen}
        actions={{
          insert: insertElement,
          move: moveSelected,
          duplicate: duplicateSelected,
          delete: removeSelected,
          edit: () => setWorkspaceMode("edit"),
          previewAndSend: () => void enterSendMode(),
          applySource,
          selectPreviewSize: (size) => {
            setPreviewSize(size);
            setPreviewWidth(size === "desktop" ? 900 : 390);
          },
          selectView: (mode) => {
            if (mode === "preview") {
              setPreviewHtml(html);
            } else {
              setHtml(serializePreview());
            }
            setViewMode(mode);
          },
          toggleProperties: () => setPropertiesOpen((open) => !open),
          toggleLayers: () => {
            if (layersOpen) hoverLayer();
            setLayersOpen((open) => !open);
          },
        }}
      />

      {workspaceMode === "send" ? (
        <SendPreview
          controller={templateSend}
          html={sendHtml}
          mailboxes={mailboxes}
          name={name}
          subject={subject}
          onSubjectChange={setSubject}
          previewWidth={previewWidth}
          previewResizing={previewResizing}
          resizeHandlers={{
            onPointerDown: beginPreviewResize,
            onPointerMove: resizePreview,
            onPointerUp: finishPreviewResize,
            onPointerCancel: finishPreviewResize,
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {viewMode === "preview" && layersOpen ? (
            <LayersPanel
              nodes={layers}
              selectedId={selectedLayerId}
              onClose={() => {
                hoverLayer();
                setLayersOpen(false);
              }}
              onSelect={(node) => selectElement(node.element)}
              onFocus={focusLayer}
              onHover={hoverLayer}
              onContextMenu={(_node, position) =>
                setElementContextMenu({ position })
              }
            />
          ) : null}
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div
              data-preview-canvas
              ref={previewCanvasRef}
              onPointerDown={(event) => {
                if (
                  viewMode === "preview" &&
                  event.target === event.currentTarget
                ) {
                  clearElementSelection();
                }
              }}
              onScroll={() => setElementContextMenu(undefined)}
              className={cn(
                "min-h-0 flex-1 overflow-auto bg-bk-80",
                viewMode === "preview" && "px-3 sm:px-6",
              )}
            >
              {viewMode === "source" ? (
                <textarea
                  aria-label="Template HTML source"
                  spellCheck={false}
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  className="h-full w-full resize-none bg-bk-100 p-4 font-mono text-[11px] leading-5 text-fg-40 outline-none"
                />
              ) : (
                <div
                  style={{
                    width: previewWidth,
                    height: previewDocumentHeight || "100%",
                  }}
                  className={cn(
                    "relative mx-auto min-h-full max-w-full border-x border-bd-30 bg-white shadow-sm",
                    !previewResizing && "transition-[width]",
                  )}
                >
                  <PreviewResizeHandle
                    width={previewWidth}
                    resizing={previewResizing}
                    onPointerDown={beginPreviewResize}
                    onPointerMove={resizePreview}
                    onPointerUp={finishPreviewResize}
                    onPointerCancel={finishPreviewResize}
                  />
                  <iframe
                    key={previewHtml}
                    ref={iframeRef}
                    title={`Editing ${name}`}
                    sandbox="allow-same-origin"
                    referrerPolicy="no-referrer"
                    scrolling="no"
                    srcDoc={previewHtml}
                    onLoad={bindPreview}
                    className="block w-full border-0 bg-white"
                  />
                </div>
              )}
            </div>
          </section>

          {propertiesOpen ? (
            <button
              type="button"
              aria-label="Close properties"
              onClick={() => setPropertiesOpen(false)}
              className="fixed inset-0 z-30 bg-black/25 md:hidden"
            />
          ) : null}
          <aside
            className={cn(
              "relative z-40 flex w-[300px] shrink-0 flex-col border-l border-bd-30 bg-bk-90 transition-transform max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:shadow-xl",
              propertiesOpen
                ? "max-md:translate-x-0"
                : "max-md:translate-x-full",
            )}
          >
            <button
              type="button"
              aria-label="Close properties"
              onClick={() => setPropertiesOpen(false)}
              className="absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-md text-fg-70 hover:bg-bk-70 md:hidden"
            >
              ×
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 max-md:pt-11">
              <Field label="Email subject">
                <input
                  value={subject}
                  maxLength={998}
                  onChange={(event) => setSubject(event.target.value)}
                  className={inputClass}
                  placeholder="Subject line"
                />
              </Field>
              <div className="my-4 h-px bg-bd-30" />
              {selected ? (
                <Properties selected={selected} mutate={mutateSelected} />
              ) : (
                <div className="grid min-h-52 place-items-center text-center">
                  <div>
                    <MousePointer2 className="mx-auto size-5 text-fg-70" />
                    <p className="mt-2 text-[11px] text-fg-60">
                      Select an element in the email
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-fg-70">
                      Its content, colors, spacing, links, and sizing will
                      appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
          {elementContextMenu ? (
            <ContextMenu
              items={contextMenuItems}
              isOpen
              position={elementContextMenu.position}
              variant="elevated"
              onClose={() => setElementContextMenu(undefined)}
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
