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

const setupSteps = [
  {
    title: "Buy a domain",
    description:
      "Use any domain provider that gives you access to its DNS records.",
  },
  {
    title: "Verify it with Resend",
    description:
      "Create a Resend account, add the domain, and copy every DNS record it provides into your domain provider.",
  },
  {
    title: "Wait for verification",
    description:
      "Ask Resend to verify the records and wait until sending and receiving are both ready.",
  },
  {
    title: "Clone Resend Mail",
    description:
      "Clone this project locally, or deploy it to Vercel or another platform.",
  },
  {
    title: "Add your environment variables",
    description:
      "Set DATABASE_URL, PASSWORD, SESSION_SECRET, and CREDENTIAL_ENCRYPTION_KEY in .env, then connect Resend accounts from the app.",
  },
  {
    title: "Prepare the app",
    description:
      "Run npm i, npm run db:push, then npm run dev to install dependencies, create the database tables, and start locally.",
  },
  {
    title: "Create the addresses you need",
    description:
      "Add hello@, support@, billing@, or any other address in Resend Mail; no separate hosted mailbox is created.",
  },
  {
    title: "Send and receive",
    description:
      "Open the inbox and manage every address with a familiar Gmail-like experience.",
  },
];

const availableFeatures = [
  {
    icon: MessageSquareText,
    title: "Conversation groups",
    description: "Replies stay together as one readable thread.",
  },
  {
    icon: FileText,
    title: "Saved drafts",
    description: "Leave a message and continue writing it later.",
  },
  {
    icon: Sparkles,
    title: "Rich compose",
    description: "Format, reply, forward, and add a mailbox signature.",
  },
  {
    icon: Paperclip,
    title: "Attachments",
    description: "Send, receive, preview, forward, and download files.",
  },
  {
    icon: Search,
    title: "Advanced search",
    description: "Filter by people, subject, date, status, folder, or files.",
  },
  {
    icon: FolderKanban,
    title: "Familiar folders",
    description: "Inbox, starred, sent, drafts, spam, trash, and everything.",
  },
  {
    icon: Inbox,
    title: "Multiple addresses",
    description: "Move between business addresses without another paid seat.",
  },
  {
    icon: Database,
    title: "Your own database",
    description: "Keep the history you need in storage you control.",
  },
  {
    icon: Smartphone,
    title: "Phone ready",
    description: "Read, search, manage, and compose on smaller screens.",
  },
];

export function HomePage() {
  return (
    <main className="min-h-screen bg-bk-100 text-fg-50">
      <div className="mx-auto min-h-screen max-w-5xl border-x border-bd-30">
        <header className="flex h-14 items-center justify-between border-b border-bd-30 px-5 sm:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-fg-30"
            aria-label="Resend Mail home"
          >
            <Logo className="-ml-1 size-7" />
            <span>Resend Mail</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/inbox"
              className="inline-flex h-8 items-center rounded-md border border-bd-30 bg-bk-60 px-2.5 text-[11px] font-medium text-fg-30 transition-colors hover:bg-bk-50"
            >
              Open Inbox
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
              Stop buying a separate mailbox for every business address.
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
              One domain, one DNS setup, then as many role addresses as the
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
              Already using the root domain for another email service? Use a
              subdomain or forwarding instead. Adding a competing receiving MX
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

          <footer className="mt-16 border-t border-bd-30 pt-6 text-xs leading-5 text-fg-70">
            <p>
              Built for role inboxes such as support@, billing@, and hello@.
              It does not replace calendars, office tools, or enterprise
              account administration.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <a
                href="https://resend.com/docs/dashboard/domains/introduction"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                Domain setup
              </a>
              <a
                href="https://resend.com/docs/dashboard/receiving/custom-domains"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                Receiving setup
              </a>
              <a
                href="https://resend.com/pricing"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-bd-50 underline-offset-4 transition-colors hover:text-fg-30"
              >
                Current limits
              </a>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
