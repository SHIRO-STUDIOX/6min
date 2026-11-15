import { apiResponse } from "@/lib/server/http";
import { createGuest, requireSameOrigin } from "@/lib/server/identity";
import { rateLimit, readJson } from "@/lib/server/request-security";
import { requestOtp } from "@/lib/server/auth";

export async function POST(request: Request) {
  let cookie: string | null = null;
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    await rateLimit("auth-entry-global", 120);
    const body = await readJson(request);
    const guest = await createGuest(request);
    cookie = guest.cookie;
    return requestOtp(body, guest.subject.id);
  });
  if (cookie) response.headers.set("Set-Cookie", cookie);
  return response;
}
