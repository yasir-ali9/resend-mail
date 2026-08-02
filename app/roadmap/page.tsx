import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  FileText,
  FolderKanban,
  Inbox,
  MessageSquareText,
  Paperclip,
  Search,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/reusables/logo";
import { ThemeToggle } from "@/components/reusables/theme-toggle";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "A simple roadmap for a Gmail-like business inbox built on Resend.",
};

const setupSteps = [
  {
    title: "buy a domain",
    description:
      "use any domain provider that gives you access to its DNS records.",
  },
  {
    title: "add the domain to Resend",
    description:
      "open the Resend domains dashboard, choose add domain, and enter the domain you own.",
  },
  {
    title: "copy the sending records",
    description:
      "paste every DKIM, SPF, and feedback MX record shown by Resend into your domain provider exactly as provided.",
  },
  {
    title: "enable receiving",
    description:
      "turn on receiving in Resend, then copy its additional receiving MX record into the same DNS panel.",
  },
  {
    title: "verify both directions",
    description:
      "ask Resend to verify the records and wait until sending and receiving both show as verified.",
  },
  {
    title: "connect Resend Mail",
    description:
      "add the Resend Mail webhook URL in Resend, select email.received, and provide the app with your Resend key and database.",
  },
  {
    title: "create the addresses you need",
    description:
      "add hello@, support@, billing@, or any other address in Resend Mail; no separate hosted mailbox is created.",
  },
];

const availableFeatures = [
  {
    icon: MessageSquareText,
    title: "conversation groups",
    description: "replies stay together as one readable thread.",
  },
  {
    icon: FileText,
    title: "saved drafts",
    description: "leave a message and continue writing it later.",
  },
  {
    icon: Sparkles,
    title: "rich compose",
    description: "format, reply, forward, and add a mailbox signature.",
  },
  {
    icon: Paperclip,
    title: "attachments",
    description: "send, receive, preview, forward, and download files.",
  },
  {
    icon: Search,
    title: "advanced search",
    description: "filter by people, subject, date, status, folder, or files.",
  },
  {
    icon: FolderKanban,
    title: "familiar folders",
    description: "inbox, starred, sent, drafts, spam, trash, and everything.",
  },
  {
    icon: Inbox,
    title: "multiple addresses",
    description: "move between business addresses without another paid seat.",
  },
  {
    icon: Database,
    title: "your own database",
    description: "keep the history you need in storage you control.",
  },
  {
    icon: Smartphone,
    title: "phone ready",
    description: "read, search, manage, and compose on smaller screens.",
  },
];

const nextFeatures = [
  {
    title: "labels and rules",
    description: "organize incoming mail automatically.",
  },
  {
    title: "snooze and reminders",
    description: "bring important conversations back at the right time.",
  },
  {
    title: "contacts and notifications",
    description: "reach familiar people faster and notice new mail.",
  },
  {
    title: "scheduled and undo send",
    description: "give outgoing email a little more control.",
  },
];

