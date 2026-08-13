"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/reusables/logo";
import { deleteConnectionAction } from "@/components/modules/connection/actions";
import { useToast } from "@/components/reusables/toast";
import type { MailDraft } from "@/lib/draft/types";
import type { Connection, ConnectionDomain } from "@/lib/connection/types";
import type { MailboxFolderCounts } from "@/lib/email/types";
import type { Mailbox } from "@/lib/mailbox/types";
import type { TemplateSummary } from "@/lib/template/types";

import { LeftPanel } from "./left-panel";
import { AddMailboxModal } from "./left-panel/add";
import { selectMailboxAction } from "./left-panel/actions";
import { MailboxMenu } from "./left-panel/mailbox-menu";
import { ManageMailboxesModal } from "./left-panel/manage";
import { MailPanel } from "./mail-panel";
import { HeaderActions } from "./mail-panel/controls";
import { SettingsModal } from "./settings/modal";
import {
  type ComposeRouteMode,
  getHomeRouteFromPath,
  getHomeThreadPath,
  getHomeViewPath,
  isComposeRouteMode,
  type HomeView,
  withComposeSearch,
} from "./types";

interface MailPageProps {
  initialActiveView?: HomeView;
  initialThreadId?: string;
  initialDrafts: MailDraft[];
  initialMailboxes: Mailbox[];
  initialTemplates: TemplateSummary[];
  activeConnection: Connection;
  activeDomain: ConnectionDomain;
}

