import {
  getMailboxFolderCounts,
  listEmailThreads as listMailboxThreads,
} from "@/lib/email/repository";
import { syncMailbox } from "@/lib/email/sync";
import type {
  EmailFolder,
  EmailReadFilter,
  EmailSearchFilters,
} from "@/lib/email/types";
import { getConnection } from "@/lib/connection/repository";
import { getMailbox } from "@/lib/mailbox/repository";
import { isAuthenticated } from "@/lib/server/auth";
import { isMailboxInActiveWorkspace } from "@/lib/server/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedFolder = url.searchParams.get("folder");
  const folder: EmailFolder =
    requestedFolder === "sent" ||
    requestedFolder === "starred" ||
    requestedFolder === "everything" ||
    requestedFolder === "spam" ||
    requestedFolder === "trash"
      ? requestedFolder
      : "inbox";
  const search = readTextParam(url, "q", 500);
  const mailboxId = readIdParam(url, "mailbox");
  const configuredMailbox = mailboxId
    ? await getMailbox(mailboxId)
    : undefined;
  if (configuredMailbox && !(await isMailboxInActiveWorkspace(configuredMailbox))) {
    return Response.json({ error: "Mailbox is outside the selected domain." }, { status: 403 });
  }
  const cursor = url.searchParams.get("cursor") || undefined;
  const syncMode = url.searchParams.get("sync");
  const readParam = url.searchParams.get("read");
  const read: EmailReadFilter =
    readParam === "read" || readParam === "unread"
      ? readParam
      : "all";
  const filters: EmailSearchFilters = {
    from: readTextParam(url, "from", 320),
    recipient: readTextParam(url, "recipient", 320),
    subject: readTextParam(url, "subject", 500),
    hasAttachments: url.searchParams.get("hasAttachments") === "true",
    read,
    after: readDateParam(url, "after"),
    before: readDateParam(url, "before"),
    scope:
      url.searchParams.get("scope") === "everything"
        ? "everything"
        : "current",
    timezoneOffset: readTimezoneOffset(url),
  };
  const syncFolder =
    filters.scope === "everything" ? "everything" : folder;
  const connection = configuredMailbox
    ? await getConnection(configuredMailbox.connectionId)
    : undefined;
  const webhookEnabled = Boolean(connection?.encryptedWebhookSecret);

  if (!configuredMailbox) {
    return Response.json(
      {
        folderCounts: { inbox: 0, spam: 0, starred: 0 },
        threads: [],
        nextCursor: null,
        webhookEnabled,
        synced: false,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const configuredMailboxEmail = configuredMailbox.email;
  const shouldSync =
    !cursor &&
    (syncMode === "force" || (syncMode !== "none" && !webhookEnabled));

  let warning: string | undefined;

  if (shouldSync) {
    try {
      if (syncFolder === "inbox") {
        await syncMailbox(configuredMailbox.connectionId, "inbound", configuredMailboxEmail);
      } else if (syncFolder === "sent") {
        await syncMailbox(configuredMailbox.connectionId, "outbound", configuredMailboxEmail);
      } else {
        await Promise.all([
          syncMailbox(configuredMailbox.connectionId, "inbound", configuredMailboxEmail),
          syncMailbox(configuredMailbox.connectionId, "outbound", configuredMailboxEmail),
        ]);
      }
    } catch (error) {
      console.error("Unable to synchronize Resend emails.", error);
      warning =
        "Resend synchronization failed. Check the server API key and receiving setup.";
    }
  }

  try {
    const page = await listMailboxThreads(
      configuredMailbox.connectionId,
      folder,
      search,
      cursor,
      filters,
      configuredMailboxEmail,
    );
    const folderCounts = await getMailboxFolderCounts(
      configuredMailbox.connectionId,
      configuredMailboxEmail,
    );

    return Response.json(
      {
        folderCounts,
        threads: page.threads,
        nextCursor: page.nextCursor,
        warning,
        webhookEnabled,
        synced: shouldSync,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email thread cursor is invalid."
    ) {
      return Response.json(
        { error: error.message },
        { status: 400 },
      );
    }

    console.error("Unable to load emails from the database.", error);

    return Response.json(
      { error: "The mailbox database is unavailable." },
      { status: 500 },
    );
  }
}

function readTextParam(url: URL, name: string, maxLength: number) {
  return (url.searchParams.get(name) ?? "").slice(0, maxLength);
}

function readIdParam(url: URL, name: string) {
  const value = readTextParam(url, name, 100).trim();
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value : undefined;
}

function readDateParam(url: URL, name: string) {
  const value = url.searchParams.get(name) ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : "";
}

function readTimezoneOffset(url: URL) {
  const value = Number(url.searchParams.get("timezoneOffset"));

  return Number.isInteger(value) && Math.abs(value) <= 840
    ? value
    : 0;
}
