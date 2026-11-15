import { authenticatedSession } from "@/lib/server/sessions";
import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { profile, updateProfile } from "@/lib/server/profile";
export async function GET(request: Request) {
  return apiResponse(async () =>
    profile((await authenticatedSession(request)).subject.id),
  );
}
export async function PATCH(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const { subject } = await authenticatedSession(request);
    await rateLimit(`profile:${subject.id}`, 20);
    return updateProfile(subject.id, await readJson(request));
  });
}
