import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DomainSetup } from "@/components/modules/connection/domain-setup";
import { listConnections } from "@/lib/connection/repository";
import { getSession, isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Choose domain" };
export const dynamic = "force-dynamic";

export default async function DomainSetupPage() {
  if (!(await isAuthenticated())) redirect("/setup/access");

  const session = await getSession();
  if (!session?.connectionId) redirect("/setup/account");

  const connection = (await listConnections()).find(
    (candidate) => candidate.id === session.connectionId,
  );
  if (!connection) redirect("/setup/account");

  return <DomainSetup connection={connection} />;
}
