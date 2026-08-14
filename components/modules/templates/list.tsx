"use client";

import {
  Copy,
  FilePlus2,
  FileUp,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import {
  ContextMenu,
  type ContextMenuItem,
} from "@/components/reusables/context-menu";
import { Button } from "@/components/reusables/button";
import { useToast } from "@/components/reusables/toast";
import { builtInTemplate } from "@/lib/template/built-in";
import type { TemplateSummary } from "@/lib/template/types";
import { cn } from "@/lib/utils";

import {
  cloneBuiltInTemplateAction,
  cloneTemplateAction,
  createBlankTemplateAction,
  deleteTemplateAction,
  importHtmlTemplateAction,
} from "./actions";

const MAX_IMPORT_SIZE = 2_000_000;

interface TemplateMenu {
  items: ContextMenuItem[];
  position: { x: number; y: number };
}

interface TemplateCardData {
  id: string;
  html: string;
  name: string;
  subline: string;
  builtIn?: boolean;
  template?: TemplateSummary;
}

type TemplateCategory = "both" | "yours" | "built-for-you";

export function TemplatesPanel({
  initialTemplates,
}: {
  initialTemplates: TemplateSummary[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [category, setCategory] = useState<TemplateCategory>("both");
  const [busyId, setBusyId] = useState<string>();
  const [contextMenu, setContextMenu] = useState<TemplateMenu>();
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function createBlank() {
    setBusyId("new");
    const result = await createBlankTemplateAction();
    if (result.ok && result.template) {
      window.location.assign(`/edit/${result.template.id}`);
      return;
    }
    toast(result.error || "Unable to create a template.", "error");
    setBusyId(undefined);
  }

  async function importHtml(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      toast("Choose an HTML file (.html or .htm).", "error");
      return;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      toast("The HTML file must be smaller than 2 MB.", "error");
      return;
    }

    setBusyId("import");
    try {
      const html = await file.text();
      if (!html.trim()) {
        toast("The selected HTML file is empty.", "error");
        return;
      }

      const result = await importHtmlTemplateAction({
        fileName: file.name,
        html,
      });
      if (result.ok && result.template) {
        window.location.assign(`/edit/${result.template.id}`);
        return;
      }
      toast(result.error || "Unable to import the template.", "error");
    } catch {
      toast("Unable to read or import the HTML file.", "error");
    } finally {
      setBusyId(undefined);
    }
  }

  async function cloneBuiltIn() {
    setBusyId(builtInTemplate.id);
    const result = await cloneBuiltInTemplateAction(builtInTemplate.id);
    if (result.ok && result.template) {
      window.location.assign(`/edit/${result.template.id}`);
      return;
    }
    toast(result.error || "Unable to clone the template.", "error");
    setBusyId(undefined);
  }

  async function duplicate(id: string) {
    setBusyId(id);
    const result = await cloneTemplateAction(id);
    if (result.ok && result.template) {
      window.location.assign(`/edit/${result.template.id}`);
      return;
    }
    toast(result.error || "Unable to duplicate the template.", "error");
    setBusyId(undefined);
  }

  async function remove(template: TemplateSummary) {
    if (!window.confirm(`Delete “${template.name}”? This cannot be undone.`)) {
      return;
    }

    setBusyId(template.id);
    const result = await deleteTemplateAction(template.id);
    if (result.ok) {
      setTemplates((current) =>
        current.filter(({ id }) => id !== template.id),
      );
      toast("Template deleted.", "success");
    } else {
      toast(result.error || "Unable to delete the template.", "error");
    }
    setBusyId(undefined);
  }

  function getMenuItems(card: TemplateCardData): ContextMenuItem[] {
      if (card.builtIn) {
        return [
          {
            id: "clone",
            label: "Clone template",
            icon: <Copy aria-hidden="true" className="size-3" />,
            disabled: Boolean(busyId),
            onClick: () => void cloneBuiltIn(),
          },
        ];
      }

      const template = card.template;
      if (!template) return [];

      return [
        {
          id: "edit",
          label: "Edit template",
          icon: <Pencil aria-hidden="true" className="size-3" />,
          onClick: () => window.location.assign(`/edit/${template.id}`),
        },
        {
          id: "duplicate",
          label: "Duplicate template",
          icon: <Copy aria-hidden="true" className="size-3" />,
          disabled: Boolean(busyId),
          onClick: () => void duplicate(template.id),
          separator: true,
        },
        {
          id: "delete",
          label: "Delete template",
          icon: <Trash2 aria-hidden="true" className="size-3" />,
          disabled: Boolean(busyId),
          onClick: () => void remove(template),
        },
      ];
  }

  function showContextMenu(
    card: TemplateCardData,
    event: MouseEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      items: getMenuItems(card),
      position: { x: event.clientX, y: event.clientY },
    });
  }

  const yourCards: TemplateCardData[] = templates.map((template) => ({
      id: template.id,
      html: template.html,
      name: template.name,
      subline: formatRelativeEdit(template.updatedAt),
      template,
    }));
  const builtForYouCards: TemplateCardData[] = [
    {
      id: builtInTemplate.id,
      html: builtInTemplate.html,
      name: builtInTemplate.name,
      subline: "Built-in sample",
      builtIn: true,
    },
  ];
  const sections = [
    ...(category === "both" || category === "yours"
      ? [{ id: "yours", title: "Your templates", cards: yourCards }]
      : []),
    ...(category === "both" || category === "built-for-you"
      ? [
          {
            id: "built-for-you",
            title: "Built for you",
            cards: builtForYouCards,
          },
        ]
      : []),
  ];

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bk-100">
      <header className="flex min-h-12 shrink-0 items-center gap-3 px-3 sm:px-4">
        <div
          role="tablist"
          aria-label="Template categories"
          className="flex min-w-0 flex-1 items-center gap-0.5"
        >
          <CategoryTab
            active={category === "both"}
            label="Both"
            onClick={() => setCategory("both")}
          />
          <CategoryTab
            active={category === "yours"}
            label="Your templates"
            onClick={() => setCategory("yours")}
          />
          <CategoryTab
            active={category === "built-for-you"}
            label="Built for you"
            onClick={() => setCategory("built-for-you")}
          />
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="sr-only"
          disabled={Boolean(busyId)}
          onChange={(event) => void importHtml(event)}
        />
        <Button
          type="button"
          aria-label="Import HTML template"
          size="sm"
          variant="secondary"
          onClick={() => importInputRef.current?.click()}
          disabled={Boolean(busyId)}
          className="gap-1.5"
        >
          {busyId === "import" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 animate-spin"
            />
          ) : (
            <FileUp aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden sm:inline">Import HTML</span>
        </Button>
        <Button
          type="button"
          aria-label="New template"
          size="sm"
          onClick={() => void createBlank()}
          disabled={Boolean(busyId)}
          className="gap-1.5"
        >
          {busyId === "new" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 animate-spin"
            />
          ) : (
            <FilePlus2 aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden sm:inline">New template</span>
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
        {sections.map((section, index) => (
          <section key={section.id} className={cn(index > 0 && "mt-9")}>
            <h2 className="mb-3 px-0.5 text-[11px] font-medium text-fg-60">
              {section.title}
            </h2>
            {section.cards.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-x-4 gap-y-7">
                {section.cards.map((card) => (
                  <TemplateCard
                    key={card.id}
                    card={card}
                    busy={busyId === card.id}
                    onContextMenu={(event) => showContextMenu(card, event)}
                    onOpen={() => {
                      if (card.builtIn) {
                        void cloneBuiltIn();
                      } else {
                        window.location.assign(`/edit/${card.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-bd-30/70 text-center">
                <div>
                  <p className="text-[12px] font-medium text-fg-50">
                    No templates yet
                  </p>
                  <p className="mt-1 text-[10px] text-fg-70">
                    Create a new template or clone one from Built for you.
                  </p>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {contextMenu ? (
        <ContextMenu
          items={contextMenu.items}
          isOpen
          position={contextMenu.position}
          variant="elevated"
          onClose={() => setContextMenu(undefined)}
        />
      ) : null}
    </section>
  );
}

function CategoryTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-7 cursor-pointer whitespace-nowrap rounded-md px-2.5 text-[10px] font-medium transition-colors focus-visible:ring-1 focus-visible:ring-ac-02",
        active
          ? "bg-bk-70 text-fg-30"
          : "text-fg-70 hover:bg-bk-80 hover:text-fg-40",
      )}
    >
      {label}
    </button>
  );
}

function TemplateCard({
  busy,
  card,
  onContextMenu,
  onOpen,
}: {
  busy: boolean;
  card: TemplateCardData;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onOpen: () => void;
}) {
  const [previewActive, setPreviewActive] = useState(false);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${card.name}. ${card.subline}`}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPreviewActive(true)}
      onMouseLeave={() => setPreviewActive(false)}
      className={cn(
        "group relative min-w-0 cursor-pointer rounded-xl border border-bd-30/60 bg-bk-90 p-1 outline-none focus-visible:ring-1 focus-visible:ring-ac-02",
        busy && "pointer-events-none opacity-70",
      )}
    >
      <div className="relative aspect-[6/5] overflow-hidden rounded-lg bg-white">
        <TemplatePreview
          active={previewActive}
          html={card.html}
          name={card.name}
        />
        <div className="pointer-events-none absolute inset-0 bg-transparent transition-colors group-hover:bg-black/[0.02]" />
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-black/15">
            <LoaderCircle
              aria-label="Working"
              className="size-5 animate-spin text-white"
            />
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0 px-2 pt-2.5 pr-8 pb-1.5">
        <h2 className="truncate text-[12px] font-medium text-fg-40">
          {card.name}
        </h2>
        <p className="mt-0.5 truncate text-[10px] text-fg-70">
          {card.subline}
        </p>
        <button
          type="button"
          aria-label={`Open ${card.name} menu`}
          onClick={(event) => onContextMenu(event)}
          className="absolute top-1.5 right-0 grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 opacity-100 transition-colors hover:bg-bk-80 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <MoreHorizontal aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

function TemplatePreview({
  active,
  html,
  name,
}: {
  active: boolean;
  html: string;
  name: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  function handleLoad() {
    stopAnimation();

    const iframeWindow = iframeRef.current?.contentWindow;
    const document = iframeRef.current?.contentDocument;
    if (!iframeWindow || !document) return;
    const previewWindow = iframeWindow;
    const previewDocument = document;

    const previewStyle = previewDocument.createElement("style");
    previewStyle.textContent = `
      html, body {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
    previewDocument.head?.append(previewStyle);
    previewWindow.scrollTo(0, 0);
    setLoaded(true);
  }

  useEffect(() => {
    stopAnimation();

    const previewWindow = iframeRef.current?.contentWindow;
    const previewDocument = iframeRef.current?.contentDocument;
    if (!loaded || !previewWindow || !previewDocument) return;
    const frameWindow = previewWindow;

    if (!active) {
      frameWindow.scrollTo(0, 0);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const documentHeight = Math.max(
      previewDocument.documentElement.scrollHeight,
      previewDocument.body?.scrollHeight ?? 0,
    );
    const maximumScroll = Math.max(
      0,
      documentHeight - frameWindow.innerHeight,
    );
    if (maximumScroll < 12) return;

    frameWindow.scrollTo(0, 0);
    const remainingDistance = maximumScroll;
    const startedAt = performance.now();
    const duration = Math.max(
      1_500,
      Math.min(6_000, remainingDistance * 9),
    );

    function step(timestamp: number) {
      const progress = Math.min(1, (timestamp - startedAt) / duration);

      frameWindow.scrollTo(0, remainingDistance * progress);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step);
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(step);

    return stopAnimation;
  }, [active, loaded, stopAnimation]);

  return (
    <iframe
      ref={iframeRef}
      title={`${name} preview`}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      scrolling="no"
      srcDoc={html}
      onLoad={handleLoad}
      className="pointer-events-none absolute top-0 left-0 h-[238.1%] w-[238.1%] origin-top-left scale-[0.42] border-0 bg-white"
    />
  );
}

function formatRelativeEdit(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "Edited just now";
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return `Edited ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return `Edited ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(elapsed / day);
  return `Edited ${days} ${days === 1 ? "day" : "days"} ago`;
}
