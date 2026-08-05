"use server";

import {
  createMailbox,
  deleteMailbox,
  selectMailbox,
  updateMailbox,
  getMailbox,
} from "@/lib/mailbox/repository";
import { getSession, isAuthenticated } from "@/lib/server/auth";
import type {
  DeleteMailboxActionResult,
  MailboxActionResult,
} from "@/lib/mailbox/types";
import { isMailboxInActiveWorkspace } from "@/lib/server/workspace";
import { verifyMailbox } from "@/lib/mailbox/verification";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createMailboxAction(input: {
  name: string;
  email: string;
  domainId: string;
}): Promise<MailboxActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const validated = validateMailbox(input);

  if ("error" in validated) {
    return { ok: false, error: validated.error };
  }

  try {
    const session = await getSession();
    if (
      !session?.connectionId ||
      session.domainId !== input.domainId
    ) {
      return { ok: false, error: "Choose this domain before adding a mailbox." };
    }
    const mailbox = await createMailbox(
      validated.name,
      validated.email,
      input.domainId,
    );
    return { ok: true, mailbox: await verifyMailbox(mailbox) };
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DOMAIN") {
      return {
        ok: false,
        error: "Choose a verified domain from the active Resend account.",
      };
    }
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "A mailbox already uses this email address.",
      };
    }

    console.error("Unable to create mailbox.", error);
    return { ok: false, error: "Unable to save this mailbox." };
  }
}

export async function updateMailboxAction(input: {
  id: string;
  name: string;
  email: string;
}): Promise<MailboxActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const validated = validateMailbox(input);

  if ("error" in validated) {
    return { ok: false, error: validated.error };
  }

  try {
    const currentMailbox = await getMailbox(input.id);
    if (!currentMailbox || !(await isMailboxInActiveWorkspace(currentMailbox))) {
      return { ok: false, error: "This mailbox is outside the selected domain." };
    }
    const mailbox = await updateMailbox(
      input.id,
      validated.name,
      validated.email,
    );

    if (!mailbox) {
      return { ok: false, error: "This mailbox no longer exists." };
    }

    return { ok: true, mailbox: await verifyMailbox(mailbox) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "A mailbox already uses this email address.",
      };
    }

    console.error("Unable to update mailbox.", error);
    return { ok: false, error: "Unable to update this mailbox." };
  }
}

export async function selectMailboxAction(
  id: string,
): Promise<MailboxActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  try {
    const mailbox = await getMailbox(id);
    const session = await getSession();
    if (
      !mailbox ||
      mailbox.connectionId !== session?.connectionId ||
      mailbox.domainId !== session.domainId
    ) {
      return { ok: false, error: "This mailbox is outside the selected domain." };
    }
    const selected = await selectMailbox(id);

    return selected
      ? { ok: true }
      : { ok: false, error: "This mailbox no longer exists." };
  } catch (error) {
    console.error("Unable to select mailbox.", error);
    return { ok: false, error: "Unable to switch mailbox." };
  }
}

export async function deleteMailboxAction(
  id: string,
): Promise<DeleteMailboxActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  try {
    const currentMailbox = await getMailbox(id);
    if (!currentMailbox || !(await isMailboxInActiveWorkspace(currentMailbox))) {
      return { ok: false, error: "This mailbox is outside the selected domain." };
    }
    const result = await deleteMailbox(id);

    if (result.status === "not_found") {
      return { ok: false, error: "This mailbox no longer exists." };
    }

    const selectedMailbox = result.selectedMailboxId
      ? await getMailbox(result.selectedMailboxId)
      : undefined;

    return {
      ok: true,
      deletedMailboxId: id,
      selectedMailbox,
    };
  } catch (error) {
    console.error("Unable to delete mailbox.", error);
    return { ok: false, error: "Unable to delete this mailbox." };
  }
}

function validateMailbox(input: { name: string; email: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name || name.length > 60 || /[<>\r\n]/.test(name)) {
    return {
      error: "Enter a name between 1 and 60 characters.",
    } as const;
  }

  if (
    !emailPattern.test(email) ||
    email.length > 254 ||
    /[<>\r\n]/.test(email)
  ) {
    return { error: "Enter a valid email address." } as const;
  }

  return { name, email };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
