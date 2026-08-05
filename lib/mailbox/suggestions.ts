import "server-only";

import { extractEmailAddress } from "@/lib/email/address";
import { listMailboxes } from "@/lib/mailbox/repository";
import type {
  MailboxSuggestion,
  MailboxSuggestionsResult,
  SuggestedMailboxDomain,
} from "@/lib/mailbox/types";
import { getResendClient } from "@/lib/server/resend";

interface Candidate {
  email: string;
  latestAt: number;
  name: string;
  received: boolean;
  score: number;
  sent: boolean;
}

export async function getResendMailboxSuggestions(
  connectionId: string,
  domainId?: string,
): Promise<MailboxSuggestionsResult> {
  const resend = await getResendClient(connectionId);
  const [domainResult, sentResult, receivedResult, existingMailboxes] =
    await Promise.all([
      resend.domains.list({ limit: 100 }),
      resend.emails.list({ limit: 100 }),
      resend.emails.receiving.list({ limit: 100 }),
      listMailboxes(),
    ]);
  const domains = domainResult.data
    ? domainResult.data.data
        .filter(
          (domain) =>
            domain.status === "verified" &&
            (!domainId || domain.id === domainId),
        )
        .map<SuggestedMailboxDomain>((domain) => ({
          id: domain.id,
          name: domain.name.toLowerCase(),
          receiving: domain.capabilities.receiving === "enabled",
          sending: domain.capabilities.sending === "enabled",
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const verifiedDomains = new Set(domains.map((domain) => domain.name));
  const configuredEmails = new Set(
    existingMailboxes
      .filter((mailbox) => mailbox.connectionId === connectionId)
      .map((mailbox) => mailbox.email.toLowerCase()),
  );
  const candidates = new Map<string, Candidate>();

  for (const email of sentResult.data?.data ?? []) {
    addCandidate(candidates, email.from, email.created_at, "sent");
  }

  for (const email of receivedResult.data?.data ?? []) {
    for (const recipient of [
      ...email.to,
      ...(email.cc ?? []),
      ...(email.bcc ?? []),
      ...(email.received_for ?? []),
    ]) {
      addCandidate(candidates, recipient, email.created_at, "received");
    }
  }

  const suggestions = [...candidates.values()]
    .filter((candidate) => {
      const domain = candidate.email.split("@").at(-1) ?? "";
      return (
        verifiedDomains.has(domain) &&
        !configuredEmails.has(candidate.email)
      );
    })
    .sort(
      (left, right) =>
        right.score - left.score || right.latestAt - left.latestAt,
    )
    .slice(0, 6)
    .map<MailboxSuggestion>((candidate) => ({
      email: candidate.email,
      name: candidate.name,
      source:
        candidate.sent && candidate.received
          ? "sent-and-received"
          : candidate.sent
            ? "sent"
            : "received",
    }));
  const unavailable = [domainResult, sentResult, receivedResult].filter(
    (result) => result.error,
  ).length;

  return {
    domains,
    suggestions,
    ...(unavailable
      ? {
          warning:
            unavailable === 3
              ? "Unable to inspect this Resend account."
              : "Some Resend suggestions may be unavailable.",
        }
      : {}),
  };
}

function addCandidate(
  candidates: Map<string, Candidate>,
  value: string,
  createdAt: string,
  source: "received" | "sent",
) {
  const email = extractEmailAddress(value);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return;
  }

  const current = candidates.get(email);
  const displayName = readDisplayName(value) || nameFromEmail(email);

  candidates.set(email, {
    email,
    latestAt: Math.max(current?.latestAt ?? 0, Date.parse(createdAt) || 0),
    name:
      current && current.name !== nameFromEmail(email)
        ? current.name
        : displayName,
    received: current?.received || source === "received",
    score: (current?.score ?? 0) + 1,
    sent: current?.sent || source === "sent",
  });
}

function readDisplayName(value: string) {
  return value
    .match(/^(?:"([^"]+)"|([^<]+))\s*<[^<>]+>$/)?.slice(1)
    .find((part) => part?.trim())
    ?.trim();
}

function nameFromEmail(email: string) {
  return email
    .split("@")[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Mailbox";
}
