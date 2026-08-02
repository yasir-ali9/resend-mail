import type { Metadata } from "next";

import { HomePage } from "@/components/modules/home";

export const metadata: Metadata = {
  description: "A focused business inbox powered by Resend.",
};

export default function Page() {
  return <HomePage />;
}
