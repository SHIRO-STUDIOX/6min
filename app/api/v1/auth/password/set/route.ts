import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import { authenticatedSession } from "@/lib/server/sessions";
import { readJson } from "@/lib/server/request-security";
import { setPassword } from "@/lib/server/auth";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const session = await authenticatedSession(request);
    return setPassword(
      session.subject.id,
      session.hash,
      session.recent,
      await readJson(request),
    );
  });
}
