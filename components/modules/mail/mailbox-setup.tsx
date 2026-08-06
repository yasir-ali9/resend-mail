"use client";

import { useRouter } from "next/navigation";

import { SetupShell } from "@/components/modules/setup/shell";
import type { Connection, ConnectionDomain } from "@/lib/connection/types";

import { MailboxCreationForm } from "./left-panel/add";

export function MailboxSetup({
  connection,
  domain,
}: {
  connection: Connection;
  domain: ConnectionDomain;
}) {
  const router = useRouter();

  return (
    <SetupShell
      step={4}
      width="wide"
      spacing="tight"
      backHref="/setup/domain"
      backLabel="Back to domains"
      title="Create a mailbox"
      description={`Add the first email address for ${domain.name}.`}
    >
      <MailboxCreationForm
        connection={connection}
        domain={domain}
        pendingLabel="Opening..."
        submitLabel="Open inbox"
        onCreated={() => {
          router.replace("/inbox");
        }}
      />
    </SetupShell>
  );
}
