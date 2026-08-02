import "server-only";

import type { Domain } from "resend";

import { resend } from "@/lib/server/resend";
import { listMailboxes } from "@/lib/mailbox/repository";
import type {
  Mailbox,
  MailboxVerificationStatus,
} from "@/lib/mailbox/types";

export async function listMailboxesWithVerification(): Promise<Mailbox[]> {
  const mailboxes = await listMailboxes();

  if (!mailboxes.length) {
    return [];
  }

  const domains = await listResendDomains();

  if (!domains) {
    return mailboxes;
  }

  return mailboxes.map((mailbox) => withVerification(mailbox, domains));
}

export async function verifyMailbox(mailbox: Mailbox): Promise<Mailbox> {
  const domains = await listResendDomains();

  return domains ? withVerification(mailbox, domains) : mailbox;
}

function withVerification(mailbox: Mailbox, domains: Domain[]): Mailbox {
  const emailDomain = mailbox.email.split("@").at(-1)?.toLowerCase();
  const domain = domains.find(
    (candidate) => candidate.name.toLowerCase() === emailDomain,
  );

  return {
    ...mailbox,
    verificationStatus: getVerificationStatus(domain),
  };
}

function getVerificationStatus(
  domain: Domain | undefined,
): MailboxVerificationStatus {
  return domain?.status === "verified" ? "verified" : "unverified";
}

async function listResendDomains(): Promise<Domain[] | undefined> {
  const domains: Domain[] = [];
  let after: string | undefined;

  try {
    do {
      const response = await resend.domains.list({
        limit: 100,
        ...(after ? { after } : {}),
      });

      if (response.error) {
        console.warn(
          "Unable to check mailbox domain verification.",
          response.error,
        );
        return undefined;
      }

      const page = response.data;

      if (!page) {
        return undefined;
      }

      domains.push(...page.data);
      after = page.has_more ? page.data.at(-1)?.id : undefined;

      if (page.has_more && !after) {
        return undefined;
      }
    } while (after);

    return domains;
  } catch (error) {
    console.warn("Unable to check mailbox domain verification.", error);
    return undefined;
  }
}
