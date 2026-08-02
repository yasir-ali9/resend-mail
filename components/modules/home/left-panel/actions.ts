"use server";

import {
  createMailbox,
  deleteMailbox,
  selectMailbox,
  updateMailbox,
} from "@/lib/mailbox/repository";
import { isAuthenticated } from "@/lib/server/auth";
import type {
  DeleteMailboxActionResult,
  MailboxActionResult,
} from "@/lib/mailbox/types";
import { verifyMailbox } from "@/lib/mailbox/verification";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createMailboxAction(input: {
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
    const mailbox = await createMailbox(validated.name, validated.email);
    return { ok: true, mailbox: await verifyMailbox(mailbox) };
  } catch (error) {
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
    const result = await deleteMailbox(id);

    if (result.status === "not_found") {
      return { ok: false, error: "This mailbox no longer exists." };
    }

    if (result.status === "last_mailbox") {
      return {
        ok: false,
        error: "Add another mailbox before deleting this one.",
      };
    }

    return {
      ok: true,
      deletedMailboxId: id,
      selectedMailbox: result.selectedMailbox
        ? await verifyMailbox(result.selectedMailbox)
        : undefined,
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
