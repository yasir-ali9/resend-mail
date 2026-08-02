import { getResendMailboxSuggestions } from "@/lib/mailbox/suggestions";
import { isAuthenticated } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return Response.json(await getResendMailboxSuggestions(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to suggest Resend mailboxes.", error);
    return Response.json(
      { error: "Unable to inspect this Resend account." },
      { status: 502 },
    );
  }
}
