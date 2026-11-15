import { smsProvider } from "@/lib/integrations/sms";

export async function GET() {
  let mode = "unavailable";
  try {
    mode = smsProvider().mode;
  } catch {
    /* No live provider is configured. */
  }
  return Response.json(
    { data: { mode }, meta: { version: "v1" } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
