"use server";

import { getMailbox, updateMailboxSignature } from "@/lib/mailbox/repository";
import type { SignatureActionResult } from "@/lib/mailbox/types";
import { isAuthenticated } from "@/lib/server/auth";
import { isMailboxInActiveWorkspace } from "@/lib/server/workspace";

const MAX_SIGNATURE_LENGTH = 5_000;

export async function updateMailboxSignatureAction(input: {
  mailboxId: string;
  signature: string;
}): Promise<SignatureActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const mailboxId = input.mailboxId.trim();
  const signature = input.signature.replace(/\r\n?/g, "\n").trim();

  if (!mailboxId || mailboxId.length > 100 || /[\r\n]/.test(mailboxId)) {
    return { ok: false, error: "Choose a valid mailbox." };
  }

  if (signature.length > MAX_SIGNATURE_LENGTH) {
    return {
      ok: false,
      error: `Signatures can be up to ${MAX_SIGNATURE_LENGTH.toLocaleString()} characters.`,
    };
  }

  const currentMailbox = await getMailbox(mailboxId);
  if (!currentMailbox || !(await isMailboxInActiveWorkspace(currentMailbox))) {
    return { ok: false, error: "This mailbox is outside the selected domain." };
  }

  try {
    const mailbox = await updateMailboxSignature(mailboxId, signature);

    if (!mailbox) {
      return { ok: false, error: "This mailbox no longer exists." };
    }

    return {
      ok: true,
      mailboxId: mailbox.id,
      signature,
    };
  } catch (error) {
    console.error("Unable to update mailbox signature.", error);
    return { ok: false, error: "Unable to save this signature." };
  }
}