export function MailPage({
  initialActiveView = "inbox",
  initialThreadId,
  initialDrafts,
  initialMailboxes,
  initialTemplates,
  activeConnection,
  activeDomain,
}: MailPageProps) {
  const [activeView, setActiveView] =
    useState<HomeView>(initialActiveView);
  const [activeThreadId, setActiveThreadId] = useState(initialThreadId);
  const [composeMode, setComposeMode] =
    useState<ComposeRouteMode>();
  const isMobile = useIsMobile();
  const [folderCounts, setFolderCounts] = useState<MailboxFolderCounts>({
    inbox: 0,
    spam: 0,
    starred: 0,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mailboxModalOpen, setMailboxModalOpen] = useState(false);
  const [manageMailboxesOpen, setManageMailboxesOpen] = useState(false);
  const [mobileMailboxMenuOpen, setMobileMailboxMenuOpen] =
    useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drafts, setDrafts] = useState<MailDraft[]>(initialDrafts);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(initialMailboxes);
  const activeMailboxes = mailboxes.filter(
    (mailbox) =>
      mailbox.connectionId === activeConnection.id &&
      mailbox.domainId === activeDomain.id,
  );
  const [selectedMailboxId, setSelectedMailboxId] = useState(
    () =>
      initialMailboxes.find(
        (mailbox) =>
          mailbox.connectionId === activeConnection.id &&
          mailbox.domainId === activeDomain.id &&
          mailbox.isDefault,
      )?.id ??
      initialMailboxes.find(
        (mailbox) =>
          mailbox.connectionId === activeConnection.id &&
          mailbox.domainId === activeDomain.id,
      )?.id,
  );
  const selectedMailbox = mailboxes.find(
    (mailbox) => mailbox.id === selectedMailboxId,
  );
  const { toast } = useToast();

  useEffect(() => {
    function handlePopState() {
      const route = getHomeRouteFromPath(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode") ?? "";

      setActiveView(route.view ?? "inbox");
      setActiveThreadId(route.threadId);
      setComposeMode(
        params.get("compose") === "1" && isComposeRouteMode(mode)
          ? window.matchMedia("(max-width: 767px)").matches
            ? "full"
            : mode
          : undefined,
      );
    }

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isMobile || !composeMode || composeMode === "full") {
      return;
    }

    // Mobile layout changes promote an already-open compose surface.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComposeMode("full");
    const basePath = activeThreadId
      ? getHomeThreadPath(activeView, activeThreadId)
      : getHomeViewPath(activeView);
    const nextPath = withComposeSearch(basePath, "full");

    if (
      `${window.location.pathname}${window.location.search}` !== nextPath
    ) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [activeThreadId, activeView, composeMode, isMobile]);

  const handleViewChange = useCallback((view: HomeView) => {
    setMobileSidebarOpen(false);

    if (view === "compose") {
      const nextMode = isMobile ? "full" : "floating";
      setComposeMode(nextMode);

      const nextPath = withComposeSearch(
        window.location.pathname,
        nextMode,
      );
      if (
        `${window.location.pathname}${window.location.search}` !== nextPath
      ) {
        window.history.pushState(null, "", nextPath);
      }
      return;
    }

    setActiveView(view);
    setActiveThreadId(undefined);

    const nextPath = withComposeSearch(getHomeViewPath(view), composeMode);
    if (
      `${window.location.pathname}${window.location.search}` !== nextPath
    ) {
      window.history.pushState(null, "", nextPath);
    }
  }, [composeMode, isMobile]);

  const handleThreadOpen = useCallback(
    (threadId: string) => {
      setActiveThreadId(threadId);

      const nextPath = withComposeSearch(
        getHomeThreadPath(activeView, threadId),
        composeMode,
      );
      if (
        `${window.location.pathname}${window.location.search}` !== nextPath
      ) {
        window.history.pushState(null, "", nextPath);
      }
    },
    [activeView, composeMode],
  );

  const handleThreadClose = useCallback(() => {
    setActiveThreadId(undefined);

    const nextPath = withComposeSearch(
      getHomeViewPath(activeView),
      composeMode,
    );
    if (
      `${window.location.pathname}${window.location.search}` !== nextPath
    ) {
      window.history.pushState(null, "", nextPath);
    }
  }, [activeView, composeMode]);

  const handleComposeModeChange = useCallback(
    (mode: ComposeRouteMode) => {
      const nextMode = isMobile ? "full" : mode;
      setComposeMode(nextMode);

      const basePath = activeThreadId
        ? getHomeThreadPath(activeView, activeThreadId)
        : getHomeViewPath(activeView);
      const nextPath = withComposeSearch(basePath, nextMode);
      if (
        `${window.location.pathname}${window.location.search}` !== nextPath
      ) {
        window.history.pushState(null, "", nextPath);
      }
    },
    [activeThreadId, activeView, isMobile],
  );

  const handleComposeClose = useCallback(() => {
    setComposeMode(undefined);

    const nextPath = activeThreadId
      ? getHomeThreadPath(activeView, activeThreadId)
      : getHomeViewPath(activeView);
    if (
      `${window.location.pathname}${window.location.search}` !== nextPath
    ) {
      window.history.pushState(null, "", nextPath);
    }
  }, [activeThreadId, activeView]);

  function handleMailboxCreated(mailbox: Mailbox) {
    setMailboxes((currentMailboxes) => [
      mailbox,
      ...currentMailboxes.map((currentMailbox) => ({
        ...currentMailbox,
        isDefault:
          currentMailbox.connectionId === mailbox.connectionId
            ? false
            : currentMailbox.isDefault,
      })),
    ]);
    setSelectedMailboxId(mailbox.id);
    clearActiveThreadRoute();
    setMailboxModalOpen(false);
  }

  function handleMailboxSelect(mailbox: Mailbox) {
    if (mailbox.id !== selectedMailboxId) {
      clearActiveThreadRoute();
    }

    setMailboxes((currentMailboxes) =>
      currentMailboxes.map((currentMailbox) => ({
        ...currentMailbox,
        isDefault:
          currentMailbox.connectionId === mailbox.connectionId
            ? currentMailbox.id === mailbox.id
            : currentMailbox.isDefault,
      })),
    );
    setSelectedMailboxId(mailbox.id);
  }

  async function handleMobileMailboxSelect(mailbox: Mailbox) {
    const previousMailbox = selectedMailbox;
    handleMailboxSelect(mailbox);
    setMobileMailboxMenuOpen(false);

    const result = await selectMailboxAction(mailbox.id);

    if (!result.ok) {
      if (previousMailbox) {
        handleMailboxSelect(previousMailbox);
      }
      toast(result.error || "Unable to switch mailbox.", "error");
    }
  }

  async function handleDisconnectAccount() {
    if (
      !window.confirm(
        `Disconnect ${activeConnection.label}? This permanently removes its locally stored mailboxes and email history.`,
      )
    ) {
      return;
    }
    const result = await deleteConnectionAction(activeConnection.id);
    if (!result.ok) {
      toast(result.error ?? "Unable to disconnect this account.", "error");
      return;
    }
    window.location.assign("/setup/account");
  }

  function handleMailboxUpdated(mailbox: Mailbox) {
    setMailboxes((currentMailboxes) =>
      currentMailboxes.map((currentMailbox) =>
        currentMailbox.id === mailbox.id ? mailbox : currentMailbox,
      ),
    );
  }

  function handleMailboxDeleted(
    deletedMailboxId: string,
    nextSelectedMailbox?: Mailbox,
  ) {
    setDrafts((currentDrafts) =>
      currentDrafts.filter(
        (draft) => draft.mailboxId !== deletedMailboxId,
      ),
    );
    setMailboxes((currentMailboxes) =>
      currentMailboxes
        .filter((mailbox) => mailbox.id !== deletedMailboxId)
        .map((mailbox) => ({
          ...mailbox,
          isDefault:
            mailbox.connectionId === nextSelectedMailbox?.connectionId
              ? mailbox.id === nextSelectedMailbox.id
              : mailbox.isDefault,
        })),
    );

    if (nextSelectedMailbox) {
      setSelectedMailboxId(nextSelectedMailbox.id);
      clearActiveThreadRoute();
    }
  }

  function clearActiveThreadRoute() {
    if (!activeThreadId) {
      return;
    }

    setActiveThreadId(undefined);
    const nextPath = withComposeSearch(
      getHomeViewPath(activeView),
      composeMode,
    );

    if (
      `${window.location.pathname}${window.location.search}` !== nextPath
    ) {
      window.history.replaceState(null, "", nextPath);
    }
  }

  const handleDraftUpsert = useCallback((draft: MailDraft) => {
    setDrafts((currentDrafts) =>
      [
        draft,
        ...currentDrafts.filter(
          (currentDraft) => currentDraft.id !== draft.id,
        ),
      ].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      ),
    );
  }, []);

  const handleDraftDeleted = useCallback((draftId: string) => {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
  }, []);

  return (
    <>
      <main className="flex h-dvh min-h-[480px] flex-col overflow-hidden bg-bk-100 text-fg-50 md:flex-row">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-bd-30 bg-bk-90 px-1 md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open mailbox navigation"
              onClick={() => setMobileSidebarOpen(true)}
              className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
            >
              <Menu aria-hidden="true" className="size-3.5" />
            </button>
            <span className="grid size-7 shrink-0 place-items-center text-fg-50">
              <Logo className="size-7 -translate-x-0.5" />
            </span>
            <span className="truncate text-[12px] font-medium text-fg-30">
              Resend Mail
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <HeaderActions
              className="flex"
              onSettingsOpen={() => setSettingsOpen(true)}
            />
            <MailboxMenu
              activeConnection={activeConnection}
              activeDomain={activeDomain}
              mailboxes={activeMailboxes}
              open={mobileMailboxMenuOpen}
              placement="bottom-right"
              selectedMailbox={selectedMailbox}
              variant="icon"
              onAdd={() => {
                setMobileMailboxMenuOpen(false);
                setMailboxModalOpen(true);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setMobileMailboxMenuOpen(false);
                }
              }}
              onManage={() => {
                setMobileMailboxMenuOpen(false);
                setManageMailboxesOpen(true);
              }}
              onDisconnect={() => void handleDisconnectAccount()}
              onSelect={(mailbox) => void handleMobileMailboxSelect(mailbox)}
              onToggle={() => setMobileMailboxMenuOpen((open) => !open)}
            />
          </div>
        </header>
        <LeftPanel
          activeView={activeView}
          collapsed={sidebarCollapsed}
          composeOpen={Boolean(composeMode)}
          draftCount={
            selectedMailbox
              ? drafts.filter(
                  (draft) => draft.mailboxId === selectedMailbox.id,
                ).length
              : 0
          }
          folderCounts={folderCounts}
          activeConnection={activeConnection}
          activeDomain={activeDomain}
          mailboxes={activeMailboxes}
          selectedMailbox={selectedMailbox}
          onAddMailboxRequested={() => setMailboxModalOpen(true)}
          onDisconnectAccount={() => void handleDisconnectAccount()}
          onMailboxDeleted={handleMailboxDeleted}
          onMailboxSelect={handleMailboxSelect}
          onMailboxUpdated={handleMailboxUpdated}
          onSidebarToggle={() =>
            setSidebarCollapsed((collapsed) => !collapsed)
          }
          onViewChange={handleViewChange}
        />
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <MailPanel
            activeView={activeView}
            activeThreadId={activeThreadId}
            composeMode={composeMode}
            drafts={drafts}
            templates={initialTemplates}
            selectedMailbox={selectedMailbox}
            onDraftDeleted={handleDraftDeleted}
            onDraftUpsert={handleDraftUpsert}
            onFolderCountsChange={setFolderCounts}
            onSettingsOpen={() => setSettingsOpen(true)}
            onComposeClose={handleComposeClose}
            onComposeModeChange={handleComposeModeChange}
            onThreadClose={handleThreadClose}
            onThreadOpen={handleThreadOpen}
            onViewChange={handleViewChange}
          />
        </div>
      </main>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close mailbox navigation"
            className="absolute inset-0 cursor-default bg-black/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(280px,calc(100vw-40px))] bg-bk-90 shadow-xl">
            <LeftPanel
              activeView={activeView}
              composeOpen={Boolean(composeMode)}
              draftCount={
                selectedMailbox
                  ? drafts.filter(
                      (draft) => draft.mailboxId === selectedMailbox.id,
                    ).length
                  : 0
              }
              folderCounts={folderCounts}
              activeConnection={activeConnection}
              activeDomain={activeDomain}
              mailboxes={activeMailboxes}
              mobile
              selectedMailbox={selectedMailbox}
              onAddMailboxRequested={() => {
                setMobileSidebarOpen(false);
                setMailboxModalOpen(true);
              }}
              onDisconnectAccount={() => void handleDisconnectAccount()}
              onMailboxDeleted={handleMailboxDeleted}
              onMailboxSelect={handleMailboxSelect}
              onMailboxUpdated={handleMailboxUpdated}
              onMobileClose={() => setMobileSidebarOpen(false)}
              onSidebarToggle={() =>
                setSidebarCollapsed((collapsed) => !collapsed)
              }
              onViewChange={handleViewChange}
            />
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          open
          mailboxes={activeMailboxes}
          selectedMailbox={selectedMailbox}
          onAddMailboxRequested={() => setMailboxModalOpen(true)}
          onOpenChange={setSettingsOpen}
          onMailboxUpdated={handleMailboxUpdated}
        />
      ) : null}

      <AddMailboxModal
        open={mailboxModalOpen}
        connection={activeConnection}
        domain={activeDomain}
        onOpenChange={setMailboxModalOpen}
        onCreated={handleMailboxCreated}
      />

      <ManageMailboxesModal
        open={manageMailboxesOpen}
        mailboxes={activeMailboxes}
        onOpenChange={setManageMailboxesOpen}
        onAddRequested={() => {
          setManageMailboxesOpen(false);
          setMailboxModalOpen(true);
        }}
        onMailboxDeleted={handleMailboxDeleted}
        onMailboxUpdated={handleMailboxUpdated}
      />
    </>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    function handleChange() {
      setIsMobile(mediaQuery.matches);
    }

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}
