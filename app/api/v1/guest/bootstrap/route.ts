import { apiResponse } from "@/lib/server/http";
import { createGuest, requireSameOrigin } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/request-security";

export async function POST(request: Request) {
  let cookie: string | null = null;
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    await rateLimit("guest-bootstrap-global", 120);
    const result = await createGuest(request);
    cookie = result.cookie;
    return { kind: result.subject.kind };
  });
  if (cookie) response.headers.set("Set-Cookie", cookie);
  return response;
}
