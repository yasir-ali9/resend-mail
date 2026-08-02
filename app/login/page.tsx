import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Login } from "@/components/modules/auth/login";
import {
  isAuthenticated,
  isAuthenticationEnabled,
} from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  if (!isAuthenticationEnabled() || (await isAuthenticated())) {
    redirect("/inbox");
  }

  return <Login />;
}
