import { getResendMailboxSuggestions } from "@/lib/mailbox/suggestions";
import { getSession, isAuthenticated } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const connectionId = new URL(request.url).searchParams.get("connection") ?? "";
    if (!connectionId) {
      return Response.json({ error: "Choose a Resend account." }, { status: 400 });
    }
    const session = await getSession();
    if (session?.connectionId !== connectionId || !session.domainId) {
      return Response.json(
        { error: "Switch to this Resend account first." },
        { status: 409 },
      );
    }
    return Response.json(
      await getResendMailboxSuggestions(connectionId, session.domainId),
      {
      headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Unable to suggest Resend mailboxes.", error);
    return Response.json(
      { error: "Unable to inspect this Resend account." },
      { status: 502 },
    );
  }
}
