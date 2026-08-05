import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Login } from "@/components/modules/auth/login";
import { isAuthenticated } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Unlock" };

export default async function AccessSetupPage() {
  if (await isAuthenticated()) redirect("/setup/account");
  return <Login />;
}
