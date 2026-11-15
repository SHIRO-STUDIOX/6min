import { apiResponse } from "@/lib/server/http";
import { requestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { rateLimit, readJson } from "@/lib/server/request-security";
import { reviewQuestions } from "@/lib/server/mistakes";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await requestIdentity(request);
    await rateLimit(`review:${subject.id}`, 60);
    return reviewQuestions(subject, await readJson(request));
  });
}
