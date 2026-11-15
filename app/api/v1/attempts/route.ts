import { apiResponse } from "@/lib/server/http";
import { rateLimit, readJson } from "@/lib/server/request-security";
import { guestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { submitAttempt } from "@/lib/server/attempts";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await guestIdentity(request);
    await rateLimit(`attempts:${subject.id}`, 60);
    const body = await readJson(request);
    return submitAttempt(
      subject,
      body,
      request.headers.get("idempotency-key") ?? "",
    );
  });
}
