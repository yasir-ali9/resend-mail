import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/server/auth";

export default async function Page() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  redirect("/inbox");
}
