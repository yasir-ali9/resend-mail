import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ConnectionSetup } from "@/components/modules/connection/setup";
import { listConnections } from "@/lib/connection/repository";
import { isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Choose account" };
export const dynamic = "force-dynamic";

export default async function AccountSetupPage() {
  if (!(await isAuthenticated())) redirect("/setup/access");
  return <ConnectionSetup connections={await listConnections()} />;
}