const laterFeatures = [
  {
    title: "shared inboxes",
    description: "let a team work from the same business address.",
  },
  {
    title: "assignments and notes",
    description: "show who owns a reply without exposing internal discussion.",
  },
  {
    title: "roles and activity history",
    description: "control access and understand what changed.",
  },
  {
    title: "optional smart triage",
    description: "summarize and sort busy inboxes without changing the basics.",
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-bk-100 text-fg-50">
      <div className="mx-auto min-h-screen max-w-5xl border-x border-bd-30">
        <header className="flex h-14 items-center justify-between border-b border-bd-30 px-5 sm:px-10">
          <Link
            href="/roadmap"
            className="flex items-center gap-2 text-sm font-medium text-fg-30"
            aria-label="Resend Mail roadmap"
          >
            <Logo className="-ml-1 size-7" />
            <span>Resend Mail</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/inbox"
              className="text-xs text-fg-70 transition-colors hover:text-fg-30"
            >
              open inbox
            </Link>
            <ThemeToggle className="bg-transparent hover:bg-transparent" />
            <a
              href="https://github.com/yasir-ali9/resend-mail"
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-7 items-center justify-center text-fg-60 transition-colors hover:text-fg-30"
              aria-label="Open Resend Mail on GitHub"
              title="GitHub"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-3.5 fill-current"
              >
                <path d="M8 0C3.58 0 0 3.64 0 8.13c0 3.59 2.29 6.64 5.47 7.71.4.08.55-.18.55-.39 0-.19-.01-.83-.01-1.5-2.01.38-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.15-.28-.15-.68-.53-.01-.54.63-.01 1.08.59 1.23.83.72 1.23 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.21-3.64-.91-3.64-4.01 0-.88.31-1.61.82-2.18-.08-.2-.36-1.03.08-2.15 0 0 .67-.22 2.2.83A7.4 7.4 0 0 1 8 3.94c.68 0 1.36.09 2 .27 1.53-1.05 2.2-.83 2.2-.83.44 1.12.16 1.95.08 2.15.51.57.82 1.29.82 2.18 0 3.11-1.87 3.8-3.65 4.01.29.25.54.74.54 1.5 0 1.08-.01 1.95-.01 2.22 0 .22.15.47.55.39A8.15 8.15 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z" />
              </svg>
            </a>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-5 py-14 sm:px-10 sm:py-20">
          <header>
            <p className="text-xs text-fg-70">July, 2026</p>
            <h1 className="mt-4 text-3xl font-semibold text-fg-30">Roadmap</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-fg-60">
              stop buying a separate mailbox for every business address.
              <br />
              Resend Mail turns addresses on your domain into one familiar
              inbox, using Resend and your own database.
            </p>
            <p className="mt-4 text-xs leading-5 text-fg-70">
              Resend&apos;s free plan currently includes sending and receiving
              within its published limits.
            </p>
          </header>

          <section className="mt-16">
            <h2 className="text-base font-semibold text-fg-30">
              Set up your inbox
            </h2>
            <p className="mt-2 text-sm leading-6 text-fg-70">
              one domain, one DNS setup, then as many role addresses as the
              business needs.
            </p>

            <ol className="mt-7 border-y border-bd-30">
              {setupSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid gap-2 border-b border-bd-30 py-4 last:border-b-0 sm:grid-cols-[32px_180px_1fr] sm:gap-4"
                >
                  <span className="font-mono text-[11px] text-fg-70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-medium text-fg-30">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-5 text-fg-70">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-xs leading-5 text-fg-70">
              already using the root domain for another email service? use a
              subdomain or forwarding instead. adding a competing receiving MX
              record can interrupt the existing inbox.
            </p>
          </section>

          <section className="mt-16">
            <h2 className="text-base font-semibold text-fg-30">
              Today
            </h2>

            <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-bd-30 bg-bd-30 sm:grid-cols-2 lg:grid-cols-3">
              {availableFeatures.map(({ icon: Icon, title, description }) => (
                <article key={title} className="min-h-36 bg-bk-100 p-4">
                  <Icon
                    aria-hidden="true"
                    className="size-4 text-fg-60"
                    strokeWidth={1.5}
                  />
                  <h3 className="mt-6 text-sm font-medium text-fg-30">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-fg-70">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <RoadmapList
            className="mt-16"
            title="Next"
            items={nextFeatures}
          />
          <RoadmapList
            className="mt-14"
            title="Then"
            items={laterFeatures}
          />

          <footer className="mt-16 border-t border-bd-30 pt-6 text-xs leading-5 text-fg-70">
            <p>
              built for role inboxes such as support@, billing@, and hello@.
              it does not replace calendars, office tools, or enterprise
              account administration.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <a
                href="https://resend.com/docs/dashboard/domains/introduction"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                domain setup
              </a>
              <a
                href="https://resend.com/docs/dashboard/receiving/custom-domains"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                receiving setup
              </a>
              <a
                href="https://resend.com/pricing"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                current limits
              </a>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}

function RoadmapList({
  className,
  items,
  title,
}: {
  className?: string;
  items: Array<{ title: string; description: string }>;
  title: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-base font-semibold text-fg-30">{title}</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item.title} className="ml-5 list-disc pl-1 text-sm">
            <p className="font-medium text-fg-30">{item.title}</p>
            <p className="mt-1 text-sm leading-5 text-fg-70">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
