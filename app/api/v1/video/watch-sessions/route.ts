import { apiResponse } from "@/lib/server/http";
import { guestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { rateLimit, readJson } from "@/lib/server/request-security";
import { startWatch } from "@/lib/server/watch";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await guestIdentity(request);
    await rateLimit(`watch-start:${subject.id}`, 30);
    return startWatch(subject, await readJson(request));
  });
}
