import type { EmailFolder } from "@/lib/email/types";

export type HomeView = EmailFolder | "compose" | "drafts";
export type MailRouteView = Exclude<HomeView, "compose">;
export type ComposeRouteMode = "floating" | "drawer" | "full";

export const HOME_VIEWS = [
  "inbox",
  "starred",
  "sent",
  "drafts",
  "everything",
  "spam",
  "trash",
] as const satisfies readonly HomeView[];

export const HOME_THREAD_VIEWS = [
  "inbox",
  "starred",
  "sent",
  "everything",
  "spam",
  "trash",
] as const satisfies readonly HomeView[];

export const COMPOSE_ROUTE_MODES = [
  "floating",
  "drawer",
  "full",
] as const satisfies readonly ComposeRouteMode[];

const homeViewSet = new Set<string>(HOME_VIEWS);
const homeThreadViewSet = new Set<string>(HOME_THREAD_VIEWS);
const composeRouteModeSet = new Set<string>(COMPOSE_ROUTE_MODES);

export function isHomeView(value: string): value is HomeView {
  return homeViewSet.has(value);
}

export function isHomeThreadView(value: string): value is HomeView {
  return homeThreadViewSet.has(value);
}

export function isComposeRouteMode(
  value: string,
): value is ComposeRouteMode {
  return composeRouteModeSet.has(value);
}

export function getHomeViewPath(view: HomeView) {
  return `/${view}`;
}

export function getHomeThreadPath(view: HomeView, threadId: string) {
  return `/${view}/${threadId.replace(/^thread_/, "")}`;
}

export function withComposeSearch(
  path: string,
  mode?: ComposeRouteMode,
) {
  return mode ? `${path}?compose=1&mode=${mode}` : path;
}

export function getHomeRouteFromPath(pathname: string) {
  const [view, threadId] = pathname.split("/").filter(Boolean);
  const normalizedThreadId =
    threadId && /^[a-f0-9]{32}$/.test(threadId)
      ? `thread_${threadId}`
      : threadId;

  return {
    view: view && isHomeView(view) ? view : null,
    threadId:
      normalizedThreadId &&
      /^thread_[a-f0-9]{32}$/.test(normalizedThreadId)
        ? normalizedThreadId
        : undefined,
  };
}
