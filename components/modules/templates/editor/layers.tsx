"use client";

import {
  Box,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Link2,
  LocateFixed,
  Minus,
  Rows3,
  Table2,
  Type,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

import { countLayers } from "./layer-tree";
import type { LayerNode } from "./types";

const MAX_LAYER_INDENT = 12;
const MIN_LAYER_INDENT = 1;
const LAYER_ROW_RESERVED_WIDTH = 130;

interface LayersPanelProps {
  nodes: LayerNode[];
  onClose: () => void;
  onContextMenu: (node: LayerNode, position: { x: number; y: number }) => void;
  onFocus: (node: LayerNode) => void;
  onHover: (node?: LayerNode) => void;
  onSelect: (node: LayerNode) => void;
  selectedId?: string;
}

export function LayersPanel({
  nodes,
  onClose,
  onContextMenu,
  onFocus,
  onHover,
  onSelect,
  selectedId,
}: LayersPanelProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [treeWidth, setTreeWidth] = useState(232);
  const count = useMemo(() => countLayers(nodes), [nodes]);
  const visibleCollapsed = useMemo(() => {
    if (!selectedId) return collapsed;
    const ancestors = new Set(findAncestors(nodes, selectedId));
    if (!ancestors.size) return collapsed;
    return new Set(Array.from(collapsed).filter((id) => !ancestors.has(id)));
  }, [collapsed, nodes, selectedId]);
  const maxVisibleDepth = useMemo(
    () => getMaxVisibleDepth(nodes, visibleCollapsed),
    [nodes, visibleCollapsed],
  );
  const indent = useMemo(() => {
    if (!maxVisibleDepth) return MAX_LAYER_INDENT;

    const availableWidth = Math.max(0, treeWidth - LAYER_ROW_RESERVED_WIDTH);
    return Math.min(
      MAX_LAYER_INDENT,
      Math.max(MIN_LAYER_INDENT, availableWidth / maxVisibleDepth),
    );
  }, [maxVisibleDepth, treeWidth]);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;

    const updateWidth = () => {
      const nextWidth = Math.round(tree.getBoundingClientRect().width);
      setTreeWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tree);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const tree = treeRef.current;
    tree
      ?.querySelector<HTMLElement>(`[data-layer-id="${selectedId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (tree) tree.scrollLeft = 0;
  }, [nodes, selectedId, visibleCollapsed]);

  function toggle(nodeId: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <aside className="relative z-30 flex h-full w-[232px] shrink-0 flex-col border-r border-bd-30 bg-bk-90 max-md:fixed max-md:inset-y-12 max-md:left-0 max-md:shadow-xl">
      <div className="flex h-10 shrink-0 items-center px-3">
        <span className="text-[11px] font-medium text-fg-50">Layers</span>
        <span className="ml-2 text-[10px] tabular-nums text-fg-70">
          {count}
        </span>
        <button
          type="button"
          aria-label="Close layers"
          onClick={onClose}
          className="ml-auto grid size-6 place-items-center rounded-md text-fg-70 hover:bg-bk-70 hover:text-fg-40"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div
        ref={treeRef}
        role="tree"
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-1"
        onMouseLeave={() => onHover()}
      >
        {nodes.length ? (
          nodes.map((node) => (
            <LayerBranch
              key={node.id}
              node={node}
              depth={0}
              indent={indent}
              collapsed={visibleCollapsed}
              selectedId={selectedId}
              onToggle={toggle}
              onSelect={onSelect}
              onFocus={onFocus}
              onHover={onHover}
              onContextMenu={onContextMenu}
            />
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <Box className="mx-auto size-5 text-fg-70" />
            <p className="mt-2 text-[11px] text-fg-60">No email layers</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function LayerBranch({
  node,
  depth,
  indent,
  collapsed,
  selectedId,
  onToggle,
  onSelect,
  onFocus,
  onHover,
  onContextMenu,
}: {
  node: LayerNode;
  depth: number;
  indent: number;
  collapsed: Set<string>;
  selectedId?: string;
  onToggle: (id: string) => void;
  onSelect: (node: LayerNode) => void;
  onFocus: (node: LayerNode) => void;
  onHover: (node?: LayerNode) => void;
  onContextMenu: LayersPanelProps["onContextMenu"];
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const selected = selectedId === node.id;

  function openMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    onSelect(node);
    onContextMenu(node, { x: event.clientX, y: event.clientY });
  }

  return (
    <>
      <div
        role="treeitem"
        tabIndex={0}
        data-editor-layer-row="true"
        data-layer-id={node.id}
        aria-selected={selected}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        onClick={() => onSelect(node)}
        onDoubleClick={() => onFocus(node)}
        onContextMenu={openMenu}
        onMouseEnter={() => onHover(node)}
        title={node.label}
        className={cn(
          "group flex h-7 w-full min-w-0 cursor-default items-center overflow-hidden pr-2 text-[11px] text-fg-60 hover:bg-bk-70 hover:text-fg-40",
          selected && "bg-bk-60 text-fg-30 hover:bg-bk-60",
        )}
        style={{ paddingLeft: 6 + depth * indent }}
      >
        <button
          type="button"
          aria-label={isCollapsed ? "Expand layer" : "Collapse layer"}
          disabled={!hasChildren}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node.id);
          }}
          className="grid size-5 shrink-0 place-items-center text-fg-70 disabled:invisible"
        >
          {isCollapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>
        <span className="mr-1.5 grid size-4 shrink-0 place-items-center text-fg-60">
          <LayerIcon tagName={node.tagName} />
        </span>
        <span className="min-w-0 flex-1 truncate select-none">
          {node.label}
        </span>
        <button
          type="button"
          aria-label={`Focus ${node.label}`}
          title="Focus layer"
          onClick={(event) => {
            event.stopPropagation();
            onFocus(node);
          }}
          className="ml-1 hidden size-5 shrink-0 place-items-center rounded text-fg-70 hover:text-fg-40 group-hover:grid"
        >
          <LocateFixed className="size-3" />
        </button>
      </div>
      {hasChildren && !isCollapsed
        ? node.children.map((child) => (
            <LayerBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              indent={indent}
              collapsed={collapsed}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
              onHover={onHover}
              onContextMenu={onContextMenu}
            />
          ))
        : null}
    </>
  );
}

function LayerIcon({ tagName }: { tagName: string }) {
  const className = "size-3.5";
  if (tagName === "IMG") return <ImageIcon className={className} />;
  if (tagName === "A" || tagName === "BUTTON")
    return <Link2 className={className} />;
  if (tagName === "HR") return <Minus className={className} />;
  if (tagName === "TABLE") return <Table2 className={className} />;
  if (tagName === "TR" || tagName === "TBODY")
    return <Rows3 className={className} />;
  if (/^H[1-6]$/.test(tagName) || tagName === "P" || tagName === "SPAN")
    return <Type className={className} />;
  return <Box className={className} />;
}

function findAncestors(
  nodes: LayerNode[],
  selectedId: string,
  path: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.id === selectedId) return path;
    const found = findAncestors(node.children, selectedId, [...path, node.id]);
    if (found.length) return found;
  }
  return [];
}

function getMaxVisibleDepth(
  nodes: LayerNode[],
  collapsed: Set<string>,
  depth = 0,
): number {
  let maxDepth = depth;

  for (const node of nodes) {
    if (!collapsed.has(node.id) && node.children.length) {
      maxDepth = Math.max(
        maxDepth,
        getMaxVisibleDepth(node.children, collapsed, depth + 1),
      );
    }
  }

  return maxDepth;
}
