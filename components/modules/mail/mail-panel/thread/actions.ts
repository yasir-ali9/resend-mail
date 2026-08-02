"use server";

import {
  applyEmailThreadBulkAction as applyEmailThreadBulkMutation,
  emptyTrash as emptyTrashRepository,
  markEmailThreadRead,
  moveEmailThreadToTrash,
  permanentlyDeleteEmailThreads,
  restoreEmailThread,
  setEmailThreadArchived,
  setEmailThreadSpam,
  setEmailThreadStarred,
} from "@/lib/email/repository";
import type {
  ActionResult,
  EmailThreadBulkAction,
} from "@/lib/email/types";
import { isAuthenticated } from "@/lib/server/auth";

export async function markEmailThreadReadAction(
  threadId: string,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!/^thread_[a-f0-9]{32}$/.test(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    await markEmailThreadRead(threadId);
    return { ok: true };
  } catch (error) {
    console.error("Unable to mark conversation as read.", error);
    return { ok: false, error: "Unable to update the conversation." };
  }
}

export async function markEmailThreadUnreadAction(
  threadId: string,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await applyEmailThreadBulkMutation(
      [threadId],
      "mark-unread",
    );

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation has no inbound messages." };
  } catch (error) {
    console.error("Unable to mark conversation as unread.", error);
    return { ok: false, error: "Unable to update the conversation." };
  }
}

export async function applyEmailThreadBulkAction(
  threadIds: string[],
  action: EmailThreadBulkAction,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!Array.isArray(threadIds) || typeof action !== "string") {
    return { ok: false, error: "Bulk action request is invalid." };
  }

  const uniqueThreadIds = [...new Set(threadIds)];
  const allowedActions = new Set<EmailThreadBulkAction>([
    "mark-read",
    "mark-unread",
    "star",
    "unstar",
    "archive",
    "move-inbox",
    "spam",
    "not-spam",
    "trash",
    "restore",
  ]);

  if (
    uniqueThreadIds.length === 0 ||
    uniqueThreadIds.length > 500 ||
    uniqueThreadIds.some((threadId) => !isValidThreadId(threadId)) ||
    !allowedActions.has(action)
  ) {
    return { ok: false, error: "Bulk action request is invalid." };
  }

  try {
    const updated = await applyEmailThreadBulkMutation(
      uniqueThreadIds,
      action,
    );

    return updated
      ? { ok: true }
      : { ok: false, error: "No matching conversations were updated." };
  } catch (error) {
    console.error("Unable to update conversations.", error);
    return { ok: false, error: "Unable to update the conversations." };
  }
}

export async function setEmailThreadStarredAction(
  threadId: string,
  starred: boolean,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await setEmailThreadStarred(threadId, starred);

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation not found." };
  } catch (error) {
    console.error("Unable to update conversation star.", error);
    return { ok: false, error: "Unable to update the conversation." };
  }
}

export async function setEmailThreadArchivedAction(
  threadId: string,
  archived: boolean,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await setEmailThreadArchived(threadId, archived);

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation not found." };
  } catch (error) {
    console.error("Unable to update conversation archive state.", error);
    return { ok: false, error: "Unable to update the conversation." };
  }
}

export async function setEmailThreadSpamAction(
  threadId: string,
  spam: boolean,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await setEmailThreadSpam(threadId, spam);

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation not found." };
  } catch (error) {
    console.error("Unable to update conversation spam state.", error);
    return { ok: false, error: "Unable to update the conversation." };
  }
}

export async function moveEmailThreadToTrashAction(
  threadId: string,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await moveEmailThreadToTrash(threadId);

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation not found." };
  } catch (error) {
    console.error("Unable to move conversation to trash.", error);
    return { ok: false, error: "Unable to move the conversation." };
  }
}

export async function restoreEmailThreadAction(
  threadId: string,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!isValidThreadId(threadId)) {
    return { ok: false, error: "Conversation ID is invalid." };
  }

  try {
    const updated = await restoreEmailThread(threadId);

    return updated
      ? { ok: true }
      : { ok: false, error: "Conversation not found." };
  } catch (error) {
    console.error("Unable to restore conversation.", error);
    return { ok: false, error: "Unable to restore the conversation." };
  }
}

export async function permanentlyDeleteEmailThreadsAction(
  threadIds: string[],
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!Array.isArray(threadIds)) {
    return { ok: false, error: "Delete request is invalid." };
  }

  const uniqueThreadIds = [...new Set(threadIds)];

  if (
    uniqueThreadIds.length === 0 ||
    uniqueThreadIds.length > 500 ||
    uniqueThreadIds.some((threadId) => !isValidThreadId(threadId))
  ) {
    return { ok: false, error: "Delete request is invalid." };
  }

  try {
    const deleted = await permanentlyDeleteEmailThreads(uniqueThreadIds);

    return deleted
      ? { ok: true }
      : { ok: false, error: "No trashed conversations were found." };
  } catch (error) {
    console.error("Unable to permanently delete conversations.", error);
    return {
      ok: false,
      error: "Unable to permanently delete the conversations.",
    };
  }
}

export async function emptyTrashAction(): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  try {
    await emptyTrashRepository();
    return { ok: true };
  } catch (error) {
    console.error("Unable to empty trash.", error);
    return { ok: false, error: "Unable to empty trash." };
  }
}

function isValidThreadId(threadId: string) {
  return /^thread_[a-f0-9]{32}$/.test(threadId);
}
