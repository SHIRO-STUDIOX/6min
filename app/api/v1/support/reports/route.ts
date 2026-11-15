import { apiResponse } from "@/lib/server/http";
import { requestIdentity, requireSameOrigin } from "@/lib/server/identity";
import { readJson, rateLimit } from "@/lib/server/request-security";
import { reportProblem } from "@/lib/server/navigation";

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const subject = await requestIdentity(request);
    await rateLimit(`support:${subject.id}`, 5);
    return reportProblem(subject, await readJson(request));
  });
}
